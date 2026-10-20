/**
 * Middleware to protect admin-only routes.
 * Checks whether req.session.isAdmin is true.
 */
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin === true) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized: Admin access required' });
}

module.exports = {
  requireAdmin
};
