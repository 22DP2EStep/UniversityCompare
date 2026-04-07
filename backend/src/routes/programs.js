const express = require('express');
const router = express.Router();
const { preparedAll, preparedGet, preparedRun } = require('../db');

// GET /api/programs
router.get('/', (req, res) => {
  const programs = preparedAll(`
    SELECT p.*, u.name as university_name, u.country
    FROM programs p
    JOIN universities u ON p.university_id = u.id
    ORDER BY p.name ASC
  `);
  res.json(programs);
});

// POST /api/programs
router.post('/', (req, res) => {
  const { university_id, name, degree, duration_years, tuition_per_year, language, description } = req.body;
  if (!university_id || !name || !degree || !duration_years) {
    return res.status(400).json({ error: 'university_id, name, degree, and duration_years are required' });
  }

  const uni = preparedGet('SELECT id FROM universities WHERE id = ?', [university_id]);
  if (!uni) return res.status(404).json({ error: 'University not found' });

  const result = preparedRun(
    'INSERT INTO programs (university_id, name, degree, duration_years, tuition_per_year, language, description) VALUES (?,?,?,?,?,?,?)',
    [university_id, name, degree, duration_years, tuition_per_year || null, language || 'English', description || null]
  );

  res.status(201).json({ id: result.lastInsertRowid, university_id, name, degree, duration_years, tuition_per_year, language });
});

// DELETE /api/programs/:id
router.delete('/:id', (req, res) => {
  const result = preparedRun('DELETE FROM programs WHERE id = ?', [req.params.id]);
  if (result.changes === 0) return res.status(404).json({ error: 'Program not found' });
  res.status(204).send();
});

module.exports = router;
