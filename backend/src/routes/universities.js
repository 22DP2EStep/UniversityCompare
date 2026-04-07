const express = require('express');
const router = express.Router();
const { preparedAll, preparedGet, preparedRun } = require('../db');

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
  const { name, location, country, website, description, ranking } = req.body;
  if (!name || !location || !country) {
    return res.status(400).json({ error: 'name, location, and country are required' });
  }

  const result = preparedRun(
    'INSERT INTO universities (name, location, country, website, description, ranking) VALUES (?,?,?,?,?,?)',
    [name, location, country, website || null, description || null, ranking || null]
  );

  res.status(201).json({ id: result.lastInsertRowid, name, location, country, website, description, ranking });
});

// PUT /api/universities/:id
router.put('/:id', (req, res) => {
  const { name, location, country, website, description, ranking } = req.body;
  const existing = preparedGet('SELECT * FROM universities WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'University not found' });

  preparedRun(
    'UPDATE universities SET name=?, location=?, country=?, website=?, description=?, ranking=? WHERE id=?',
    [
      name ?? existing.name,
      location ?? existing.location,
      country ?? existing.country,
      website ?? existing.website,
      description ?? existing.description,
      ranking ?? existing.ranking,
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
