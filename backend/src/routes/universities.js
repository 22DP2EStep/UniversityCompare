// Universitāšu maršruti — saraksts, meklēšana, filtrēšana, CRUD operācijas

const express = require('express');
const router = express.Router();
const { preparedAll, preparedGet, preparedRun } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Bāzes SELECT vaicājums — apvieno universitates un atrasanas_vieta tabulas
const UNI_SELECT = `
  SELECT u.id,
         u.nosaukums    AS name,
         a.pilseta      AS location,
         a.valsts       AS country,
         u.vietne       AS website,
         u.apraksts     AS description,
         u.reitings     AS ranking,
         u.attela_url   AS image_url,
         u.atrasanas_vieta_id  AS location_id,
         u.izveidots    AS created_at
  FROM universitates u
  JOIN atrasanas_vieta a ON u.atrasanas_vieta_id = a.id
`;

// Atrod vai izveido atrašanās vietas ierakstu, atgriež tās id
// INSERT OR IGNORE nodrošina ka dublikāti netiek izveidoti
function getAtrvieta(location, country) {
  preparedRun('INSERT OR IGNORE INTO atrasanas_vieta (pilseta, valsts) VALUES (?,?)', [location, country]);
  return preparedGet('SELECT id FROM atrasanas_vieta WHERE pilseta = ? AND valsts = ?', [location, country]).id;
}

