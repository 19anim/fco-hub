import bcrypt from 'bcrypt';
import AdminUser from '../models/AdminUser.js';
import { createAuditLog } from '../services/auditLog.js';

export const listUsers = async (req, res) => {
  try {
    const users = await AdminUser.find({})
      .select('-passwordHash')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: { users } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching users', error: err.message });
  }
};

export const getUser = async (req, res) => {
  try {
    const user = await AdminUser.findById(req.params.id).select('-passwordHash');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: { user } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching user', error: err.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const actor = req.session.adminUser;

    if (actor.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Only Owner can create users' });
    }

    const { name, email, temporaryPassword, permissions = [] } = req.body;

    if (!name || !email || !temporaryPassword) {
      return res.status(400).json({ success: false, message: 'name, email, temporaryPassword are required' });
    }

    if (temporaryPassword.length < 12) {
      return res.status(400).json({ success: false, message: 'Temporary password must be at least 12 characters' });
    }

    const existing = await AdminUser.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const user = await AdminUser.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'manager',
      permissions,
      status: 'pending_password_change',
      mustChangePassword: true,
      createdBy: actor.id,
    });

    await createAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: 'user.create',
      resourceType: 'AdminUser',
      resourceId: user._id,
      after: { name: user.name, email: user.email, role: user.role, permissions: user.permissions },
      req,
    });

    const safeUser = user.toObject();
    delete safeUser.passwordHash;

    res.status(201).json({ success: true, data: { user: safeUser } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error creating user', error: err.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const actor = req.session.adminUser;
    const target = await AdminUser.findById(req.params.id).select('-passwordHash');

    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (target.role === 'owner' && actor.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Cannot modify Owner account' });
    }

    if (actor.role !== 'owner' && String(req.params.id) === String(actor.id)) {
      return res.status(403).json({ success: false, message: 'Cannot modify own account' });
    }

    const before = { name: target.name, permissions: target.permissions, status: target.status };

    const EDITABLE = ['name', 'permissions', 'status'];
    for (const field of EDITABLE) {
      if (req.body[field] !== undefined) {
        if (field === 'status' && actor.role !== 'owner') {
          return res.status(403).json({ success: false, message: 'Only Owner can change user status' });
        }
        if (field === 'permissions' && actor.role !== 'owner') {
          return res.status(403).json({ success: false, message: 'Only Owner can change permissions' });
        }
        target[field] = req.body[field];
      }
    }

    target.updatedBy = actor.id;
    await target.save();

    await createAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: 'user.update',
      resourceType: 'AdminUser',
      resourceId: target._id,
      before,
      after: { name: target.name, permissions: target.permissions, status: target.status },
      req,
    });

    res.json({ success: true, data: { user: target } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating user', error: err.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const actor = req.session.adminUser;

    if (actor.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Only Owner can reset passwords' });
    }

    const { temporaryPassword } = req.body;

    if (!temporaryPassword || temporaryPassword.length < 12) {
      return res.status(400).json({ success: false, message: 'Temporary password must be at least 12 characters' });
    }

    const target = await AdminUser.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });

    if (target.role === 'owner') {
      return res.status(403).json({ success: false, message: 'Cannot reset Owner password via this endpoint' });
    }

    target.passwordHash = await bcrypt.hash(temporaryPassword, 12);
    target.mustChangePassword = true;
    target.status = 'pending_password_change';
    target.updatedBy = actor.id;
    await target.save();

    await createAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: 'user.password_reset',
      resourceType: 'AdminUser',
      resourceId: target._id,
      req,
    });

    res.json({ success: true, message: 'Password reset. User must change password on next login.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error resetting password', error: err.message });
  }
};
