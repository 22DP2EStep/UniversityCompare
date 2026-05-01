// Galvenais servera ieejas punkts — inicializē datubāzi un palaiž Express serveri

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Izveido datu mapi ja tā vēl neeksistē (tur tiek glabāts .db fails)
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const { init } = require('./db');

async function start() {
  // Vispirms inicializē datubāzi, tikai pēc tam pievieno maršrutus
  // (maršruti izmanto db funkcijas, tāpēc db jābūt gatavam pirms require)
  await init();

  const universitiesRouter = require('./routes/universities');
  const programsRouter = require('./routes/programs');
  const authRouter = require('./routes/auth');
  const adminRouter = require('./routes/admin');
  const profileRouter = require('./routes/profile');

  const app = express();
  const PORT = process.env.PORT || 3000;

  // Atļauj pieprasījumus no citas izcelsmes (frontend darbojas uz cita porta)
  app.use(cors());
  // Parsē JSON pieprasījuma ķermeni
  app.use(express.json());

  // API maršrutu piesaiste
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/universities', universitiesRouter);
  app.use('/api/programs', programsRouter);
  app.use('/api/profile', profileRouter);

  // Veselības pārbaudes endpoints — pārliecinās ka serveris darbojas
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