// GET /api/universities/filter-options — atgriež pieejamās filtrēšanas vērtības
// Ņem vērā jau aktīvos filtrus lai dinamiski sašaurinātu izvēles
router.get('/filter-options', (req, res) => {
  const { country, city, search } = req.query;

  const uniConds = [];
  const uniParams = [];
  if (country) { uniConds.push('a.valsts = ?');  uniParams.push(country); }
  if (city)    { uniConds.push('a.pilseta = ?'); uniParams.push(city); }
  if (search)  {
    uniConds.push('(u.nosaukums LIKE ? OR a.pilseta LIKE ? OR a.valsts LIKE ?)');
    uniParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const uniWhere = uniConds.length ? `WHERE ${uniConds.join(' AND ')}` : '';
  const uniSub   = `SELECT u.id FROM universitates u JOIN atrasanas_vieta a ON u.atrasanas_vieta_id = a.id ${uniWhere}`;

  const cities   = preparedAll('SELECT DISTINCT pilseta FROM atrasanas_vieta ORDER BY pilseta').map(r => r.pilseta);
  const programs = preparedAll(
    `SELECT DISTINCT p.nosaukums FROM programmas p WHERE p.uni_id IN (${uniSub}) ORDER BY p.nosaukums`,
    uniParams
  ).map(r => r.nosaukums);
  const degrees  = preparedAll(
    `SELECT DISTINCT g.nosaukums FROM programmas p JOIN gradi g ON p.grads_id = g.id WHERE p.uni_id IN (${uniSub}) ORDER BY g.nosaukums`,
    [...uniParams]
  ).map(r => r.nosaukums);

  res.json({ cities, programs, degrees });
});

// GET /api/universities — filtrēts universitāšu saraksts
// Atbalsta filtrus: search, city, country, program, degree
// Rezultāti sakārtoti pēc reitinga augošā secībā (labākais reitings = mazākais skaitlis)
router.get('/', (req, res) => {
  const { country, city, search, program, degree } = req.query;
  const conditions = [];
  const params = [];

  if (country) { conditions.push('a.valsts = ?');  params.push(country); }
  if (city)    { conditions.push('a.pilseta = ?'); params.push(city); }
  // Meklē nosaukumā, pilsētā un valstī vienlaikus
  if (search)  {
    conditions.push('(u.nosaukums LIKE ? OR a.pilseta LIKE ? OR a.valsts LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  // Programmas/grāda filtrs izmanto apakšvaicājumu pret programmas tabulu
  if (program || degree) {
    const sub = [];
    if (program) { sub.push('p.nosaukums LIKE ?'); params.push(`%${program}%`); }
    if (degree)  { sub.push('g.nosaukums = ?');    params.push(degree); }
    conditions.push(`u.id IN (SELECT p.uni_id FROM programmas p JOIN gradi g ON p.grads_id = g.id WHERE ${sub.join(' AND ')})`);
  }

  let query = UNI_SELECT;
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY u.reitings ASC NULLS LAST';

  res.json(preparedAll(query, params));
});

// GET /api/universities/:id — iegūst vienu universitāti ar visām tās programmām
router.get('/:id', (req, res) => {
  const university = preparedGet(UNI_SELECT + ' WHERE u.id = ?', [req.params.id]);
  if (!university) return res.status(404).json({ error: 'Universitāte nav atrasta.' });

  // Iegūst universitātes programmas ar grādu nosaukumiem
  const programs = preparedAll(`
    SELECT p.id,
           p.uni_id      AS university_id,
           p.nosaukums   AS name,
           g.nosaukums   AS degree,
           p.ilgums_gadi AS duration_years,
           p.maksa_gada  AS tuition_per_year,
           p.valoda      AS language,
           p.apraksts    AS description,
           p.izveidots   AS created_at
    FROM programmas p
    JOIN gradi g ON p.grads_id = g.id
    WHERE p.uni_id = ?
  `, [req.params.id]);

  res.json({ ...university, programs });
});

// POST /api/universities — izveido jaunu universitāti (bez autentifikācijas prasības publiskajā maršrutā)
router.post('/', (req, res) => {
  const { name, location, country, website, description, ranking, image_url } = req.body;
  if (!name || !location || !country) {
    return res.status(400).json({ error: 'Nosaukums, pilsēta un valsts ir obligāti.' });
  }

  const atrId = getAtrvieta(location, country);
  const result = preparedRun(
    'INSERT INTO universitates (nosaukums, vietne, apraksts, reitings, attela_url, atrasanas_vieta_id) VALUES (?,?,?,?,?,?)',
    [name, website || null, description || null, ranking || null, image_url || null, atrId]
  );

  res.status(201).json(preparedGet(UNI_SELECT + ' WHERE u.id = ?', [result.lastInsertRowid]));
});

// PUT /api/universities/:id — atjaunina universitāti
// Administrators var rediģēt visu, eksperts tikai savu piesaistīto universitāti
router.put('/:id', requireAuth, (req, res) => {
  const { role, expert_university_id } = req.user;
  const uniId = Number(req.params.id);

  // Pārbauda vai lietotājam ir tiesības rediģēt šo universitāti
  if (role !== 'admin') {
    if (role !== 'expert' || expert_university_id !== uniId) {
      return res.status(403).json({ error: 'Nav tiesību rediģēt šo universitāti.' });
    }
  }

  const existing = preparedGet(UNI_SELECT + ' WHERE u.id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Universitāte nav atrasta.' });

  const { name, location, country, website, description, ranking, image_url } = req.body;
  const newLocation = location ?? existing.location;
  const newCountry  = country  ?? existing.country;
  const atrId = getAtrvieta(newLocation, newCountry);

  // Eksperts nevar mainīt reitingu — tas ir tikai administratora tiesībās
  preparedRun(
    'UPDATE universitates SET nosaukums=?, vietne=?, apraksts=?, reitings=?, attela_url=?, atrasanas_vieta_id=? WHERE id=?',
    [
      name        ?? existing.name,
      website     !== undefined ? (website || null)     : existing.website,
      description !== undefined ? (description || null) : existing.description,
      role === 'admin' && ranking !== undefined ? (ranking || null) : existing.ranking,
      image_url   !== undefined ? (image_url || null)   : existing.image_url,
      atrId,
      req.params.id,
    ]
  );

  res.json(preparedGet(UNI_SELECT + ' WHERE u.id = ?', [req.params.id]));
});

// DELETE /api/universities/:id — dzēš universitāti (tikai administrators)
router.delete('/:id', requireAdmin, (req, res) => {
  const result = preparedRun('DELETE FROM universitates WHERE id = ?', [req.params.id]);
  if (result.changes === 0) return res.status(404).json({ error: 'Universitāte nav atrasta.' });
  res.status(204).send();
});

module.exports = router;
