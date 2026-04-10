const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { preparedGet, preparedRun, preparedAll } = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, expert_university_id: user.expert_university_id ?? null },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Vārds, e-pasts un parole ir obligāti.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Parolei jābūt vismaz 6 rakstzīmēm.' });
  }

  const existing = preparedGet('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return res.status(409).json({ error: 'Konts ar šo e-pastu jau eksistē.' });
  }

  // First registered user becomes admin
  const userCount = preparedAll('SELECT id FROM users').length;
  const role = userCount === 0 ? 'admin' : 'user';

  const password_hash = await bcrypt.hash(password, 10);
  const { lastInsertRowid } = preparedRun(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name, email, password_hash, role]
  );

  const user = { id: lastInsertRowid, name, email, role, expert_university_id: null };
  res.status(201).json({ token: makeToken(user), user });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-pasts un parole ir obligāti.' });
  }

  const user = preparedGet('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) {
    return res.status(401).json({ error: 'Nepareizs e-pasts vai parole.' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Nepareizs e-pasts vai parole.' });
  }

  const userData = { id: user.id, name: user.name, email: user.email, role: user.role, expert_university_id: user.expert_university_id ?? null };
  res.json({ token: makeToken(userData), user: userData });
});

module.exports = router;
