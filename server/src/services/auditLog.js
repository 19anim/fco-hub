import AuditLog from '../models/AuditLog.js';

export async function createAuditLog({ actorUserId, actorEmail, action, resourceType, resourceId, before, after, req }) {
  try {
    await AuditLog.create({
      actorUserId,
      actorEmail,
      action,
      resourceType,
      resourceId,
      before,
      after,
      ip: req?.ip || req?.headers?.['x-forwarded-for'],
      userAgent: req?.headers?.['user-agent'],
    });
  } catch (err) {
    console.error('[AuditLog] Failed to write log entry:', err.message);
  }
}
