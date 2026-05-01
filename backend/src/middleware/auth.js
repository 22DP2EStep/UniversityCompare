// Autentifikācijas middleware — pārbauda JWT tokenu katrā aizsargātā pieprasījumā

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// Pārbauda vai pieprasījumam ir derīgs JWT tokens
// Ja tokens ir derīgs, pievieno req.user un turpina izpildi
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  // Tokens jānāk kā "Bearer <tokens>" Authorization galvenē
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Nav autorizācijas tokena.' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Nederīgs vai beidzies tokens.' });
  }
}

// Pārbauda vai lietotājs ir administrators
// Vispirms izsauc requireAuth, tad pārbauda lomu
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Nepietiekamas tiesības. Nepieciešamas administratora tiesības.' });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin };
