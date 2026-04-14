const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const { init } = require('./db');

async function start() {
  await init();

  // Routes must be required AFTER db is initialized
  const universitiesRouter = require('./routes/universities');
  const programsRouter = require('./routes/programs');
  const authRouter = require('./routes/auth');
  const adminRouter = require('./routes/admin');
  const profileRouter = require('./routes/profile');

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/universities', universitiesRouter);
  app.use('/api/programs', programsRouter);
  app.use('/api/profile', profileRouter);

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
