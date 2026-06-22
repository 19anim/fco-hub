import bcrypt from 'bcrypt';
import AdminUser from '../models/AdminUser.js';

export async function bootstrapOwner() {
  try {
    const ownerExists = await AdminUser.exists({ role: 'owner' });

    if (ownerExists) {
      console.log('[AdminBootstrap] Owner account already exists, skipping bootstrap');
      return null;
    }

    const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
    const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
    const name = process.env.ADMIN_BOOTSTRAP_NAME || 'Owner';

    if (!email || !password) {
      console.log('[AdminBootstrap] No bootstrap credentials in env, skipping');
      return null;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await AdminUser.create({
      name,
      email,
      passwordHash,
      role: 'owner',
      permissions: [],
      status: 'pending_password_change',
      mustChangePassword: true,
    });

    console.log(`[AdminBootstrap] Owner account created: ${owner.email}`);
    console.log('[AdminBootstrap] WARNING: Remove ADMIN_BOOTSTRAP_PASSWORD from env after first login');

    return owner;
  } catch (error) {
    console.error('[AdminBootstrap] Error creating owner:', error.message);
    return null;
  }
}
