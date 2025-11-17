const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // If no roles specified, allow all authenticated users
    if (allowedRoles.length === 0) {
      return next();
    }

    if (!allowedRoles.includes(req.user.adminType)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

module.exports = checkRole;

