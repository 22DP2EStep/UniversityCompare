// Profila maršruti — autentificēta lietotāja vārda un paroles atjaunināšana

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { preparedGet, preparedRun } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// SQL vaicājums lietotāja datu iegūšanai
const USER_SELECT = `
  SELECT id,
         vards           AS name,
         epasts          AS email,
         loma            AS role,
         eksperta_uni_id AS expert_university_id,
         izveidots       AS created_at
  FROM lietotaji
`;

// Izveido jaunu JWT tokenu ar atjauninātiem lietotāja datiem
function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, expert_university_id: user.expert_university_id ?? null },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// PUT /api/profile/name — atjaunina lietotāja vārdu
// Atgriež jaunu tokenu ar atjaunināto vārdu
router.put('/name', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Vārds ir obligāts.' });
  }
  preparedRun('UPDATE lietotaji SET vards = ? WHERE id = ?', [name.trim(), req.user.id]);
  const user = preparedGet(USER_SELECT + ' WHERE id = ?', [req.user.id]);
  // Atgriež jaunu tokenu lai frontend var atjaunināt saglabāto lietotāja info
  res.json({ token: makeToken(user), user });
});

// PUT /api/profile/password — maina lietotāja paroli
router.put('/password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Pašreizējā un jaunā parole ir obligātas.' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'Jaunajai parolei jābūt vismaz 6 rakstzīmēm.' });
  }

  // Iegūst pašreizējo paroles hash vērtību no datubāzes
  const user = preparedGet('SELECT parole AS password_hash FROM lietotaji WHERE id = ?', [req.user.id]);

  // Pārbauda vai ievadītā vecā parole atbilst saglabātajam hash
  const valid = await bcrypt.compare(current_password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Pašreizējā parole nav pareiza.' });
  }

  // Šifrē jauno paroli un saglabā
  const password_hash = await bcrypt.hash(new_password, 10);
  preparedRun('UPDATE lietotaji SET parole = ? WHERE id = ?', [password_hash, req.user.id]);
  res.status(204).end();
});

module.exports = router;
