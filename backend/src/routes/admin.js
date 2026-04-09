const express = require('express');
const router = express.Router();
const { preparedAll, preparedGet, preparedRun } = require('../db');
const { requireAdmin } = require('../middleware/auth');

// All routes require admin
router.use(requireAdmin);

// ── Users ──────────────────────────────────────────────────────────────

// GET /api/admin/users
router.get('/users', (req, res) => {
  const users = preparedAll(
    'SELECT id, name, email, role, expert_university_id, created_at FROM users ORDER BY created_at ASC'
  );
  res.json(users);
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
  const user = preparedGet('SELECT id FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'Lietotājs nav atrasts.' });

  if (role === 'expert') {
    if (!expert_university_id) {
      return res.status(400).json({ error: 'Ekspertam jānorāda universitāte.' });
    }
    const uni = preparedGet('SELECT id FROM universities WHERE id = ?', [expert_university_id]);
    if (!uni) return res.status(404).json({ error: 'Universitāte nav atrasta.' });
    preparedRun(
      'UPDATE users SET role = ?, expert_university_id = ? WHERE id = ?',
      [role, expert_university_id, req.params.id]
    );
    return res.json({ id: Number(req.params.id), role, expert_university_id });
  }

  // For non-expert roles, clear expert_university_id
  preparedRun(
    'UPDATE users SET role = ?, expert_university_id = NULL WHERE id = ?',
    [role, req.params.id]
  );
  res.json({ id: Number(req.params.id), role, expert_university_id: null });
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Nevar dzēst savu kontu.' });
  }
  const result = preparedRun('DELETE FROM users WHERE id = ?', [req.params.id]);
  if (result.changes === 0) return res.status(404).json({ error: 'Lietotājs nav atrasts.' });
  res.status(204).send();
});

// ── Universities ────────────────────────────────────────────────────────

// GET /api/admin/universities
router.get('/universities', (req, res) => {
  res.json(preparedAll('SELECT * FROM universities ORDER BY ranking ASC NULLS LAST'));
});

// POST /api/admin/universities
router.post('/universities', (req, res) => {
  const { name, location, country, website, description, ranking } = req.body;
  if (!name || !location || !country) {
    return res.status(400).json({ error: 'Nosaukums, pilsēta un valsts ir obligāti.' });
  }
  const result = preparedRun(
    'INSERT INTO universities (name, location, country, website, description, ranking) VALUES (?,?,?,?,?,?)',
    [name, location, country, website || null, description || null, ranking || null]
  );
  res.status(201).json(preparedGet('SELECT * FROM universities WHERE id = ?', [result.lastInsertRowid]));
});

// PUT /api/admin/universities/:id
router.put('/universities/:id', (req, res) => {
  const existing = preparedGet('SELECT * FROM universities WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Universitāte nav atrasta.' });

  const { name, location, country, website, description, ranking } = req.body;
  preparedRun(
    'UPDATE universities SET name=?, location=?, country=?, website=?, description=?, ranking=? WHERE id=?',
    [
      name ?? existing.name,
      location ?? existing.location,
      country ?? existing.country,
      website !== undefined ? website : existing.website,
      description !== undefined ? description : existing.description,
      ranking !== undefined ? ranking || null : existing.ranking,
      req.params.id,
    ]
  );
  res.json(preparedGet('SELECT * FROM universities WHERE id = ?', [req.params.id]));
});

// DELETE /api/admin/universities/:id
router.delete('/universities/:id', (req, res) => {
  const result = preparedRun('DELETE FROM universities WHERE id = ?', [req.params.id]);
  if (result.changes === 0) return res.status(404).json({ error: 'Universitāte nav atrasta.' });
  res.status(204).send();
});

module.exports = router;
