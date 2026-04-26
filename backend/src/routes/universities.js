const express = require('express');
const router = express.Router();
const { preparedAll, preparedGet, preparedRun } = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /api/universities/filter-options
router.get('/filter-options', (req, res) => {
  const { country, city, search } = req.query;

  // Build a subquery for universities matching the current non-program filters
  const uniConds = [];
  const uniParams = [];
  if (country) { uniConds.push('country = ?'); uniParams.push(country); }
  if (city)    { uniConds.push('location = ?'); uniParams.push(city); }
  if (search)  { uniConds.push('(name LIKE ? OR location LIKE ? OR country LIKE ?)'); uniParams.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  const uniWhere = uniConds.length ? `WHERE ${uniConds.join(' AND ')}` : '';
  const uniSub   = `SELECT id FROM universities ${uniWhere}`;

  const cities   = preparedAll('SELECT DISTINCT location FROM universities WHERE location IS NOT NULL ORDER BY location').map(r => r.location);
  const programs = preparedAll(`SELECT DISTINCT name FROM programs WHERE name IS NOT NULL AND university_id IN (${uniSub}) ORDER BY name`, uniParams).map(r => r.name);
  const degrees  = preparedAll(`SELECT DISTINCT degree FROM programs WHERE degree IS NOT NULL AND university_id IN (${uniSub}) ORDER BY degree`, [...uniParams]).map(r => r.degree);
  res.json({ cities, programs, degrees });
});

// GET /api/universities
router.get('/', (req, res) => {
  const { country, city, search, program, degree } = req.query;
  const conditions = [];
  const params = [];

  if (country) { conditions.push('country = ?'); params.push(country); }
  if (city)    { conditions.push('location = ?'); params.push(city); }
  if (search)  { conditions.push('(name LIKE ? OR location LIKE ? OR country LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

  if (program || degree) {
    const sub = [];
    if (program) { sub.push('name LIKE ?'); params.push(`%${program}%`); }
    if (degree)  { sub.push('degree = ?'); params.push(degree); }
    conditions.push(`id IN (SELECT university_id FROM programs WHERE ${sub.join(' AND ')})`);
  }

  let query = 'SELECT * FROM universities';
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY ranking ASC NULLS LAST';

  res.json(preparedAll(query, params));
});

// GET /api/universities/:id
router.get('/:id', (req, res) => {
  const university = preparedGet('SELECT * FROM universities WHERE id = ?', [req.params.id]);
  if (!university) return res.status(404).json({ error: 'University not found' });

  const programs = preparedAll('SELECT * FROM programs WHERE university_id = ?', [req.params.id]);
  res.json({ ...university, programs });
});

// POST /api/universities
router.post('/', (req, res) => {
  const { name, location, country, website, description, ranking, ranking_world, image_url } = req.body;
  if (!name || !location || !country) {
    return res.status(400).json({ error: 'name, location, and country are required' });
  }

  const result = preparedRun(
    'INSERT INTO universities (name, location, country, website, description, ranking, ranking_world, image_url) VALUES (?,?,?,?,?,?,?,?)',
    [name, location, country, website || null, description || null, ranking || null, ranking_world || null, image_url || null]
  );

  res.status(201).json({ id: result.lastInsertRowid, name, location, country, website, description, ranking, ranking_world, image_url });
});

// PUT /api/universities/:id  — admin or expert assigned to this university
router.put('/:id', requireAuth, (req, res) => {
  const { role, expert_university_id } = req.user;
  const uniId = Number(req.params.id);

  if (role !== 'admin') {
    if (role !== 'expert' || expert_university_id !== uniId) {
      return res.status(403).json({ error: 'Nav tiesību rediģēt šo universitāti.' });
    }
  }

  const { name, location, country, website, description, ranking, ranking_world, image_url } = req.body;
  const existing = preparedGet('SELECT * FROM universities WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Universitāte nav atrasta.' });

  preparedRun(
    'UPDATE universities SET name=?, location=?, country=?, website=?, description=?, ranking=?, ranking_world=?, image_url=? WHERE id=?',
    [
      name ?? existing.name,
      location ?? existing.location,
      country ?? existing.country,
      website ?? existing.website,
      description ?? existing.description,
      ranking !== undefined ? (ranking || null) : existing.ranking,
      ranking_world !== undefined ? (ranking_world || null) : existing.ranking_world,
      image_url !== undefined ? (image_url || null) : existing.image_url,
      req.params.id,
    ]
  );

  res.json(preparedGet('SELECT * FROM universities WHERE id = ?', [req.params.id]));
});

// DELETE /api/universities/:id
router.delete('/:id', (req, res) => {
  const result = preparedRun('DELETE FROM universities WHERE id = ?', [req.params.id]);
  if (result.changes === 0) return res.status(404).json({ error: 'University not found' });
  res.status(204).send();
});

module.exports = router;
