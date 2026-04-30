const express = require('express');
const router = express.Router();
const { preparedAll, preparedGet, preparedRun } = require('../db');

const PROG_SELECT = `
  SELECT p.id,
         p.uni_id      AS university_id,
         p.nosaukums   AS name,
         g.nosaukums   AS degree,
         p.ilgums_gadi AS duration_years,
         p.maksa_gada  AS tuition_per_year,
         p.valoda      AS language,
         p.apraksts    AS description,
         p.izveidots   AS created_at,
         u.nosaukums   AS university_name,
         a.valsts      AS country
  FROM programmas p
  JOIN universitates u ON p.uni_id = u.id
  JOIN atrasanas_vieta a ON u.atrasanas_vieta_id = a.id
  JOIN gradi g ON p.grads_id = g.id
`;

// GET /api/programs
router.get('/', (req, res) => {
  res.json(preparedAll(PROG_SELECT + ' ORDER BY p.nosaukums ASC'));
});

// POST /api/programs
router.post('/', (req, res) => {
  const { university_id, name, degree, duration_years, tuition_per_year, language, description } = req.body;
  if (!university_id || !name || !degree || !duration_years) {
    return res.status(400).json({ error: 'university_id, name, degree un duration_years ir obligāti.' });
  }

  const uni = preparedGet('SELECT id FROM universitates WHERE id = ?', [university_id]);
  if (!uni) return res.status(404).json({ error: 'Universitāte nav atrasta.' });

  const grads = preparedGet('SELECT id FROM gradi WHERE nosaukums = ?', [degree]);
  if (!grads) return res.status(400).json({ error: `Nezināms grāds: "${degree}". Pieejamie: Bakalaura grāds, Maģistra grāds, Doktora grāds.` });

  const result = preparedRun(
    'INSERT INTO programmas (uni_id, nosaukums, grads_id, ilgums_gadi, maksa_gada, valoda, apraksts) VALUES (?,?,?,?,?,?,?)',
    [university_id, name, grads.id, duration_years, tuition_per_year || null, language || 'Latviešu', description || null]
  );

  res.status(201).json({ id: result.lastInsertRowid, university_id, name, degree, duration_years, tuition_per_year, language });
});

// DELETE /api/programs/:id
router.delete('/:id', (req, res) => {
  const result = preparedRun('DELETE FROM programmas WHERE id = ?', [req.params.id]);
  if (result.changes === 0) return res.status(404).json({ error: 'Programma nav atrasta.' });
  res.status(204).send();
});

module.exports = router;
