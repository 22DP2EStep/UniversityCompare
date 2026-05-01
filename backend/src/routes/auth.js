// Autentifikācijas maršruti — reģistrācija un pieteikšanās

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { preparedGet, preparedRun, preparedAll } = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// SQL vaicājums lietotāja datu iegūšanai ar angļu nosaukumu aliasiem
const USER_SELECT = `
  SELECT id,
         vards           AS name,
         epasts          AS email,
         parole    AS password_hash,
         loma            AS role,
         eksperta_uni_id AS expert_university_id,
         izveidots       AS created_at
  FROM lietotaji
`;

// Izveido JWT tokenu ar 7 dienu derīgumu
function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, expert_university_id: user.expert_university_id ?? null },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register — jauna lietotāja reģistrācija
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  // Pārbauda obligātos laukus
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Vārds, e-pasts un parole ir obligāti.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Parolei jābūt vismaz 6 rakstzīmēm.' });
  }

  // Pārbauda vai e-pasts jau ir reģistrēts
  const existing = preparedGet('SELECT id FROM lietotaji WHERE epasts = ?', [email]);
  if (existing) {
    return res.status(409).json({ error: 'Konts ar šo e-pastu jau eksistē.' });
  }

  // Pirmais reģistrētais lietotājs automātiski kļūst par administratoru
  const skaits = preparedAll('SELECT id FROM lietotaji').length;
  const role = skaits === 0 ? 'admin' : 'user';

  // Šifrē paroli ar bcrypt (cost factor 10)
  const password_hash = await bcrypt.hash(password, 10);
  const { lastInsertRowid } = preparedRun(
    'INSERT INTO lietotaji (vards, epasts, parole, loma) VALUES (?, ?, ?, ?)',
    [name, email, password_hash, role]
  );

  const user = { id: lastInsertRowid, name, email, role, expert_university_id: null };
  res.status(201).json({ token: makeToken(user), user });
});

// POST /api/auth/login — lietotāja pieteikšanās
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-pasts un parole ir obligāti.' });
  }

  // Meklē lietotāju pēc e-pasta
  const user = preparedGet(USER_SELECT + ' WHERE epasts = ?', [email]);
  if (!user) {
    return res.status(401).json({ error: 'Nepareizs e-pasts vai parole.' });
  }

  // Salīdzina ievadīto paroli ar saglabāto hash vērtību
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Nepareizs e-pasts vai parole.' });
  }

  const userData = { id: user.id, name: user.name, email: user.email, role: user.role, expert_university_id: user.expert_university_id ?? null };
  res.json({ token: makeToken(userData), user: userData });
});

module.exports = router;
