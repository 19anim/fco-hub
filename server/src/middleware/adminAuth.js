export function adminAuth(req, res, next) {
  if (!req.session || !req.session.adminUserId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }
  next();
}

export function requirePermission(permission) {
  return (req, res, next) => {
    const user = req.session?.adminUser;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (user.role === 'owner') {
      return next();
    }

    if (!user.permissions || !user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `Permission required: ${permission}`,
      });
    }

    next();
  };
}
