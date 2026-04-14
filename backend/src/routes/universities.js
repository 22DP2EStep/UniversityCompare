const express = require('express');
const router = express.Router();
const { preparedAll, preparedGet, preparedRun } = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /api/universities
router.get('/', (req, res) => {
  const { country, search } = req.query;
  let query = 'SELECT * FROM universities';
  const params = [];

  if (country || search) {
    query += ' WHERE';
    if (country) {
      query += ' country = ?';
      params.push(country);
    }
    if (search) {
      if (country) query += ' AND';
      query += ' (name LIKE ? OR location LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
  }

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
