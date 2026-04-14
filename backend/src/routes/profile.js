const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { preparedGet, preparedRun } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, expert_university_id: user.expert_university_id ?? null },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.put('/name', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Vārds ir obligāts.' });
  }
  preparedRun('UPDATE users SET name = ? WHERE id = ?', [name.trim(), req.user.id]);
  const user = preparedGet('SELECT id, name, email, role, expert_university_id, created_at FROM users WHERE id = ?', [req.user.id]);
  res.json({ token: makeToken(user), user });
});

router.put('/password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Pašreizējā un jaunā parole ir obligātas.' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'Jaunajai parolei jābūt vismaz 6 rakstzīmēm.' });
  }

  const user = preparedGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
  const valid = await bcrypt.compare(current_password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Pašreizējā parole nav pareiza.' });
  }

  const password_hash = await bcrypt.hash(new_password, 10);
  preparedRun('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, req.user.id]);
  res.status(204).end();
});

module.exports = router;
