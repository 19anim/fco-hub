import bcrypt from 'bcrypt';
import AdminUser from '../models/AdminUser.js';
import { createAuditLog } from '../services/auditLog.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = await AdminUser.findOne({ email: email.toLowerCase() }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.status === 'disabled') {
      return res.status(403).json({ success: false, message: 'Account disabled' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    await createAuditLog({ actorUserId: user._id, actorEmail: user.email, action: 'admin.login', req });

    req.session.adminUserId = user._id;
    req.session.adminUser = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
    };

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Login error', error: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    const actor = req.session?.adminUser;
    if (actor) {
      await createAuditLog({ actorUserId: actor.id, actorEmail: actor.email, action: 'admin.logout', req });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Logout error' });
      }
      res.clearCookie('connect.sid');
      res.json({ success: true, message: 'Logout successful' });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Logout error', error: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const userId = req.session?.adminUserId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const user = await AdminUser.findById(userId).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          permissions: user.permissions,
          status: user.status,
          mustChangePassword: user.mustChangePassword,
          lastLoginAt: user.lastLoginAt,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching user', error: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.session?.adminUserId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All password fields required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New passwords do not match' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const user = await AdminUser.findById(userId).select('+passwordHash');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isCurrentPasswordValid) {
      return res.status(401).json({ success: false, message: 'Current password incorrect' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: 'New password must be different from current password' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.mustChangePassword = false;
    if (user.status === 'pending_password_change') {
      user.status = 'active';
    }
    user.updatedBy = userId;
    await user.save();

    req.session.adminUser.mustChangePassword = false;
    req.session.adminUser.status = user.status;

    await createAuditLog({ actorUserId: userId, actorEmail: user.email, action: 'user.password_change', resourceType: 'AdminUser', resourceId: userId, req });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error changing password', error: error.message });
  }
};
