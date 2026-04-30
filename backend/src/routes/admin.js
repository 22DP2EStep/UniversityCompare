const express = require('express');
const router = express.Router();
const { preparedAll, preparedGet, preparedRun } = require('../db');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

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

function getAtrvieta(location, country) {
  preparedRun('INSERT OR IGNORE INTO atrasanas_vieta (pilseta, valsts) VALUES (?,?)', [location, country]);
  return preparedGet('SELECT id FROM atrasanas_vieta WHERE pilseta = ? AND valsts = ?', [location, country]).id;
}

const USER_SELECT = `
  SELECT id,
         vards           AS name,
         epasts          AS email,
         loma            AS role,
         eksperta_uni_id AS expert_university_id,
         izveidots       AS created_at
  FROM lietotaji
`;

// ── Lietotāji ──────────────────────────────────────────────────

// GET /api/admin/users
router.get('/users', (req, res) => {
  res.json(preparedAll(USER_SELECT + ' ORDER BY izveidots ASC'));
});

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', (req, res) => {
  const { role, expert_university_id } = req.body;
  if (!['user', 'admin', 'expert'].includes(role)) {
    return res.status(400).json({ error: 'Loma var būt tikai "user", "admin" vai "expert".' });
  }
  if (Number(req.params.id) === req.user.id && role !== 'admin') {
    return res.status(400).json({ error: 'Nevar noņemt pašam savas administratora tiesības.' });
  }

  const user = preparedGet('SELECT id FROM lietotaji WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'Lietotājs nav atrasts.' });

  if (role === 'expert') {
    if (!expert_university_id) {
      return res.status(400).json({ error: 'Ekspertam jānorāda universitāte.' });
    }
    const uni = preparedGet('SELECT id FROM universitates WHERE id = ?', [expert_university_id]);
    if (!uni) return res.status(404).json({ error: 'Universitāte nav atrasta.' });
    preparedRun(
      'UPDATE lietotaji SET loma = ?, eksperta_uni_id = ? WHERE id = ?',
      [role, expert_university_id, req.params.id]
    );
    return res.json({ id: Number(req.params.id), role, expert_university_id });
  }

  preparedRun(
    'UPDATE lietotaji SET loma = ?, eksperta_uni_id = NULL WHERE id = ?',
    [role, req.params.id]
  );
  res.json({ id: Number(req.params.id), role, expert_university_id: null });
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Nevar dzēst savu kontu.' });
  }
  const result = preparedRun('DELETE FROM lietotaji WHERE id = ?', [req.params.id]);
  if (result.changes === 0) return res.status(404).json({ error: 'Lietotājs nav atrasts.' });
  res.status(204).send();
});

// ── Universitātes ───────────────────────────────────────────────

// GET /api/admin/universities
router.get('/universities', (req, res) => {
  res.json(preparedAll(UNI_SELECT + ' ORDER BY u.reitings ASC NULLS LAST'));
});

// POST /api/admin/universities
router.post('/universities', (req, res) => {
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

// PUT /api/admin/universities/:id
router.put('/universities/:id', (req, res) => {
  const existing = preparedGet(UNI_SELECT + ' WHERE u.id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Universitāte nav atrasta.' });

  const { name, location, country, website, description, ranking, image_url } = req.body;
  const newLocation = location ?? existing.location;
  const newCountry  = country  ?? existing.country;
  const atrId = getAtrvieta(newLocation, newCountry);

  preparedRun(
    'UPDATE universitates SET nosaukums=?, vietne=?, apraksts=?, reitings=?, attela_url=?, atrasanas_vieta_id=? WHERE id=?',
    [
      name        ?? existing.name,
      website     !== undefined ? (website || null)     : existing.website,
      description !== undefined ? (description || null) : existing.description,
      ranking     !== undefined ? (ranking || null)     : existing.ranking,
      image_url   !== undefined ? (image_url || null)   : existing.image_url,
      atrId,
      req.params.id,
    ]
  );
  res.json(preparedGet(UNI_SELECT + ' WHERE u.id = ?', [req.params.id]));
});

// DELETE /api/admin/universities/:id
router.delete('/universities/:id', (req, res) => {
  const result = preparedRun('DELETE FROM universitates WHERE id = ?', [req.params.id]);
  if (result.changes === 0) return res.status(404).json({ error: 'Universitāte nav atrasta.' });
  res.status(204).send();
});

module.exports = router;
