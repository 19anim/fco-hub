export function requireAdminSync(req, res, next) {
  const configuredToken = process.env.ADMIN_SYNC_TOKEN;

  if (!configuredToken && process.env.NODE_ENV === 'development') {
    return next();
  }

  const providedToken = req.get('x-admin-sync-token');
  if (configuredToken && providedToken === configuredToken) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Admin sync token required.',
  });
}
