# Product-Grade Monetization and Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-grade monetization and admin system with real authentication, Manager accounts with permissions, YouTube/affiliate/ad content management, entity linking, public rendering, tracking, and data-ops migration.

**Architecture:** Monorepo with Express/MongoDB backend and React/Vite frontend. Admin routes protected by session auth + permission middleware. Public APIs sanitized and entity-aware. Placement-driven content rendering.

**Tech Stack:** Express, Mongoose, bcrypt, cookie-parser, React, React Router, Tailwind, axios

## Global Constraints

- Node.js ≥ 18
- MongoDB ≥ 6.0
- React ≥ 19
- No new major dependencies without justification
- All admin APIs must enforce authentication and permissions
- Public APIs must sanitize responses (no draft/admin metadata)
- Password minimum length: 12 characters
- Session cookies: httpOnly, secure in production
- Commit after each task completes successfully

---

## Phase 1: Admin Foundation and Auth

### Task 1.1: Admin User Model

**Files:**
- Create: `server/src/models/AdminUser.js`

**Interfaces:**
- Consumes: mongoose
- Produces: `AdminUser` model with schema: `{ _id, name, email, passwordHash, role: 'owner'|'manager', permissions: string[], status: 'active'|'disabled'|'pending_password_change', mustChangePassword: boolean, lastLoginAt, createdBy, updatedBy, createdAt, updatedAt }`

- [ ] **Step 1: Write model with schema**

Create `server/src/models/AdminUser.js`:

```javascript
import mongoose from 'mongoose';

const adminUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['owner', 'manager'], required: true },
    permissions: [{ type: String }],
    status: {
      type: String,
      enum: ['active', 'disabled', 'pending_password_change'],
      default: 'active',
    },
    mustChangePassword: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  {
    timestamps: true,
  }
);

adminUserSchema.index({ email: 1 });
adminUserSchema.index({ role: 1, status: 1 });

const AdminUser = mongoose.model('AdminUser', adminUserSchema);
export default AdminUser;
```

- [ ] **Step 2: Verify model loads**

Add temporary import to `server/src/server.js`:

```javascript
import AdminUser from './models/AdminUser.js';
console.log('AdminUser model loaded:', AdminUser.modelName);
```

Run: `cd server && npm run dev`

Expected: Console shows "AdminUser model loaded: AdminUser" with no errors

- [ ] **Step 3: Remove temporary import**

Remove the temporary lines from `server/src/server.js`

- [ ] **Step 4: Commit**

```bash
git add server/src/models/AdminUser.js
git commit -m "feat: add AdminUser model

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 1.2: Owner Bootstrap Service

**Files:**
- Create: `server/src/services/adminBootstrap.js`

**Interfaces:**
- Consumes: `AdminUser` model from Task 1.1, bcrypt, process.env
- Produces: `bootstrapOwner()` function that creates Owner if none exists

- [ ] **Step 1: Install bcrypt**

```bash
cd server
npm install bcrypt
```

- [ ] **Step 2: Write bootstrap service**

Create `server/src/services/adminBootstrap.js`:

```javascript
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
      permissions: [], // Owner has implicit all permissions
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
```

- [ ] **Step 3: Call bootstrap on server start**

Add to `server/src/server.js` after `connectDB()`:

```javascript
import { bootstrapOwner } from './services/adminBootstrap.js';

// After connectDB() call
bootstrapOwner();
```

- [ ] **Step 4: Add bootstrap env vars to .env.example**

Add to `server/.env.example` or create if missing:

```env
# Admin Bootstrap (remove password after first login)
ADMIN_BOOTSTRAP_EMAIL=admin@example.com
ADMIN_BOOTSTRAP_PASSWORD=temporary-strong-password-min-12-chars
ADMIN_BOOTSTRAP_NAME=Owner
```

- [ ] **Step 5: Test bootstrap**

Add to local `.env`:

```env
ADMIN_BOOTSTRAP_EMAIL=test@example.com
ADMIN_BOOTSTRAP_PASSWORD=TestPassword123!
```

Run: `cd server && npm run dev`

Expected: Console shows "[AdminBootstrap] Owner account created: test@example.com"

Restart server:

Expected: Console shows "[AdminBootstrap] Owner account already exists, skipping bootstrap"

- [ ] **Step 6: Commit**

```bash
git add server/src/services/adminBootstrap.js server/src/server.js server/.env.example
git commit -m "feat: add owner bootstrap from env

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 1.3: Admin Auth Middleware

**Files:**
- Create: `server/src/middleware/adminAuth.js`

**Interfaces:**
- Consumes: `AdminUser` model, express session
- Produces: `adminAuth(req, res, next)` middleware, `requirePermission(permission)` middleware factory

- [ ] **Step 1: Install session dependencies**

```bash
cd server
npm install express-session cookie-parser
```

- [ ] **Step 2: Write auth middleware**

Create `server/src/middleware/adminAuth.js`:

```javascript
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

    // Owner has all permissions
    if (user.role === 'owner') {
      return next();
    }

    // Check if manager has the required permission
    if (!user.permissions || !user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `Permission required: ${permission}`,
      });
    }

    next();
  };
}
```

- [ ] **Step 3: Add session config to server.js**

Add to `server/src/server.js` after other imports:

```javascript
import session from 'express-session';
import cookieParser from 'cookie-parser';
```

Add after `app.use(express.urlencoded({ extended: true }))`:

```javascript
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
    },
  })
);
```

- [ ] **Step 4: Add SESSION_SECRET to .env.example**

Add to `server/.env.example`:

```env
# Session
SESSION_SECRET=change-this-to-a-random-string-in-production
```

- [ ] **Step 5: Verify middleware loads**

Add temporary test route to `server/src/server.js`:

```javascript
import { adminAuth, requirePermission } from './middleware/adminAuth.js';

app.get('/api/admin/test-auth', adminAuth, (req, res) => {
  res.json({ success: true, message: 'Auth works' });
});

app.get('/api/admin/test-perm', requirePermission('test.permission'), (req, res) => {
  res.json({ success: true, message: 'Permission works' });
});
```

Run: `cd server && npm run dev`

Test: `curl http://localhost:5000/api/admin/test-auth`

Expected: `{"success":false,"message":"Authentication required"}`

Remove test routes after verification.

- [ ] **Step 6: Commit**

```bash
git add server/src/middleware/adminAuth.js server/src/server.js server/.env.example server/package.json server/package-lock.json
git commit -m "feat: add admin auth and permission middleware

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 1.4: Admin Auth Routes and Controller

**Files:**
- Create: `server/src/controllers/adminAuth.controller.js`
- Create: `server/src/routes/adminAuth.routes.js`
- Modify: `server/src/server.js`

**Interfaces:**
- Consumes: `AdminUser` model, bcrypt, adminAuth middleware
- Produces: POST `/api/admin/auth/login`, POST `/api/admin/auth/logout`, GET `/api/admin/auth/me`, POST `/api/admin/auth/change-password`

- [ ] **Step 1: Write auth controller**

Create `server/src/controllers/adminAuth.controller.js`:

```javascript
import bcrypt from 'bcrypt';
import AdminUser from '../models/AdminUser.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password required',
      });
    }

    const user = await AdminUser.findOne({ email: email.toLowerCase() }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (user.status === 'disabled') {
      return res.status(403).json({
        success: false,
        message: 'Account disabled',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Store in session
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
    res.status(500).json({
      success: false,
      message: 'Login error',
      error: error.message,
    });
  }
};

export const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Logout error',
        });
      }
      res.clearCookie('connect.sid');
      res.json({
        success: true,
        message: 'Logout successful',
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout error',
      error: error.message,
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const userId = req.session?.adminUserId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const user = await AdminUser.findById(userId).select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
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
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message,
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.session?.adminUserId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All password fields required',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match',
      });
    }

    if (newPassword.length < 12) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 12 characters',
      });
    }

    const user = await AdminUser.findById(userId).select('+passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password incorrect',
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password',
      });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.mustChangePassword = false;
    if (user.status === 'pending_password_change') {
      user.status = 'active';
    }
    user.updatedBy = userId;
    await user.save();

    // Update session
    req.session.adminUser.mustChangePassword = false;
    req.session.adminUser.status = user.status;

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message,
    });
  }
};
```

- [ ] **Step 2: Write auth routes**

Create `server/src/routes/adminAuth.routes.js`:

```javascript
import express from 'express';
import { login, logout, getMe, changePassword } from '../controllers/adminAuth.controller.js';
import { adminAuth } from '../middleware/adminAuth.js';

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', adminAuth, getMe);
router.post('/change-password', adminAuth, changePassword);

export default router;
```

- [ ] **Step 3: Mount auth routes in server.js**

Add to `server/src/server.js` imports:

```javascript
import adminAuthRoutes from './routes/adminAuth.routes.js';
```

Add after existing route mounts:

```javascript
app.use('/api/admin/auth', adminAuthRoutes);
```

- [ ] **Step 4: Test login flow**

Run: `cd server && npm run dev`

Test login:
```bash
curl -X POST http://localhost:5000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}'
```

Expected: `{"success":true,"message":"Login successful",...,"mustChangePassword":true}`

Save the set-cookie header for next test.

Test /me with cookie:
```bash
curl http://localhost:5000/api/admin/auth/me \
  -H "Cookie: connect.sid=<session-cookie-value>"
```

Expected: User data returned

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/adminAuth.controller.js server/src/routes/adminAuth.routes.js server/src/server.js
git commit -m "feat: add admin auth routes (login, logout, me, change-password)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 2: Admin Frontend Foundation

### Task 2.1: Admin Login Page

**Files:**
- Create: `client/src/pages/admin/LoginPage.jsx`
- Create: `client/src/services/adminAuth.js`
- Modify: `client/src/App.jsx`

**Interfaces:**
- Consumes: admin auth API from Phase 1
- Produces: `/admin/login` route, `adminAuth.login()` service

- [ ] **Step 1: Write admin auth service**

Create `client/src/services/adminAuth.js`:

```javascript
import axios from 'axios';
import { API_BASE } from '../config/api';

const adminAuthAPI = axios.create({
  baseURL: `${API_BASE}/admin/auth`,
  withCredentials: true,
});

export const adminAuth = {
  async login(email, password) {
    const response = await adminAuthAPI.post('/login', { email, password });
    return response.data;
  },

  async logout() {
    const response = await adminAuthAPI.post('/logout');
    return response.data;
  },

  async getMe() {
    const response = await adminAuthAPI.get('/me');
    return response.data;
  },

  async changePassword(currentPassword, newPassword, confirmPassword) {
    const response = await adminAuthAPI.post('/change-password', {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    return response.data;
  },
};
```

- [ ] **Step 2: Write login page**

Create `client/src/pages/admin/LoginPage.jsx`:

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { adminAuth } from '../../services/adminAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await adminAuth.login(email, password);
      
      if (result.success) {
        if (result.data.user.mustChangePassword) {
          navigate('/admin/change-password');
        } else {
          navigate('/admin');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-blue text-white shadow-lg shadow-brand-blue/20 mb-4">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-semibold text-ink">Admin Login</h1>
          <p className="mt-2 text-ink-muted">FCO Hub Administration</p>
        </div>

        <div className="surface-panel p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-ink mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 w-full rounded-lg border border-hairline bg-canvas-dark px-4 text-ink outline-none transition focus:border-brand-blue"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-ink mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 w-full rounded-lg border border-hairline bg-canvas-dark px-4 text-ink outline-none transition focus:border-brand-blue"
                placeholder="••••••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary h-12 w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add admin route to App.jsx**

Add to `client/src/App.jsx` imports:

```javascript
import LoginPage from './pages/admin/LoginPage';
```

Add route inside `<Routes>`:

```jsx
<Route path="/admin/login" element={<LoginPage />} />
```

- [ ] **Step 4: Test login page**

Run: `cd client && npm run dev`

Navigate to: `http://localhost:5173/admin/login`

Expected: Login page renders with email/password form

Test login with bootstrap credentials

Expected: Success redirects to /admin (404 for now) or /admin/change-password

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/admin/LoginPage.jsx client/src/services/adminAuth.js client/src/App.jsx
git commit -m "feat: add admin login page and auth service

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2.2: Change Password Page

**Files:**
- Create: `client/src/pages/admin/ChangePasswordPage.jsx`
- Modify: `client/src/App.jsx`

**Interfaces:**
- Consumes: `adminAuth.changePassword()` from `client/src/services/adminAuth.js`
- Produces: `/admin/change-password` route, force-redirect after first login

- [ ] **Step 1: Write change password page**

Create `client/src/pages/admin/ChangePasswordPage.jsx`:

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { adminAuth } from '../../services/adminAuth';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 12) {
      setError('New password must be at least 12 characters');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);
    try {
      const result = await adminAuth.changePassword(currentPassword, newPassword, confirmPassword);
      if (result.success) {
        navigate('/admin');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-blue text-white shadow-lg shadow-brand-blue/20 mb-4">
            <KeyRound className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-semibold text-ink">Change Password</h1>
          <p className="mt-2 text-ink-muted">You must set a new password before continuing.</p>
        </div>

        <div className="surface-panel p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="currentPassword" className="block text-sm font-semibold text-ink mb-2">
                Current Password
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="h-12 w-full rounded-lg border border-hairline bg-canvas-dark px-4 text-ink outline-none transition focus:border-brand-blue"
                placeholder="••••••••••••"
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-semibold text-ink mb-2">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="h-12 w-full rounded-lg border border-hairline bg-canvas-dark px-4 text-ink outline-none transition focus:border-brand-blue"
                placeholder="Min 12 characters"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-ink mb-2">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-12 w-full rounded-lg border border-hairline bg-canvas-dark px-4 text-ink outline-none transition focus:border-brand-blue"
                placeholder="••••••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary h-12 w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Changing password...' : 'Set New Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add route to App.jsx**

Add import:

```javascript
import ChangePasswordPage from './pages/admin/ChangePasswordPage';
```

Add route alongside login route:

```jsx
<Route path="/admin/change-password" element={<ChangePasswordPage />} />
```

- [ ] **Step 3: Test**

Login with bootstrap credentials → expected redirect to `/admin/change-password`.

Submit change password form with valid new password → expected redirect to `/admin`.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/admin/ChangePasswordPage.jsx client/src/App.jsx
git commit -m "feat: add admin change password page

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2.3: Admin Auth Context

**Files:**
- Create: `client/src/contexts/AdminAuthContext.jsx`

**Interfaces:**
- Consumes: `adminAuth.getMe()` from `client/src/services/adminAuth.js`
- Produces: `AdminAuthProvider`, `useAdminAuth()` hook returning `{ user, loading, login, logout, refetch }`

- [ ] **Step 1: Write auth context**

Create `client/src/contexts/AdminAuthContext.jsx`:

```jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { adminAuth } from '../services/adminAuth';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const result = await adminAuth.getMe();
      if (result.success) {
        setUser(result.data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      await adminAuth.logout();
    } finally {
      setUser(null);
    }
  };

  return (
    <AdminAuthContext.Provider value={{ user, loading, login, logout, refetch: fetchMe }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
```

- [ ] **Step 2: Update LoginPage to use context**

In `client/src/pages/admin/LoginPage.jsx`, update handleSubmit to call `login(result.data.user)` from context after successful login:

```javascript
// Add import at top
import { useAdminAuth } from '../../contexts/AdminAuthContext';

// Inside component
const { login } = useAdminAuth();

// Inside handleSubmit on success
login(result.data.user);
```

- [ ] **Step 3: Commit**

```bash
git add client/src/contexts/AdminAuthContext.jsx client/src/pages/admin/LoginPage.jsx
git commit -m "feat: add admin auth context

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2.4: Protected Route and Admin Router

**Files:**
- Create: `client/src/components/admin/AdminProtectedRoute.jsx`
- Modify: `client/src/App.jsx`

**Interfaces:**
- Consumes: `useAdminAuth()` context
- Produces: `<AdminProtectedRoute>` wrapper that redirects unauthenticated users to `/admin/login`, redirects users with `mustChangePassword` to `/admin/change-password`

- [ ] **Step 1: Write protected route component**

Create `client/src/components/admin/AdminProtectedRoute.jsx`:

```jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

export default function AdminProtectedRoute({ children }) {
  const { user, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas-black flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (user.mustChangePassword && location.pathname !== '/admin/change-password') {
    return <Navigate to="/admin/change-password" replace />;
  }

  return children;
}
```

- [ ] **Step 2: Restructure App.jsx admin routes**

Wrap admin routes with `AdminAuthProvider` and `AdminProtectedRoute`. Public app and admin share the same BrowserRouter but admin routes have their own layout and auth guard.

In `client/src/App.jsx`:

```jsx
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import AdminProtectedRoute from './components/admin/AdminProtectedRoute';
import LoginPage from './pages/admin/LoginPage';
import ChangePasswordPage from './pages/admin/ChangePasswordPage';
// AdminDashboardPage will be added in Task 2.6

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('light', !darkMode);
  }, [darkMode]);

  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <Routes>
          {/* Public admin auth routes (no layout) */}
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin/change-password" element={<ChangePasswordPage />} />

          {/* Protected admin routes (admin layout, added in Task 2.5) */}
          <Route
            path="/admin/*"
            element={
              <AdminProtectedRoute>
                {/* AdminLayout wraps nested routes, wired in Task 2.5 */}
                <div className="min-h-screen bg-canvas-black flex items-center justify-center text-ink-muted">
                  Admin area — layout coming in Task 2.5
                </div>
              </AdminProtectedRoute>
            }
          />

          {/* Public app (existing layout) */}
          <Route
            path="/*"
            element={
              <div className="min-h-screen bg-canvas-black text-ink">
                <div className="lg:flex">
                  <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
                  <div className="min-w-0 flex-1">
                    <TopNav
                      darkMode={darkMode}
                      setDarkMode={setDarkMode}
                      mobileMenuOpen={mobileMenuOpen}
                      setMobileMenuOpen={setMobileMenuOpen}
                    />
                    <main className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
                      <Routes>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/database" element={<DatabasePage />} />
                        <Route path="/player/:id" element={<PlayerDetailPage />} />
                        <Route path="/meta-live" element={<MetaLivePage />} />
                        <Route path="/videos" element={<VideosPage />} />
                        <Route path="/calculator" element={<CalculatorPage />} />
                        <Route path="/market" element={<MarketPage />} />
                        <Route path="/settings" element={<SettingsPage darkMode={darkMode} setDarkMode={setDarkMode} />} />
                      </Routes>
                    </main>
                  </div>
                </div>
              </div>
            }
          />
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
```

- [ ] **Step 3: Test protection**

Navigate to `http://localhost:5173/admin` without session → expected redirect to `/admin/login`.

Login → expected entry to admin area (placeholder div).

- [ ] **Step 4: Commit**

```bash
git add client/src/components/admin/AdminProtectedRoute.jsx client/src/App.jsx
git commit -m "feat: add admin protected route guard

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2.5: Admin Layout

**Files:**
- Create: `client/src/layouts/AdminLayout.jsx`
- Create: `client/src/components/admin/AdminSidebar.jsx`
- Create: `client/src/components/admin/AdminTopbar.jsx`
- Modify: `client/src/App.jsx`

**Interfaces:**
- Consumes: `useAdminAuth()`, React Router `<Outlet />`
- Produces: Admin shell with sidebar navigation and topbar. All `/admin/*` protected pages render inside `<Outlet />`.

Sidebar items and permission mapping:

```txt
Overview          → /admin                  → always visible
Monetization      → /admin/monetization     → monetization.view
Placements        → /admin/placements       → placements.view
Analytics         → /admin/analytics        → analytics.view
Data Ops          → /admin/data-ops         → dataOps.view
Users             → /admin/users            → users.view (owner only in Phase 3)
Audit Log         → /admin/audit-log        → auditLog.view
Settings          → /admin/settings         → settings.view
```

- [ ] **Step 1: Write AdminSidebar**

Create `client/src/components/admin/AdminSidebar.jsx`:

```jsx
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  DollarSign,
  LayoutGrid,
  BarChart2,
  Database,
  Users,
  ClipboardList,
  Settings,
  Shield,
  LogOut,
} from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const NAV_ITEMS = [
  { label: 'Overview', icon: LayoutDashboard, to: '/admin', end: true, permission: null },
  { label: 'Monetization', icon: DollarSign, to: '/admin/monetization', permission: 'monetization.view' },
  { label: 'Placements', icon: LayoutGrid, to: '/admin/placements', permission: 'placements.view' },
  { label: 'Analytics', icon: BarChart2, to: '/admin/analytics', permission: 'analytics.view' },
  { label: 'Data Ops', icon: Database, to: '/admin/data-ops', permission: 'dataOps.view' },
  { label: 'Users', icon: Users, to: '/admin/users', permission: 'users.view' },
  { label: 'Audit Log', icon: ClipboardList, to: '/admin/audit-log', permission: 'auditLog.view' },
  { label: 'Settings', icon: Settings, to: '/admin/settings', permission: 'settings.view' },
];

function canSee(user, permission) {
  if (!permission) return true;
  if (user.role === 'owner') return true;
  return user.permissions?.includes(permission);
}

export default function AdminSidebar({ isOpen, onClose }) {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-surface-1 border-r border-hairline transition-transform duration-300 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo area */}
        <div className="flex h-16 items-center gap-3 border-b border-hairline px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-ink">FCO Admin</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV_ITEMS.filter((item) => canSee(user, item.permission)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-blue/15 text-brand-blue'
                    : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
                }`
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-hairline p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
```

- [ ] **Step 2: Write AdminTopbar**

Create `client/src/components/admin/AdminTopbar.jsx`:

```jsx
import { Menu } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const ROLE_LABEL = {
  owner: 'Owner',
  manager: 'Manager',
};

const ROLE_COLOR = {
  owner: 'bg-brand-blue/20 text-brand-blue',
  manager: 'bg-surface-3 text-ink-muted',
};

export default function AdminTopbar({ onMenuToggle }) {
  const { user } = useAdminAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-hairline bg-surface-1/80 px-4 backdrop-blur sm:px-6">
      {/* Mobile menu button */}
      <button
        onClick={onMenuToggle}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      {/* User info */}
      {user && (
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-ink-muted sm:block">{user.email}</span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLOR[user.role] ?? ROLE_COLOR.manager}`}
          >
            {ROLE_LABEL[user.role] ?? user.role}
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-sm font-semibold text-ink">
            {user.name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
        </div>
      )}
    </header>
  );
}
```

- [ ] **Step 3: Write AdminLayout**

Create `client/src/layouts/AdminLayout.jsx`:

```jsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminTopbar from '../components/admin/AdminTopbar';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas-black text-ink">
      <div className="lg:flex">
        <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="min-w-0 flex-1">
          <AdminTopbar onMenuToggle={() => setSidebarOpen((prev) => !prev)} />
          <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update App.jsx to use AdminLayout**

Replace the placeholder admin route block with layout + nested routes:

```jsx
import AdminLayout from './layouts/AdminLayout';
// Stub page imports (add real pages as they are built)

// Replace the /admin/* Route block:
<Route
  path="/admin"
  element={
    <AdminProtectedRoute>
      <AdminLayout />
    </AdminProtectedRoute>
  }
>
  <Route index element={<AdminOverviewPage />} />
  {/* Additional routes added per task */}
</Route>
```

`AdminOverviewPage` is the stub created in Task 2.6 below.

- [ ] **Step 5: Verify layout**

Run dev server. Login → expected admin layout with sidebar and topbar. Clicking sidebar links navigates correctly. Mobile menu toggle works.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/admin/AdminSidebar.jsx client/src/components/admin/AdminTopbar.jsx client/src/layouts/AdminLayout.jsx client/src/App.jsx
git commit -m "feat: add admin layout (sidebar + topbar)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2.6: Admin Overview Page

**Files:**
- Create: `client/src/pages/admin/AdminOverviewPage.jsx`
- Modify: `client/src/App.jsx`

**Interfaces:**
- Consumes: `useAdminAuth()` context
- Produces: `/admin` index page — welcome message, current user info, stub metric cards

This is a placeholder page for Phase 2. It will be extended in the Analytics phase.

- [ ] **Step 1: Write overview page**

Create `client/src/pages/admin/AdminOverviewPage.jsx`:

```jsx
import { Shield } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

function StatCard({ label, value, note }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface-1 p-5">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
      {note && <p className="mt-1 text-xs text-ink-subtle">{note}</p>}
    </div>
  );
}

export default function AdminOverviewPage() {
  const { user } = useAdminAuth();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue/15">
          <Shield className="h-6 w-6 text-brand-blue" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            Welcome back, {user?.name ?? 'Admin'}
          </h1>
          <p className="text-sm text-ink-muted">
            {user?.role === 'owner' ? 'Owner' : 'Manager'} · {user?.email}
          </p>
        </div>
      </div>

      {/* Stat placeholders — replaced by real data in Phase 8 (Analytics) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Published Items" value="—" note="Analytics coming soon" />
        <StatCard label="Total Impressions" value="—" note="Analytics coming soon" />
        <StatCard label="Total Clicks" value="—" note="Analytics coming soon" />
        <StatCard label="Active Placements" value="—" note="Placements phase" />
      </div>

      {/* Quick links */}
      <div className="rounded-xl border border-hairline bg-surface-1 p-5">
        <h2 className="mb-4 text-base font-semibold text-ink">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <a href="/admin/monetization/new" className="btn-primary text-sm px-4 py-2 rounded-lg">
            + New Monetization Item
          </a>
          <a href="/admin/monetization" className="rounded-lg border border-hairline bg-surface-2 px-4 py-2 text-sm text-ink hover:bg-surface-3 transition-colors">
            View All Items
          </a>
          <a href="/admin/placements" className="rounded-lg border border-hairline bg-surface-2 px-4 py-2 text-sm text-ink hover:bg-surface-3 transition-colors">
            Manage Placements
          </a>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Register in App.jsx**

```jsx
import AdminOverviewPage from './pages/admin/AdminOverviewPage';

// Inside the /admin nested routes:
<Route index element={<AdminOverviewPage />} />
```

- [ ] **Step 3: Test**

Login → navigate to `/admin` → expected overview page with user name, stat placeholders, quick action links.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/admin/AdminOverviewPage.jsx client/src/App.jsx
git commit -m "feat: add admin overview page stub

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 3: Manager Account Management

### Task 3.1: Audit Log Model and Helper

**Files:**
- Create: `server/src/models/AuditLog.js`
- Create: `server/src/services/auditLog.js`

**Interfaces:**
- Produces: `AuditLog` model, `createAuditLog({ actorUserId, actorEmail, action, resourceType, resourceId, before, after, req })` helper

- [ ] **Step 1: Write AuditLog model**

Create `server/src/models/AuditLog.js`:

```javascript
import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    actorEmail: { type: String },
    action: { type: String, required: true },
    resourceType: { type: String },
    resourceId: { type: mongoose.Schema.Types.ObjectId },
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

auditLogSchema.index({ actorUserId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
```

- [ ] **Step 2: Write audit log helper**

Create `server/src/services/auditLog.js`:

```javascript
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
    // Audit log failure must never block the actual operation
    console.error('[AuditLog] Failed to write log entry:', err.message);
  }
}
```

- [ ] **Step 3: Add audit log calls to auth controller**

In `server/src/controllers/adminAuth.controller.js`:

```javascript
import { createAuditLog } from '../services/auditLog.js';

// In login handler, after successful login:
await createAuditLog({
  actorUserId: user._id,
  actorEmail: user.email,
  action: 'admin.login',
  req,
});

// In logout handler, before session destroy:
await createAuditLog({
  actorUserId: req.session?.adminUserId,
  actorEmail: req.session?.adminUser?.email,
  action: 'admin.logout',
  req,
});

// In changePassword handler, after successful save:
await createAuditLog({
  actorUserId: user._id,
  actorEmail: user.email,
  action: 'user.password_change',
  resourceType: 'AdminUser',
  resourceId: user._id,
  req,
});
```

- [ ] **Step 4: Commit**

```bash
git add server/src/models/AuditLog.js server/src/services/auditLog.js server/src/controllers/adminAuth.controller.js
git commit -m "feat: add audit log model, helper, and auth event logging

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3.2: Admin Users API

**Files:**
- Create: `server/src/controllers/adminUsers.controller.js`
- Create: `server/src/routes/adminUsers.routes.js`
- Modify: `server/src/server.js`

**Interfaces:**
- Consumes: `AdminUser` model, bcrypt, `adminAuth` + `requirePermission` middleware, `createAuditLog`
- Produces:
  - `GET  /api/admin/users` — list admin users (requires `users.view`)
  - `POST /api/admin/users` — create Manager (requires `users.create`, owner only)
  - `GET  /api/admin/users/:id` — get user detail (requires `users.view`)
  - `PATCH /api/admin/users/:id` — update name/permissions/status (requires `users.edit`)
  - `POST /api/admin/users/:id/reset-password` — set temporary password (requires `users.edit`, owner only)

Security invariants enforced in controller:
- Cannot create another Owner.
- Cannot edit the Owner account (non-owners).
- Manager cannot modify users with equal or higher role.
- Cannot elevate own permissions.

- [ ] **Step 1: Write users controller**

Create `server/src/controllers/adminUsers.controller.js`:

```javascript
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

    // Only owner can create users
    if (actor.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Only the Owner can create admin users' });
    }

    const { name, email, temporaryPassword, permissions = [] } = req.body;

    if (!name || !email || !temporaryPassword) {
      return res.status(400).json({ success: false, message: 'name, email, and temporaryPassword are required' });
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
      role: 'manager', // POST /api/admin/users can only create managers
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

    // Cannot modify an owner unless actor is owner editing themselves (name only)
    if (target.role === 'owner' && actor.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Cannot modify Owner account' });
    }

    // Manager cannot edit themselves to gain permissions
    if (actor.role === 'manager' && actor.id === target._id.toString()) {
      if (req.body.permissions !== undefined || req.body.role !== undefined) {
        return res.status(403).json({ success: false, message: 'Cannot modify own permissions' });
      }
    }

    const before = { name: target.name, permissions: target.permissions, status: target.status };
    const allowedFields = ['name', 'permissions', 'status'];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        // status: only owner can disable/re-enable
        if (field === 'status' && actor.role !== 'owner') {
          return res.status(403).json({ success: false, message: 'Only Owner can change user status' });
        }
        // permissions: only owner can change
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
      return res.status(403).json({ success: false, message: 'Only the Owner can reset passwords' });
    }

    const { temporaryPassword } = req.body;

    if (!temporaryPassword || temporaryPassword.length < 12) {
      return res.status(400).json({ success: false, message: 'Temporary password must be at least 12 characters' });
    }

    const target = await AdminUser.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });

    if (target.role === 'owner') {
      return res.status(403).json({ success: false, message: 'Cannot reset the Owner password via this endpoint' });
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

    res.json({ success: true, message: 'Password reset. User must change on next login.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error resetting password', error: err.message });
  }
};
```

- [ ] **Step 2: Write users routes**

Create `server/src/routes/adminUsers.routes.js`:

```javascript
import express from 'express';
import { listUsers, getUser, createUser, updateUser, resetPassword } from '../controllers/adminUsers.controller.js';
import { adminAuth, requirePermission } from '../middleware/adminAuth.js';

const router = express.Router();

router.use(adminAuth);

router.get('/', requirePermission('users.view'), listUsers);
router.get('/:id', requirePermission('users.view'), getUser);
router.post('/', requirePermission('users.create'), createUser);
router.patch('/:id', requirePermission('users.edit'), updateUser);
router.post('/:id/reset-password', requirePermission('users.edit'), resetPassword);

export default router;
```

- [ ] **Step 3: Mount in server.js**

```javascript
import adminUsersRoutes from './routes/adminUsers.routes.js';

app.use('/api/admin/users', adminUsersRoutes);
```

- [ ] **Step 4: Test**

```bash
# Login first, save cookie

# List users (as owner)
curl http://localhost:5000/api/admin/users \
  -H "Cookie: connect.sid=<session>"

# Create manager
curl -X POST http://localhost:5000/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<session>" \
  -d '{"name":"Test Manager","email":"manager@test.com","temporaryPassword":"Manager123!ABC","permissions":["monetization.view","monetization.edit"]}'

# Expected: 201 with user object, mustChangePassword: true
```

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/adminUsers.controller.js server/src/routes/adminUsers.routes.js server/src/server.js
git commit -m "feat: add admin users CRUD API with permission enforcement

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3.3: Admin Users Service (Frontend)

**Files:**
- Create: `client/src/services/adminUsers.js`

**Interfaces:**
- Consumes: `/api/admin/users` endpoints
- Produces: `adminUsersService.list()`, `.getById(id)`, `.create(payload)`, `.update(id, payload)`, `.resetPassword(id, temporaryPassword)`

- [ ] **Step 1: Write service**

Create `client/src/services/adminUsers.js`:

```javascript
import axios from 'axios';
import { API_BASE } from '../config/api';

const api = axios.create({
  baseURL: `${API_BASE}/admin/users`,
  withCredentials: true,
});

export const adminUsersService = {
  async list() {
    const res = await api.get('/');
    return res.data;
  },

  async getById(id) {
    const res = await api.get(`/${id}`);
    return res.data;
  },

  async create({ name, email, temporaryPassword, permissions }) {
    const res = await api.post('/', { name, email, temporaryPassword, permissions });
    return res.data;
  },

  async update(id, payload) {
    const res = await api.patch(`/${id}`, payload);
    return res.data;
  },

  async resetPassword(id, temporaryPassword) {
    const res = await api.post(`/${id}/reset-password`, { temporaryPassword });
    return res.data;
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add client/src/services/adminUsers.js
git commit -m "feat: add admin users frontend service

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3.4: Admin Users Page

**Files:**
- Create: `client/src/pages/admin/UsersPage.jsx`
- Create: `client/src/components/admin/CreateManagerModal.jsx`
- Create: `client/src/components/admin/EditPermissionsModal.jsx`
- Modify: `client/src/App.jsx`

**Interfaces:**
- Consumes: `adminUsersService`, `useAdminAuth()`
- Produces: `/admin/users` page showing user list with create/edit/disable/reset-password actions

Layout:

```txt
/admin/users
  Header: "Admin Users" + "Create Manager" button (owner only)
  Table:
    Name | Email | Role | Status | Permissions | Last Login | Actions
  Actions per row:
    - Edit Permissions (owner only, manager rows only)
    - Reset Password (owner only, manager rows only)
    - Disable / Enable (owner only, manager rows only)
```

- [ ] **Step 1: Write CreateManagerModal**

Create `client/src/components/admin/CreateManagerModal.jsx`:

```jsx
import { useState } from 'react';
import { X } from 'lucide-react';
import { adminUsersService } from '../../services/adminUsers';

const ALL_PERMISSIONS = [
  'monetization.view', 'monetization.create', 'monetization.edit',
  'monetization.publish', 'monetization.archive',
  'placements.view', 'placements.edit',
  'users.view', 'users.create', 'users.edit', 'users.disable',
  'dataOps.view', 'dataOps.run',
  'analytics.view', 'auditLog.view',
  'settings.view', 'settings.edit',
];

export default function CreateManagerModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [permissions, setPermissions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const togglePermission = (perm) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await adminUsersService.create({ name, email, temporaryPassword, permissions });
      if (result.success) {
        onCreated(result.data.user);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create manager');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-lg rounded-2xl border border-hairline bg-surface-1 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-ink">Create Manager</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-10 w-full rounded-lg border border-hairline bg-canvas-dark px-3 text-ink outline-none transition focus:border-brand-blue text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-10 w-full rounded-lg border border-hairline bg-canvas-dark px-3 text-ink outline-none transition focus:border-brand-blue text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">
              Temporary Password <span className="text-ink-subtle font-normal">(min 12 chars)</span>
            </label>
            <input
              type="text"
              value={temporaryPassword}
              onChange={(e) => setTemporaryPassword(e.target.value)}
              required
              className="h-10 w-full rounded-lg border border-hairline bg-canvas-dark px-3 text-ink outline-none transition focus:border-brand-blue text-sm font-mono"
              placeholder="They must change this on first login"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Permissions</label>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {ALL_PERMISSIONS.map((perm) => (
                <label key={perm} className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer hover:text-ink">
                  <input
                    type="checkbox"
                    checked={permissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                    className="accent-brand-blue"
                  />
                  {perm}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-hairline bg-surface-2 py-2.5 text-sm font-medium text-ink hover:bg-surface-3 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Manager'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write EditPermissionsModal**

Create `client/src/components/admin/EditPermissionsModal.jsx`:

```jsx
import { useState } from 'react';
import { X } from 'lucide-react';
import { adminUsersService } from '../../services/adminUsers';

const ALL_PERMISSIONS = [
  'monetization.view', 'monetization.create', 'monetization.edit',
  'monetization.publish', 'monetization.archive',
  'placements.view', 'placements.edit',
  'users.view', 'users.create', 'users.edit', 'users.disable',
  'dataOps.view', 'dataOps.run',
  'analytics.view', 'auditLog.view',
  'settings.view', 'settings.edit',
];

export default function EditPermissionsModal({ user, onClose, onUpdated }) {
  const [permissions, setPermissions] = useState(user.permissions ?? []);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const togglePermission = (perm) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await adminUsersService.update(user._id, { permissions });
      if (result.success) {
        onUpdated(result.data.user);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update permissions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-md rounded-2xl border border-hairline bg-surface-1 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-ink">Edit Permissions</h2>
            <p className="text-xs text-ink-muted mt-0.5">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
            {ALL_PERMISSIONS.map((perm) => (
              <label key={perm} className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer hover:text-ink">
                <input
                  type="checkbox"
                  checked={permissions.includes(perm)}
                  onChange={() => togglePermission(perm)}
                  className="accent-brand-blue"
                />
                {perm}
              </label>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-hairline bg-surface-2 py-2.5 text-sm font-medium text-ink hover:bg-surface-3 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 btn-primary py-2.5 text-sm font-medium disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write UsersPage**

Create `client/src/pages/admin/UsersPage.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { Users, Plus, RotateCcw, Ban, CheckCircle } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { adminUsersService } from '../../services/adminUsers';
import CreateManagerModal from '../../components/admin/CreateManagerModal';
import EditPermissionsModal from '../../components/admin/EditPermissionsModal';

const STATUS_BADGE = {
  active: 'bg-success/15 text-success',
  disabled: 'bg-error/15 text-error',
  pending_password_change: 'bg-warning/15 text-warning',
};

const STATUS_LABEL = {
  active: 'Active',
  disabled: 'Disabled',
  pending_password_change: 'Pending PW Change',
};

export default function UsersPage() {
  const { user: currentUser } = useAdminAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const isOwner = currentUser?.role === 'owner';

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const result = await adminUsersService.list();
      if (result.success) setUsers(result.data.users);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleToggleStatus = async (target) => {
    if (!isOwner) return;
    const newStatus = target.status === 'disabled' ? 'active' : 'disabled';
    setActionLoading(target._id);
    try {
      const result = await adminUsersService.update(target._id, { status: newStatus });
      if (result.success) {
        setUsers((prev) => prev.map((u) => u._id === target._id ? result.data.user : u));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async (target) => {
    if (!isOwner) return;
    const tempPw = prompt('Enter new temporary password (min 12 characters):');
    if (!tempPw) return;
    setActionLoading(target._id);
    try {
      await adminUsersService.resetPassword(target._id, tempPw);
      alert('Password reset. The manager must change it on next login.');
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/15">
            <Users className="h-5 w-5 text-brand-blue" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink">Admin Users</h1>
            <p className="text-sm text-ink-muted">{users.length} account{users.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            Create Manager
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-hairline bg-surface-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline">
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Permissions</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Last Login</th>
                {isOwner && <th className="px-4 py-3 text-right text-xs font-semibold text-ink-muted uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loading ? (
                <tr>
                  <td colSpan={isOwner ? 7 : 6} className="px-4 py-8 text-center text-ink-muted">
                    Loading...
                  </td>
                </tr>
              ) : users.map((u) => (
                <tr key={u._id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3 font-medium text-ink">{u.name}</td>
                  <td className="px-4 py-3 text-ink-muted">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${u.role === 'owner' ? 'bg-brand-blue/15 text-brand-blue' : 'bg-surface-3 text-ink-muted'}`}>
                      {u.role === 'owner' ? 'Owner' : 'Manager'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[u.status] ?? STATUS_BADGE.active}`}>
                      {STATUS_LABEL[u.status] ?? u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {u.role === 'owner' ? (
                      <span className="text-xs text-ink-subtle italic">All permissions</span>
                    ) : (
                      <span className="text-xs">{u.permissions?.length ?? 0} assigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-muted text-xs">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('vi-VN') : '—'}
                  </td>
                  {isOwner && (
                    <td className="px-4 py-3">
                      {u.role !== 'owner' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditTarget(u)}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-3 hover:text-ink transition-colors border border-hairline"
                          >
                            Permissions
                          </button>
                          <button
                            onClick={() => handleResetPassword(u)}
                            disabled={actionLoading === u._id}
                            className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-3 hover:text-ink transition-colors"
                            title="Reset password"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={actionLoading === u._id}
                            className={`rounded-lg p-1.5 transition-colors ${u.status === 'disabled' ? 'text-success hover:bg-success/10' : 'text-error hover:bg-error/10'}`}
                            title={u.status === 'disabled' ? 'Enable account' : 'Disable account'}
                          >
                            {u.status === 'disabled' ? <CheckCircle className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateManagerModal
          onClose={() => setShowCreate(false)}
          onCreated={(newUser) => setUsers((prev) => [newUser, ...prev])}
        />
      )}
      {editTarget && (
        <EditPermissionsModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={(updated) => {
            setUsers((prev) => prev.map((u) => u._id === updated._id ? updated : u));
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Register route in App.jsx**

```jsx
import UsersPage from './pages/admin/UsersPage';

// Inside <Route path="/admin"> nested routes:
<Route path="users" element={<UsersPage />} />
```

- [ ] **Step 5: Test end-to-end**

Login as Owner → navigate to `/admin/users` → expected: list shows Owner account.

Create Manager with partial permissions → expected: 201, table updates.

Login as Manager → verify only permitted sidebar items visible.

Login back as Owner → disable manager → expected: status changes to Disabled.

Attempt to log in as disabled manager → expected: 403 "Account disabled".

Reset password as Owner → expected: manager forced to change password on next login.

- [ ] **Step 6: Commit**

```bash
git add \
  client/src/services/adminUsers.js \
  client/src/pages/admin/UsersPage.jsx \
  client/src/components/admin/CreateManagerModal.jsx \
  client/src/components/admin/EditPermissionsModal.jsx \
  client/src/App.jsx
git commit -m "feat: add admin users page with create/edit/disable manager

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3.5: Phase 3 Verification

- [ ] Owner bootstrap creates one Owner; second server restart skips bootstrap.
- [ ] Owner can log in; wrong credentials are rejected with 401.
- [ ] First login with `mustChangePassword: true` forces redirect to `/admin/change-password`.
- [ ] Password change succeeds; status changes to `active`; subsequent login goes to `/admin`.
- [ ] `GET /api/admin/users` requires auth — unauthenticated call returns 401.
- [ ] Manager without `users.view` gets 403 on `GET /api/admin/users`.
- [ ] Owner creates Manager with `temporaryPassword` — returned with `mustChangePassword: true`.
- [ ] Owner can disable manager; disabled manager login returns 403.
- [ ] Owner can reset manager password; manager forced to change on next login.
- [ ] Manager cannot edit their own permissions via `PATCH /api/admin/users/:ownId`.
- [ ] Manager cannot modify Owner account.
- [ ] `POST /api/admin/users` cannot create another Owner — always sets `role: 'manager'`.
- [ ] Audit log entries created for: `admin.login`, `admin.logout`, `user.create`, `user.update`, `user.password_reset`, `user.password_change`.
- [ ] Admin sidebar hides items the logged-in manager lacks permissions for.
- [ ] Public app routes (`/`, `/database`, etc.) unaffected by admin auth.

- [ ] **Commit verification pass**

```bash
git commit --allow-empty -m "chore: phase 3 verification passed

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 4: Monetization Models and Admin CRUD

### Task 4.1: MonetizationPlacement Model and Seed

**Files:**
- Create: `server/src/models/MonetizationPlacement.js`
- Create: `server/src/services/seedPlacements.js`
- Modify: `server/src/server.js`

**Interfaces:**
- Produces: `MonetizationPlacement` model, `seedPlacements()` function that inserts defaults if none exist

- [ ] **Step 1: Write MonetizationPlacement model**

Create `server/src/models/MonetizationPlacement.js`:

```javascript
import mongoose from 'mongoose';

const monetizationPlacementSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true, trim: true },
    page: { type: String, required: true },
    supportedTypes: [{ type: String, enum: ['youtube_video', 'affiliate_link', 'sponsor_banner', 'ad_slot', 'custom_cta'] }],
    defaultLimit: { type: Number, default: 3 },
    enabled: { type: Boolean, default: true },
    description: { type: String },
  },
  { timestamps: true }
);

monetizationPlacementSchema.index({ page: 1, enabled: 1 });

const MonetizationPlacement = mongoose.model('MonetizationPlacement', monetizationPlacementSchema);
export default MonetizationPlacement;
```

- [ ] **Step 2: Write seed service**

Create `server/src/services/seedPlacements.js`:

```javascript
import MonetizationPlacement from '../models/MonetizationPlacement.js';

const DEFAULTS = [
  { key: 'dashboard_top',            label: 'Dashboard – Trên cùng',              page: 'dashboard',      supportedTypes: ['sponsor_banner', 'ad_slot', 'custom_cta'], defaultLimit: 1 },
  { key: 'dashboard_inline',         label: 'Dashboard – Giữa trang',             page: 'dashboard',      supportedTypes: ['youtube_video', 'affiliate_link'],          defaultLimit: 3 },
  { key: 'videos_top',               label: 'Videos – Trên cùng',                 page: 'videos',         supportedTypes: ['youtube_video', 'sponsor_banner'],           defaultLimit: 1 },
  { key: 'videos_grid',              label: 'Videos – Lưới chính',                page: 'videos',         supportedTypes: ['youtube_video'],                             defaultLimit: 12 },
  { key: 'player_detail_featured',   label: 'Chi tiết cầu thủ – Video nổi bật',   page: 'player_detail',  supportedTypes: ['youtube_video'],                             defaultLimit: 1 },
  { key: 'player_detail_related',    label: 'Chi tiết cầu thủ – Video liên quan', page: 'player_detail',  supportedTypes: ['youtube_video'],                             defaultLimit: 4 },
  { key: 'player_detail_sidebar',    label: 'Chi tiết cầu thủ – Sidebar',         page: 'player_detail',  supportedTypes: ['sponsor_banner', 'ad_slot'],                 defaultLimit: 2 },
  { key: 'player_detail_affiliate',  label: 'Chi tiết cầu thủ – Affiliate CTAs',  page: 'player_detail',  supportedTypes: ['affiliate_link'],                            defaultLimit: 3 },
  { key: 'database_inline',          label: 'Database – Giữa trang',              page: 'database',       supportedTypes: ['affiliate_link', 'sponsor_banner'],          defaultLimit: 2 },
  { key: 'database_sidebar',         label: 'Database – Sidebar',                 page: 'database',       supportedTypes: ['ad_slot', 'sponsor_banner'],                 defaultLimit: 1 },
  { key: 'market_top',               label: 'Market – Trên cùng',                 page: 'market',         supportedTypes: ['sponsor_banner', 'ad_slot'],                 defaultLimit: 1 },
  { key: 'market_inline',            label: 'Market – Giữa trang',                page: 'market',         supportedTypes: ['affiliate_link'],                            defaultLimit: 3 },
  { key: 'calculator_bottom',        label: 'Calculator – Dưới cùng',             page: 'calculator',     supportedTypes: ['affiliate_link', 'custom_cta'],              defaultLimit: 2 },
];

export async function seedPlacements() {
  try {
    const count = await MonetizationPlacement.countDocuments();
    if (count > 0) {
      console.log('[SeedPlacements] Placements already exist, skipping seed');
      return;
    }
    await MonetizationPlacement.insertMany(DEFAULTS);
    console.log(`[SeedPlacements] Seeded ${DEFAULTS.length} default placements`);
  } catch (err) {
    console.error('[SeedPlacements] Seed failed:', err.message);
  }
}
```

- [ ] **Step 3: Call seed on server start**

In `server/src/server.js` after `bootstrapOwner()`:

```javascript
import { seedPlacements } from './services/seedPlacements.js';

// After bootstrapOwner();
seedPlacements();
```

- [ ] **Step 4: Commit**

```bash
git add server/src/models/MonetizationPlacement.js server/src/services/seedPlacements.js server/src/server.js
git commit -m "feat: add MonetizationPlacement model and default seed

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4.2: MonetizationItem Model

**Files:**
- Create: `server/src/models/MonetizationItem.js`
- Create: `server/src/models/MonetizationEvent.js`

- [ ] **Step 1: Write MonetizationItem model**

Create `server/src/models/MonetizationItem.js`:

```javascript
import mongoose from 'mongoose';

const affiliateLinkSchema = new mongoose.Schema({
  platform: { type: String, required: true },
  label:    { type: String, required: true },
  url:      { type: String, required: true },
  priority: { type: Number, default: 0 },
  status:   { type: String, enum: ['active', 'disabled'], default: 'active' },
}, { _id: false });

const linkedEntitySchema = new mongoose.Schema({
  entityType:       { type: String, enum: ['player', 'season', 'team_color', 'event', 'guide', 'custom'], required: true },
  entityId:         { type: String, required: true },
  displayLabel:     { type: String },
  relationType:     { type: String, enum: ['primary', 'secondary', 'mentioned', 'comparison'], default: 'primary' },
  priorityOverride: { type: Number },
  featuredOverride: { type: Boolean },
  startAtOverride:  { type: Date },
  endAtOverride:    { type: Date },
}, { _id: false });

const monetizationItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['youtube_video', 'affiliate_link', 'sponsor_banner', 'ad_slot', 'custom_cta'],
      required: true,
    },
    title:       { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published', 'disabled', 'archived'],
      default: 'draft',
    },
    platform: {
      type: String,
      enum: ['youtube', 'shopee', 'tiktok_shop', 'google_ads', 'custom'],
    },
    placementIds:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'MonetizationPlacement' }],
    linkedEntities:  [linkedEntitySchema],
    priority:        { type: Number, default: 0 },
    isFeatured:      { type: Boolean, default: false },
    displayStrategy: {
      type: String,
      enum: ['manual', 'priority', 'newest', 'weighted_rotation'],
      default: 'priority',
    },
    startAt: { type: Date },
    endAt:   { type: Date },

    content: {
      youtubeVideoId: { type: String },
      youtubeUrl:     { type: String },
      channelName:    { type: String },
      thumbnailUrl:   { type: String },
      targetUrl:      { type: String },
      imageUrl:       { type: String },
      ctaLabel:       { type: String },
      providerConfig: { type: mongoose.Schema.Types.Mixed },
    },

    affiliateLinks: [affiliateLinkSchema],

    tracking: {
      impressionCount: { type: Number, default: 0 },
      clickCount:      { type: Number, default: 0 },
      lastClickedAt:   { type: Date },
    },

    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    publishedAt: { type: Date },
    archivedAt:  { type: Date },
  },
  { timestamps: true }
);

monetizationItemSchema.index({ status: 1, placementIds: 1 });
monetizationItemSchema.index({ 'linkedEntities.entityType': 1, 'linkedEntities.entityId': 1 });
monetizationItemSchema.index({ priority: -1, publishedAt: -1 });

const MonetizationItem = mongoose.model('MonetizationItem', monetizationItemSchema);
export default MonetizationItem;
```

- [ ] **Step 2: Write MonetizationEvent model**

Create `server/src/models/MonetizationEvent.js`:

```javascript
import mongoose from 'mongoose';

const monetizationEventSchema = new mongoose.Schema(
  {
    itemId:       { type: mongoose.Schema.Types.ObjectId, ref: 'MonetizationItem', required: true },
    placementKey: { type: String, required: true },
    eventType:    { type: String, enum: ['impression', 'click'], required: true },
    entityType:   { type: String },
    entityId:     { type: String },
    sessionId:    { type: String },
    userAgent:    { type: String },
    referrer:     { type: String },
  },
  { timestamps: true }
);

monetizationEventSchema.index({ itemId: 1, eventType: 1 });
monetizationEventSchema.index({ placementKey: 1, createdAt: -1 });
monetizationEventSchema.index({ createdAt: -1 });

const MonetizationEvent = mongoose.model('MonetizationEvent', monetizationEventSchema);
export default MonetizationEvent;
```

- [ ] **Step 3: Commit**

```bash
git add server/src/models/MonetizationItem.js server/src/models/MonetizationEvent.js
git commit -m "feat: add MonetizationItem and MonetizationEvent models

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4.3: Monetization Validator

**Files:**
- Create: `server/src/services/monetizationValidator.js`

**Interfaces:**
- Produces: `validateMonetizationItem(data)` returning `{ valid: boolean, errors: string[] }`

Type-specific required field rules:

```txt
youtube_video   → content.youtubeUrl (or youtubeVideoId), title, ≥1 placementId
affiliate_link  → content.targetUrl, content.ctaLabel, platform, ≥1 placementId
sponsor_banner  → content.imageUrl, content.targetUrl, ≥1 placementId
ad_slot         → content.providerConfig.provider, content.providerConfig.slotId, ≥1 placementId
custom_cta      → content.ctaLabel, content.targetUrl, ≥1 placementId
```

- [ ] **Step 1: Write validator**

Create `server/src/services/monetizationValidator.js`:

```javascript
export function validateMonetizationItem(data) {
  const errors = [];
  const { type, title, placementIds, content = {}, platform } = data;

  if (!type) errors.push('type is required');
  if (!title || !title.trim()) errors.push('title is required');
  if (!placementIds || placementIds.length === 0) errors.push('at least one placement is required');

  switch (type) {
    case 'youtube_video':
      if (!content.youtubeUrl && !content.youtubeVideoId) errors.push('content.youtubeUrl or content.youtubeVideoId is required');
      break;
    case 'affiliate_link':
      if (!content.targetUrl) errors.push('content.targetUrl is required');
      if (!content.ctaLabel)  errors.push('content.ctaLabel is required');
      if (!platform)          errors.push('platform is required for affiliate_link');
      break;
    case 'sponsor_banner':
      if (!content.imageUrl)  errors.push('content.imageUrl is required');
      if (!content.targetUrl) errors.push('content.targetUrl is required');
      break;
    case 'ad_slot':
      if (!content.providerConfig?.provider) errors.push('content.providerConfig.provider is required');
      if (!content.providerConfig?.slotId)   errors.push('content.providerConfig.slotId is required');
      break;
    case 'custom_cta':
      if (!content.ctaLabel)  errors.push('content.ctaLabel is required');
      if (!content.targetUrl) errors.push('content.targetUrl is required');
      break;
  }

  // Parse YouTube ID from URL if not provided
  if (type === 'youtube_video' && content.youtubeUrl && !content.youtubeVideoId) {
    const match = content.youtubeUrl.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (!match) errors.push('content.youtubeUrl does not contain a valid YouTube video ID');
  }

  return { valid: errors.length === 0, errors };
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/services/monetizationValidator.js
git commit -m "feat: add monetization item validator

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4.4: Monetization Admin API

**Files:**
- Create: `server/src/controllers/adminMonetization.controller.js`
- Create: `server/src/routes/adminMonetization.routes.js`
- Create: `server/src/routes/adminPlacements.routes.js`
- Modify: `server/src/server.js`

**Interfaces:**
- Produces:
  - `GET    /api/admin/monetization` — list with filters (status, type, platform, placementId, search)
  - `POST   /api/admin/monetization` — create draft
  - `GET    /api/admin/monetization/:id` — get item
  - `PUT    /api/admin/monetization/:id` — full update
  - `PATCH  /api/admin/monetization/:id/publish` — publish
  - `PATCH  /api/admin/monetization/:id/unpublish` — revert to draft
  - `PATCH  /api/admin/monetization/:id/archive` — archive
  - `POST   /api/admin/monetization/:id/duplicate` — clone as draft
  - `DELETE /api/admin/monetization/:id` — hard delete (owner only)
  - `GET    /api/admin/placements` — list placements
  - `PATCH  /api/admin/placements/:id` — update placement

- [ ] **Step 1: Write monetization controller**

Create `server/src/controllers/adminMonetization.controller.js`:

```javascript
import MonetizationItem from '../models/MonetizationItem.js';
import { validateMonetizationItem } from '../services/monetizationValidator.js';
import { createAuditLog } from '../services/auditLog.js';

export const listItems = async (req, res) => {
  try {
    const { status, type, platform, placementId, search, sort = 'newest', page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status)      filter.status = status;
    if (type)        filter.type = type;
    if (platform)    filter.platform = platform;
    if (placementId) filter.placementIds = placementId;
    if (search)      filter.title = { $regex: search, $options: 'i' };

    const sortMap = {
      newest:   { createdAt: -1 },
      priority: { priority: -1, publishedAt: -1 },
      ctr:      { 'tracking.clickCount': -1 },
    };
    const sortObj = sortMap[sort] || sortMap.newest;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      MonetizationItem.find(filter).sort(sortObj).skip(skip).limit(Number(limit)).populate('placementIds', 'key label'),
      MonetizationItem.countDocuments(filter),
    ]);

    res.json({ success: true, data: { items, total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error listing items', error: err.message });
  }
};

export const getItem = async (req, res) => {
  try {
    const item = await MonetizationItem.findById(req.params.id).populate('placementIds', 'key label page');
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, data: { item } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching item', error: err.message });
  }
};

export const createItem = async (req, res) => {
  try {
    const actor = req.session.adminUser;
    const { valid, errors } = validateMonetizationItem(req.body);
    if (!valid) return res.status(400).json({ success: false, message: 'Validation failed', errors });

    // Auto-parse YouTube ID
    if (req.body.type === 'youtube_video' && req.body.content?.youtubeUrl && !req.body.content?.youtubeVideoId) {
      const match = req.body.content.youtubeUrl.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
      if (match) req.body.content.youtubeVideoId = match[1];
    }

    const item = await MonetizationItem.create({ ...req.body, status: 'draft', createdBy: actor.id, updatedBy: actor.id });

    await createAuditLog({ actorUserId: actor.id, actorEmail: actor.email, action: 'monetization.create', resourceType: 'MonetizationItem', resourceId: item._id, after: { title: item.title, type: item.type, status: item.status }, req });

    res.status(201).json({ success: true, data: { item } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error creating item', error: err.message });
  }
};

export const updateItem = async (req, res) => {
  try {
    const actor = req.session.adminUser;
    const item = await MonetizationItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    if (item.status === 'archived') return res.status(400).json({ success: false, message: 'Cannot edit archived item' });

    const before = { title: item.title, status: item.status };

    const EDITABLE = ['type','title','description','platform','placementIds','linkedEntities','priority','isFeatured','displayStrategy','startAt','endAt','content','affiliateLinks'];
    for (const field of EDITABLE) {
      if (req.body[field] !== undefined) item[field] = req.body[field];
    }

    // Auto-parse YouTube ID on update
    if (item.type === 'youtube_video' && item.content?.youtubeUrl && !item.content?.youtubeVideoId) {
      const match = item.content.youtubeUrl.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
      if (match) item.content.youtubeVideoId = match[1];
    }

    item.updatedBy = actor.id;
    await item.save();

    await createAuditLog({ actorUserId: actor.id, actorEmail: actor.email, action: 'monetization.update', resourceType: 'MonetizationItem', resourceId: item._id, before, after: { title: item.title, status: item.status }, req });

    res.json({ success: true, data: { item } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating item', error: err.message });
  }
};

export const publishItem = async (req, res) => {
  try {
    const actor = req.session.adminUser;
    const item = await MonetizationItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    if (item.status === 'archived') return res.status(400).json({ success: false, message: 'Cannot publish archived item' });

    const { valid, errors } = validateMonetizationItem(item.toObject());
    if (!valid) return res.status(400).json({ success: false, message: 'Item not ready to publish', errors });

    const before = { status: item.status };
    item.status = 'published';
    item.publishedAt = item.publishedAt || new Date();
    item.publishedBy = actor.id;
    item.updatedBy = actor.id;
    await item.save();

    await createAuditLog({ actorUserId: actor.id, actorEmail: actor.email, action: 'monetization.publish', resourceType: 'MonetizationItem', resourceId: item._id, before, after: { status: 'published' }, req });

    res.json({ success: true, data: { item } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error publishing item', error: err.message });
  }
};

export const unpublishItem = async (req, res) => {
  try {
    const actor = req.session.adminUser;
    const item = await MonetizationItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    const before = { status: item.status };
    item.status = 'draft';
    item.updatedBy = actor.id;
    await item.save();

    await createAuditLog({ actorUserId: actor.id, actorEmail: actor.email, action: 'monetization.unpublish', resourceType: 'MonetizationItem', resourceId: item._id, before, after: { status: 'draft' }, req });

    res.json({ success: true, data: { item } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error unpublishing item', error: err.message });
  }
};

export const archiveItem = async (req, res) => {
  try {
    const actor = req.session.adminUser;
    const item = await MonetizationItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    const before = { status: item.status };
    item.status = 'archived';
    item.archivedAt = new Date();
    item.updatedBy = actor.id;
    await item.save();

    await createAuditLog({ actorUserId: actor.id, actorEmail: actor.email, action: 'monetization.archive', resourceType: 'MonetizationItem', resourceId: item._id, before, after: { status: 'archived' }, req });

    res.json({ success: true, data: { item } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error archiving item', error: err.message });
  }
};

export const duplicateItem = async (req, res) => {
  try {
    const actor = req.session.adminUser;
    const source = await MonetizationItem.findById(req.params.id).lean();
    if (!source) return res.status(404).json({ success: false, message: 'Item not found' });

    delete source._id;
    delete source.__v;
    delete source.createdAt;
    delete source.updatedAt;
    source.title = `${source.title} (copy)`;
    source.status = 'draft';
    source.publishedAt = undefined;
    source.publishedBy = undefined;
    source.archivedAt = undefined;
    source.tracking = { impressionCount: 0, clickCount: 0 };
    source.createdBy = actor.id;
    source.updatedBy = actor.id;

    const clone = await MonetizationItem.create(source);

    await createAuditLog({ actorUserId: actor.id, actorEmail: actor.email, action: 'monetization.duplicate', resourceType: 'MonetizationItem', resourceId: clone._id, after: { sourceId: req.params.id, title: clone.title }, req });

    res.status(201).json({ success: true, data: { item: clone } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error duplicating item', error: err.message });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const actor = req.session.adminUser;
    if (actor.role !== 'owner') return res.status(403).json({ success: false, message: 'Only Owner can hard-delete items' });

    const item = await MonetizationItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    await createAuditLog({ actorUserId: actor.id, actorEmail: actor.email, action: 'monetization.delete', resourceType: 'MonetizationItem', resourceId: req.params.id, before: { title: item.title, status: item.status }, req });

    res.json({ success: true, message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting item', error: err.message });
  }
};
```

- [ ] **Step 2: Write monetization routes**

Create `server/src/routes/adminMonetization.routes.js`:

```javascript
import express from 'express';
import { listItems, getItem, createItem, updateItem, publishItem, unpublishItem, archiveItem, duplicateItem, deleteItem } from '../controllers/adminMonetization.controller.js';
import { adminAuth, requirePermission } from '../middleware/adminAuth.js';

const router = express.Router();
router.use(adminAuth);

router.get('/',              requirePermission('monetization.view'),    listItems);
router.get('/:id',           requirePermission('monetization.view'),    getItem);
router.post('/',             requirePermission('monetization.create'),  createItem);
router.put('/:id',           requirePermission('monetization.edit'),    updateItem);
router.patch('/:id/publish', requirePermission('monetization.publish'), publishItem);
router.patch('/:id/unpublish',requirePermission('monetization.publish'),unpublishItem);
router.patch('/:id/archive', requirePermission('monetization.archive'), archiveItem);
router.post('/:id/duplicate',requirePermission('monetization.create'),  duplicateItem);
router.delete('/:id',        requirePermission('monetization.archive'), deleteItem);

export default router;
```

- [ ] **Step 3: Write placements admin routes**

Create `server/src/routes/adminPlacements.routes.js`:

```javascript
import express from 'express';
import MonetizationPlacement from '../models/MonetizationPlacement.js';
import { adminAuth, requirePermission } from '../middleware/adminAuth.js';
import { createAuditLog } from '../services/auditLog.js';

const router = express.Router();
router.use(adminAuth);

router.get('/', requirePermission('placements.view'), async (req, res) => {
  try {
    const placements = await MonetizationPlacement.find({}).sort({ page: 1, key: 1 });
    res.json({ success: true, data: { placements } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching placements', error: err.message });
  }
});

router.patch('/:id', requirePermission('placements.edit'), async (req, res) => {
  try {
    const actor = req.session.adminUser;
    const placement = await MonetizationPlacement.findById(req.params.id);
    if (!placement) return res.status(404).json({ success: false, message: 'Placement not found' });

    const before = { label: placement.label, enabled: placement.enabled, defaultLimit: placement.defaultLimit };
    const EDITABLE = ['label', 'enabled', 'defaultLimit', 'description', 'supportedTypes'];
    for (const f of EDITABLE) {
      if (req.body[f] !== undefined) placement[f] = req.body[f];
    }
    await placement.save();

    await createAuditLog({ actorUserId: actor.id, actorEmail: actor.email, action: 'placement.update', resourceType: 'MonetizationPlacement', resourceId: placement._id, before, after: { label: placement.label, enabled: placement.enabled }, req });

    res.json({ success: true, data: { placement } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating placement', error: err.message });
  }
});

export default router;
```

- [ ] **Step 4: Mount routes in server.js**

```javascript
import adminMonetizationRoutes from './routes/adminMonetization.routes.js';
import adminPlacementsRoutes from './routes/adminPlacements.routes.js';

app.use('/api/admin/monetization', adminMonetizationRoutes);
app.use('/api/admin/placements',   adminPlacementsRoutes);
```

- [ ] **Step 5: Test**

```bash
# Create a youtube_video item
curl -X POST http://localhost:5000/api/admin/monetization \
  -H "Content-Type: application/json" -H "Cookie: connect.sid=<session>" \
  -d '{
    "type": "youtube_video",
    "title": "Ronaldo ICON Review",
    "content": { "youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    "placementIds": ["<placement-id-from-db>"]
  }'

# Expected: 201 with status=draft, youtubeVideoId auto-parsed

# Publish item
curl -X PATCH http://localhost:5000/api/admin/monetization/<id>/publish \
  -H "Cookie: connect.sid=<session>"
# Expected: status=published
```

- [ ] **Step 6: Commit**

```bash
git add \
  server/src/controllers/adminMonetization.controller.js \
  server/src/routes/adminMonetization.routes.js \
  server/src/routes/adminPlacements.routes.js \
  server/src/server.js
git commit -m "feat: add monetization and placements admin API

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4.5: Monetization Admin Service (Frontend)

**Files:**
- Create: `client/src/services/adminMonetization.js`
- Create: `client/src/services/adminPlacements.js`

- [ ] **Step 1: Write services**

Create `client/src/services/adminMonetization.js`:

```javascript
import axios from 'axios';
import { API_BASE } from '../config/api';

const api = axios.create({ baseURL: `${API_BASE}/admin/monetization`, withCredentials: true });

export const adminMonetizationService = {
  list: (params = {}) => api.get('/', { params }).then(r => r.data),
  getById: (id) => api.get(`/${id}`).then(r => r.data),
  create: (data) => api.post('/', data).then(r => r.data),
  update: (id, data) => api.put(`/${id}`, data).then(r => r.data),
  publish: (id) => api.patch(`/${id}/publish`).then(r => r.data),
  unpublish: (id) => api.patch(`/${id}/unpublish`).then(r => r.data),
  archive: (id) => api.patch(`/${id}/archive`).then(r => r.data),
  duplicate: (id) => api.post(`/${id}/duplicate`).then(r => r.data),
  delete: (id) => api.delete(`/${id}`).then(r => r.data),
};
```

Create `client/src/services/adminPlacements.js`:

```javascript
import axios from 'axios';
import { API_BASE } from '../config/api';

const api = axios.create({ baseURL: `${API_BASE}/admin/placements`, withCredentials: true });

export const adminPlacementsService = {
  list: () => api.get('/').then(r => r.data),
  update: (id, data) => api.patch(`/${id}`, data).then(r => r.data),
};
```

- [ ] **Step 2: Commit**

```bash
git add client/src/services/adminMonetization.js client/src/services/adminPlacements.js
git commit -m "feat: add monetization and placements frontend services

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4.6: Monetization List Page

**Files:**
- Create: `client/src/pages/admin/MonetizationListPage.jsx`
- Modify: `client/src/App.jsx`

Layout:

```txt
Header: "Monetization" + "+ New Item" button
Filter bar: search | type | status | platform | sort
Table: Title | Type | Platform | Placements | Status | Priority | CTR | Updated | Actions
Actions: Edit | Duplicate | Publish/Unpublish | Archive
```

- [ ] **Step 1: Write MonetizationListPage**

Create `client/src/pages/admin/MonetizationListPage.jsx`:

```jsx
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Plus, Copy, Archive, Eye, EyeOff, Pencil } from 'lucide-react';
import { adminMonetizationService } from '../../services/adminMonetization';

const TYPE_LABEL = {
  youtube_video:  'YouTube',
  affiliate_link: 'Affiliate',
  sponsor_banner: 'Banner',
  ad_slot:        'Ad Slot',
  custom_cta:     'Custom CTA',
};

const STATUS_BADGE = {
  draft:      'bg-surface-3 text-ink-muted',
  scheduled:  'bg-warning/15 text-warning',
  published:  'bg-success/15 text-success',
  disabled:   'bg-error/15 text-error',
  archived:   'bg-surface-3 text-ink-subtle',
};

function FilterSelect({ label, value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-lg border border-hairline bg-surface-2 px-3 text-sm text-ink outline-none focus:border-brand-blue"
    >
      <option value="">{label}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export default function MonetizationListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', type: '', status: '', platform: '', sort: 'newest' });
  const [actionLoading, setActionLoading] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminMonetizationService.list(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
      );
      setItems(result.data.items);
      setTotal(result.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const setFilter = (key) => (val) => setFilters(f => ({ ...f, [key]: val }));

  const handleAction = async (action, item) => {
    setActionLoading(item._id + action);
    try {
      let result;
      if (action === 'publish')    result = await adminMonetizationService.publish(item._id);
      if (action === 'unpublish')  result = await adminMonetizationService.unpublish(item._id);
      if (action === 'archive')    result = await adminMonetizationService.archive(item._id);
      if (action === 'duplicate') {
        result = await adminMonetizationService.duplicate(item._id);
        if (result.success) fetchItems();
        return;
      }
      if (result?.success) {
        setItems(prev => prev.map(i => i._id === item._id ? result.data.item : i));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const ctr = (item) => {
    const imp = item.tracking?.impressionCount || 0;
    const clk = item.tracking?.clickCount || 0;
    return imp > 0 ? `${((clk / imp) * 100).toFixed(1)}%` : '—';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/15">
            <DollarSign className="h-5 w-5 text-brand-blue" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink">Monetization</h1>
            <p className="text-sm text-ink-muted">{total} items</p>
          </div>
        </div>
        <button onClick={() => navigate('/admin/monetization/new')} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
          <Plus className="h-4 w-4" /> New Item
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search by title..."
          value={filters.search}
          onChange={(e) => setFilter('search')(e.target.value)}
          className="h-9 rounded-lg border border-hairline bg-surface-2 px-3 text-sm text-ink outline-none focus:border-brand-blue min-w-[200px]"
        />
        <FilterSelect label="All Types" value={filters.type} onChange={setFilter('type')} options={Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))} />
        <FilterSelect label="All Statuses" value={filters.status} onChange={setFilter('status')} options={['draft','scheduled','published','disabled','archived'].map(s => ({ value: s, label: s }))} />
        <FilterSelect label="All Platforms" value={filters.platform} onChange={setFilter('platform')} options={['youtube','shopee','tiktok_shop','google_ads','custom'].map(s => ({ value: s, label: s }))} />
        <FilterSelect label="Sort" value={filters.sort} onChange={setFilter('sort')} options={[{value:'newest',label:'Newest'},{value:'priority',label:'Priority'},{value:'ctr',label:'CTR'}]} />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-hairline bg-surface-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline">
                {['Title','Type','Placements','Status','Priority','CTR','Updated',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-ink-muted">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-ink-muted">No items found</td></tr>
              ) : items.map(item => (
                <tr key={item._id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{item.title}</p>
                    {item.platform && <p className="text-xs text-ink-subtle mt-0.5">{item.platform}</p>}
                  </td>
                  <td className="px-4 py-3 text-ink-muted text-xs">{TYPE_LABEL[item.type] ?? item.type}</td>
                  <td className="px-4 py-3 text-ink-muted text-xs">{item.placementIds?.map(p => p.label || p.key || p).join(', ') || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[item.status] ?? ''}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{item.priority}</td>
                  <td className="px-4 py-3 text-ink-muted">{ctr(item)}</td>
                  <td className="px-4 py-3 text-ink-muted text-xs">{new Date(item.updatedAt).toLocaleDateString('vi-VN')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => navigate(`/admin/monetization/${item._id}/edit`)} className="rounded p-1.5 text-ink-muted hover:bg-surface-3 hover:text-ink" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleAction('duplicate', item)} disabled={!!actionLoading} className="rounded p-1.5 text-ink-muted hover:bg-surface-3 hover:text-ink" title="Duplicate"><Copy className="h-3.5 w-3.5" /></button>
                      {item.status === 'published'
                        ? <button onClick={() => handleAction('unpublish', item)} disabled={!!actionLoading} className="rounded p-1.5 text-warning hover:bg-warning/10" title="Unpublish"><EyeOff className="h-3.5 w-3.5" /></button>
                        : item.status !== 'archived' && <button onClick={() => handleAction('publish', item)} disabled={!!actionLoading} className="rounded p-1.5 text-success hover:bg-success/10" title="Publish"><Eye className="h-3.5 w-3.5" /></button>
                      }
                      {item.status !== 'archived' && <button onClick={() => handleAction('archive', item)} disabled={!!actionLoading} className="rounded p-1.5 text-ink-subtle hover:bg-surface-3 hover:text-ink" title="Archive"><Archive className="h-3.5 w-3.5" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Register route in App.jsx**

```jsx
import MonetizationListPage from './pages/admin/MonetizationListPage';

<Route path="monetization" element={<MonetizationListPage />} />
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/admin/MonetizationListPage.jsx client/src/App.jsx
git commit -m "feat: add monetization list page with filters and actions

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4.7: Monetization Create/Edit Page

**Files:**
- Create: `client/src/pages/admin/MonetizationEditPage.jsx`
- Create: `client/src/components/admin/monetization/ItemForm.jsx`
- Create: `client/src/components/admin/monetization/ItemPreview.jsx`
- Modify: `client/src/App.jsx`

Layout: two-column — left form (tabs: Form / JSON), right live preview + validation summary.

- [ ] **Step 1: Write ItemForm component**

Create `client/src/components/admin/monetization/ItemForm.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { adminPlacementsService } from '../../../services/adminPlacements';

const TYPES = ['youtube_video','affiliate_link','sponsor_banner','ad_slot','custom_cta'];
const PLATFORMS = ['youtube','shopee','tiktok_shop','google_ads','custom'];
const STATUSES = ['draft','scheduled','published','disabled'];

function Field({ label, children, note }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-ink mb-1.5">{label}</label>
      {children}
      {note && <p className="mt-1 text-xs text-ink-subtle">{note}</p>}
    </div>
  );
}

function Input({ value, onChange, ...rest }) {
  return (
    <input
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-lg border border-hairline bg-canvas-dark px-3 text-sm text-ink outline-none transition focus:border-brand-blue"
      {...rest}
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-lg border border-hairline bg-canvas-dark px-3 text-sm text-ink outline-none transition focus:border-brand-blue"
    >
      <option value="">— Select —</option>
      {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
    </select>
  );
}

export default function ItemForm({ data, onChange, errors = [] }) {
  const [placements, setPlacements] = useState([]);

  useEffect(() => {
    adminPlacementsService.list().then(r => {
      if (r.success) setPlacements(r.data.placements.filter(p => p.enabled));
    }).catch(() => {});
  }, []);

  const set = (field) => (val) => onChange({ ...data, [field]: val });
  const setContent = (field) => (val) => onChange({ ...data, content: { ...data.content, [field]: val } });

  const togglePlacement = (id) => {
    const ids = data.placementIds ?? [];
    onChange({ ...data, placementIds: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] });
  };

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 space-y-1">
          {errors.map((e, i) => <p key={i}>• {e}</p>)}
        </div>
      )}

      <Field label="Type">
        <Select value={data.type} onChange={set('type')} options={TYPES.map(t => ({ value: t, label: t.replace(/_/g, ' ') }))} />
      </Field>

      <Field label="Status">
        <Select value={data.status} onChange={set('status')} options={STATUSES} />
      </Field>

      <Field label="Title">
        <Input value={data.title} onChange={set('title')} placeholder="Item title" />
      </Field>

      <Field label="Description">
        <textarea
          value={data.description ?? ''}
          onChange={(e) => set('description')(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-hairline bg-canvas-dark px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-blue"
        />
      </Field>

      <Field label="Platform">
        <Select value={data.platform} onChange={set('platform')} options={PLATFORMS} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Priority">
          <Input type="number" value={data.priority ?? 0} onChange={(v) => set('priority')(Number(v))} />
        </Field>
        <Field label="Featured">
          <div className="flex h-10 items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={data.isFeatured ?? false} onChange={(e) => set('isFeatured')(e.target.checked)} className="accent-brand-blue h-4 w-4" />
              <span className="text-sm text-ink-muted">Mark as featured</span>
            </label>
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Start At">
          <Input type="datetime-local" value={data.startAt ? new Date(data.startAt).toISOString().slice(0,16) : ''} onChange={(v) => set('startAt')(v || undefined)} />
        </Field>
        <Field label="End At">
          <Input type="datetime-local" value={data.endAt ? new Date(data.endAt).toISOString().slice(0,16) : ''} onChange={(v) => set('endAt')(v || undefined)} />
        </Field>
      </div>

      {/* Type-specific content fields */}
      {data.type === 'youtube_video' && (
        <>
          <Field label="YouTube URL" note="Video ID will be parsed automatically">
            <Input value={data.content?.youtubeUrl} onChange={setContent('youtubeUrl')} placeholder="https://www.youtube.com/watch?v=..." />
          </Field>
          <Field label="Channel Name">
            <Input value={data.content?.channelName} onChange={setContent('channelName')} placeholder="Channel name" />
          </Field>
          <Field label="Thumbnail URL" note="Leave blank to use YouTube default thumbnail">
            <Input value={data.content?.thumbnailUrl} onChange={setContent('thumbnailUrl')} placeholder="https://..." />
          </Field>
        </>
      )}

      {(data.type === 'affiliate_link' || data.type === 'custom_cta') && (
        <>
          <Field label="Target URL">
            <Input value={data.content?.targetUrl} onChange={setContent('targetUrl')} placeholder="https://..." />
          </Field>
          <Field label="CTA Label">
            <Input value={data.content?.ctaLabel} onChange={setContent('ctaLabel')} placeholder="Mua ngay, Xem thêm..." />
          </Field>
          <Field label="Image URL">
            <Input value={data.content?.imageUrl} onChange={setContent('imageUrl')} placeholder="https://..." />
          </Field>
        </>
      )}

      {data.type === 'sponsor_banner' && (
        <>
          <Field label="Image URL">
            <Input value={data.content?.imageUrl} onChange={setContent('imageUrl')} placeholder="https://..." />
          </Field>
          <Field label="Target URL">
            <Input value={data.content?.targetUrl} onChange={setContent('targetUrl')} placeholder="https://..." />
          </Field>
          <Field label="CTA Label">
            <Input value={data.content?.ctaLabel} onChange={setContent('ctaLabel')} placeholder="Optional button text" />
          </Field>
        </>
      )}

      {data.type === 'ad_slot' && (
        <>
          <Field label="Ad Provider">
            <Select
              value={data.content?.providerConfig?.provider}
              onChange={(v) => onChange({ ...data, content: { ...data.content, providerConfig: { ...data.content?.providerConfig, provider: v } } })}
              options={['placeholder','google_ads','custom']}
            />
          </Field>
          <Field label="Slot ID">
            <Input
              value={data.content?.providerConfig?.slotId}
              onChange={(v) => onChange({ ...data, content: { ...data.content, providerConfig: { ...data.content?.providerConfig, slotId: v } } })}
              placeholder="ca-pub-xxx / slot-id"
            />
          </Field>
        </>
      )}

      {/* Placements */}
      <Field label="Placements">
        <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto rounded-lg border border-hairline bg-canvas-dark p-2">
          {placements.map(p => (
            <label key={p._id} className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer hover:text-ink px-1 py-0.5">
              <input type="checkbox" checked={(data.placementIds ?? []).includes(p._id)} onChange={() => togglePlacement(p._id)} className="accent-brand-blue" />
              {p.label}
            </label>
          ))}
        </div>
      </Field>
    </div>
  );
}
```

- [ ] **Step 2: Write ItemPreview component**

Create `client/src/components/admin/monetization/ItemPreview.jsx`:

```jsx
export default function ItemPreview({ data }) {
  const { type, title, content, status } = data;

  if (!type) {
    return (
      <div className="rounded-xl border border-hairline bg-surface-1 p-6 text-center text-ink-muted text-sm">
        Select a type to see preview
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Preview</span>
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-surface-3 text-ink-muted">{status || 'draft'}</span>
      </div>

      {type === 'youtube_video' && (
        <div className="rounded-xl border border-hairline bg-surface-1 overflow-hidden">
          {content?.youtubeVideoId ? (
            <div className="aspect-video bg-canvas-black">
              <img
                src={`https://img.youtube.com/vi/${content.youtubeVideoId}/hqdefault.jpg`}
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-video bg-surface-2 flex items-center justify-center text-ink-muted text-sm">
              Enter YouTube URL to see thumbnail
            </div>
          )}
          <div className="p-3">
            <p className="font-semibold text-ink text-sm">{title || 'Video title'}</p>
            {content?.channelName && <p className="text-xs text-ink-muted mt-0.5">{content.channelName}</p>}
          </div>
        </div>
      )}

      {type === 'affiliate_link' && (
        <div className="rounded-xl border border-hairline bg-surface-1 p-4 flex items-center gap-4">
          {content?.imageUrl && <img src={content.imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ink text-sm">{title || 'Affiliate link'}</p>
            {content?.targetUrl && <p className="text-xs text-ink-muted mt-0.5 truncate">{content.targetUrl}</p>}
          </div>
          {content?.ctaLabel && (
            <button className="shrink-0 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white">
              {content.ctaLabel}
            </button>
          )}
        </div>
      )}

      {type === 'sponsor_banner' && (
        <div className="rounded-xl border border-hairline bg-surface-1 overflow-hidden">
          {content?.imageUrl ? (
            <img src={content.imageUrl} alt={title} className="w-full object-cover max-h-32" />
          ) : (
            <div className="h-24 bg-surface-2 flex items-center justify-center text-ink-muted text-sm">
              Banner image preview
            </div>
          )}
        </div>
      )}

      {type === 'ad_slot' && (
        <div className="rounded-xl border border-dashed border-hairline bg-surface-1 h-24 flex items-center justify-center">
          <p className="text-sm text-ink-muted">Ad slot — {content?.providerConfig?.provider || 'placeholder'}</p>
        </div>
      )}

      {type === 'custom_cta' && (
        <div className="rounded-xl border border-hairline bg-surface-1 p-4 flex items-center justify-between">
          <p className="font-semibold text-ink text-sm">{title || 'Custom CTA'}</p>
          {content?.ctaLabel && (
            <button className="shrink-0 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white">
              {content.ctaLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write MonetizationEditPage**

Create `client/src/pages/admin/MonetizationEditPage.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Save, Eye } from 'lucide-react';
import { adminMonetizationService } from '../../services/adminMonetization';
import { validateMonetizationItemFE } from '../../utils/monetizationValidate';
import ItemForm from '../../components/admin/monetization/ItemForm';
import ItemPreview from '../../components/admin/monetization/ItemPreview';

const EMPTY = { type: '', title: '', description: '', status: 'draft', platform: '', placementIds: [], priority: 0, isFeatured: false, content: {}, affiliateLinks: [], linkedEntities: [] };

export default function MonetizationEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [data, setData] = useState(EMPTY);
  const [tab, setTab] = useState('form');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (!isNew) {
      adminMonetizationService.getById(id)
        .then(r => { if (r.success) { setData(r.data.item); setJsonText(JSON.stringify(r.data.item, null, 2)); } })
        .catch(() => navigate('/admin/monetization'))
        .finally(() => setLoading(false));
    } else {
      setJsonText(JSON.stringify(EMPTY, null, 2));
    }
  }, [id, isNew, navigate]);

  const handleSave = async () => {
    const { errors } = validateMonetizationItemFE(data);
    setValidationErrors(errors);
    if (errors.length > 0) return;

    setSaving(true);
    try {
      const result = isNew
        ? await adminMonetizationService.create(data)
        : await adminMonetizationService.update(id, data);
      if (result.success) navigate('/admin/monetization');
    } catch (err) {
      setValidationErrors([err.response?.data?.message || 'Save failed']);
    } finally {
      setSaving(false);
    }
  };

  const handleJsonApply = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setData(parsed);
      setJsonError('');
    } catch (e) {
      setJsonError('Invalid JSON: ' + e.message);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-ink-muted">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/monetization')} className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-ink">{isNew ? 'New Monetization Item' : 'Edit Item'}</h1>
        <div className="flex-1" />
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: form (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 rounded-lg border border-hairline bg-surface-1 p-1 w-fit">
            {['form','json'].map(t => (
              <button key={t} onClick={() => setTab(t)} className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === t ? 'bg-surface-2 text-ink' : 'text-ink-muted hover:text-ink'}`}>
                {t === 'form' ? 'Form' : 'JSON / Import'}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-hairline bg-surface-1 p-5">
            {tab === 'form' ? (
              <ItemForm data={data} onChange={setData} errors={validationErrors} />
            ) : (
              <div className="space-y-3">
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  rows={20}
                  className="w-full rounded-lg border border-hairline bg-canvas-dark px-3 py-2 text-xs font-mono text-ink outline-none focus:border-brand-blue"
                />
                {jsonError && <p className="text-xs text-red-400">{jsonError}</p>}
                <button onClick={handleJsonApply} className="rounded-lg border border-hairline bg-surface-2 px-3 py-1.5 text-sm text-ink hover:bg-surface-3 transition-colors">
                  Apply JSON to Form
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: preview (1/3) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
            <Eye className="h-4 w-4" />
            Live Preview
          </div>
          <ItemPreview data={data} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write frontend validator util**

Create `client/src/utils/monetizationValidate.js`:

```javascript
export function validateMonetizationItemFE(data) {
  const errors = [];
  const { type, title, placementIds, content = {}, platform } = data;
  if (!type)  errors.push('Type is required');
  if (!title) errors.push('Title is required');
  if (!placementIds || placementIds.length === 0) errors.push('At least one placement is required');
  if (type === 'youtube_video' && !content.youtubeUrl && !content.youtubeVideoId) errors.push('YouTube URL is required');
  if (type === 'affiliate_link') {
    if (!content.targetUrl) errors.push('Target URL is required');
    if (!content.ctaLabel)  errors.push('CTA label is required');
    if (!platform)          errors.push('Platform is required');
  }
  if (type === 'sponsor_banner') {
    if (!content.imageUrl)  errors.push('Image URL is required');
    if (!content.targetUrl) errors.push('Target URL is required');
  }
  if (type === 'ad_slot') {
    if (!content.providerConfig?.provider) errors.push('Ad provider is required');
    if (!content.providerConfig?.slotId)   errors.push('Slot ID is required');
  }
  if (type === 'custom_cta') {
    if (!content.ctaLabel)  errors.push('CTA label is required');
    if (!content.targetUrl) errors.push('Target URL is required');
  }
  return { valid: errors.length === 0, errors };
}
```

- [ ] **Step 5: Register routes in App.jsx**

```jsx
import MonetizationEditPage from './pages/admin/MonetizationEditPage';

<Route path="monetization/new"       element={<MonetizationEditPage />} />
<Route path="monetization/:id/edit"  element={<MonetizationEditPage />} />
```

- [ ] **Step 6: Commit**

```bash
git add \
  client/src/pages/admin/MonetizationEditPage.jsx \
  client/src/components/admin/monetization/ItemForm.jsx \
  client/src/components/admin/monetization/ItemPreview.jsx \
  client/src/utils/monetizationValidate.js \
  client/src/App.jsx
git commit -m "feat: add monetization create/edit page with form, JSON tab, and preview

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4.8: Placements Admin Page

**Files:**
- Create: `client/src/pages/admin/PlacementsPage.jsx`
- Modify: `client/src/App.jsx`

Layout: table of placements with inline enable/disable toggle and edit modal for label/limit/description.

- [ ] **Step 1: Write PlacementsPage**

Create `client/src/pages/admin/PlacementsPage.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { adminPlacementsService } from '../../services/adminPlacements';

const PAGE_LABELS = { dashboard: 'Dashboard', videos: 'Videos', player_detail: 'Chi tiết cầu thủ', database: 'Database', market: 'Market', calculator: 'Calculator' };

export default function PlacementsPage() {
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editValues, setEditValues] = useState({});

  useEffect(() => {
    adminPlacementsService.list()
      .then(r => { if (r.success) setPlacements(r.data.placements); })
      .finally(() => setLoading(false));
  }, []);

  const toggleEnabled = async (p) => {
    try {
      const result = await adminPlacementsService.update(p._id, { enabled: !p.enabled });
      if (result.success) setPlacements(prev => prev.map(x => x._id === p._id ? result.data.placement : x));
    } catch { /* ignore */ }
  };

  const saveEdit = async () => {
    try {
      const result = await adminPlacementsService.update(editing, editValues);
      if (result.success) {
        setPlacements(prev => prev.map(x => x._id === editing ? result.data.placement : x));
        setEditing(null);
      }
    } catch { /* ignore */ }
  };

  const grouped = placements.reduce((acc, p) => { (acc[p.page] = acc[p.page] || []).push(p); return acc; }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/15">
          <LayoutGrid className="h-5 w-5 text-brand-blue" />
        </div>
        <h1 className="text-xl font-semibold text-ink">Placements</h1>
      </div>

      {loading ? <p className="text-ink-muted text-sm">Loading...</p> : Object.entries(grouped).map(([page, items]) => (
        <div key={page} className="space-y-2">
          <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wider">{PAGE_LABELS[page] ?? page}</h2>
          <div className="rounded-xl border border-hairline bg-surface-1 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline">
                  {['Key', 'Label', 'Types', 'Limit', 'Enabled', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {items.map(p => (
                  <tr key={p._id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-ink-subtle">{p.key}</td>
                    <td className="px-4 py-3 text-ink font-medium">{p.label}</td>
                    <td className="px-4 py-3 text-ink-muted text-xs">{p.supportedTypes?.join(', ') || '—'}</td>
                    <td className="px-4 py-3 text-ink-muted">{p.defaultLimit}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleEnabled(p)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${p.enabled ? 'bg-brand-blue' : 'bg-surface-3'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${p.enabled ? 'translate-x-4' : 'translate-x-1'}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setEditing(p._id); setEditValues({ label: p.label, defaultLimit: p.defaultLimit, description: p.description || '' }); }}
                        className="text-xs text-ink-muted hover:text-ink underline"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-sm rounded-2xl border border-hairline bg-surface-1 p-6 space-y-4 shadow-2xl">
            <h2 className="text-base font-semibold text-ink">Edit Placement</h2>
            <div>
              <label className="block text-sm font-semibold text-ink mb-1.5">Label (Vietnamese)</label>
              <input value={editValues.label} onChange={e => setEditValues(v => ({ ...v, label: e.target.value }))} className="h-10 w-full rounded-lg border border-hairline bg-canvas-dark px-3 text-sm text-ink outline-none focus:border-brand-blue" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink mb-1.5">Default Limit</label>
              <input type="number" value={editValues.defaultLimit} onChange={e => setEditValues(v => ({ ...v, defaultLimit: Number(e.target.value) }))} className="h-10 w-full rounded-lg border border-hairline bg-canvas-dark px-3 text-sm text-ink outline-none focus:border-brand-blue" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink mb-1.5">Description</label>
              <textarea value={editValues.description} onChange={e => setEditValues(v => ({ ...v, description: e.target.value }))} rows={2} className="w-full rounded-lg border border-hairline bg-canvas-dark px-3 py-2 text-sm text-ink outline-none focus:border-brand-blue" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditing(null)} className="flex-1 rounded-lg border border-hairline bg-surface-2 py-2 text-sm font-medium text-ink hover:bg-surface-3">Cancel</button>
              <button onClick={saveEdit} className="flex-1 btn-primary py-2 text-sm font-medium">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Register route**

```jsx
import PlacementsPage from './pages/admin/PlacementsPage';
<Route path="placements" element={<PlacementsPage />} />
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/admin/PlacementsPage.jsx client/src/App.jsx
git commit -m "feat: add placements admin page

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4.9: Phase 4 Verification

- [ ] `POST /api/admin/monetization` with missing fields returns 400 with specific errors.
- [ ] YouTube URL is auto-parsed to `youtubeVideoId` on create and update.
- [ ] Item created with `status: draft` regardless of body status.
- [ ] `PATCH /api/admin/monetization/:id/publish` validates before publishing — rejects incomplete items.
- [ ] `PATCH /api/admin/monetization/:id/archive` sets `archivedAt`; subsequent PUT returns 400.
- [ ] `POST /api/admin/monetization/:id/duplicate` creates copy with `(copy)` suffix and `status: draft`.
- [ ] Placement list returns 13 seeded placements after first server start.
- [ ] Placement enable/disable toggle persists.
- [ ] List page filters by type, status, platform correctly.
- [ ] Create page saves draft and redirects to list.
- [ ] Edit page loads existing item, saves changes.
- [ ] JSON tab round-trips: edit JSON → Apply → form fields update.
- [ ] All monetization mutations create audit log entries.
- [ ] Manager without `monetization.publish` cannot call publish endpoint.

- [ ] **Commit verification pass**

```bash
git commit --allow-empty -m "chore: phase 4 verification passed

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 5: Linked Entities and Player Picker

### Task 5.1: Admin Player Search Endpoint

**Files:**
- Create: `server/src/routes/adminSearch.routes.js`
- Modify: `server/src/server.js`

**Interfaces:**
- Produces: `GET /api/admin/search/players?q=&season=&position=&limit=20`
- Returns: `[{ _id, spid, name, position, overall, seasonName, seasonId, imageUrl }]`
- Requires: `adminAuth`

- [ ] **Step 1: Write search route**

Create `server/src/routes/adminSearch.routes.js`:

```javascript
import express from 'express';
import Player from '../models/Player.js';
import { adminAuth } from '../middleware/adminAuth.js';

const router = express.Router();
router.use(adminAuth);

router.get('/players', async (req, res) => {
  try {
    const { q, season, position, limit = 20 } = req.query;
    const filter = { isActive: true };

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { searchName: { $regex: q, $options: 'i' } },
      ];
    }
    if (season)   filter.seasonId = Number(season);
    if (position) filter.position = position;

    const players = await Player.find(filter)
      .select('spid name position overall seasonName seasonId imageUrl')
      .sort({ overall: -1 })
      .limit(Math.min(Number(limit), 50));

    res.json({ success: true, data: { players } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Search failed', error: err.message });
  }
});

export default router;
```

- [ ] **Step 2: Mount in server.js**

```javascript
import adminSearchRoutes from './routes/adminSearch.routes.js';
app.use('/api/admin/search', adminSearchRoutes);
```

- [ ] **Step 3: Test**

```bash
curl "http://localhost:5000/api/admin/search/players?q=Ronaldo&limit=5" \
  -H "Cookie: connect.sid=<session>"
# Expected: array of up to 5 players matching "Ronaldo"
```

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/adminSearch.routes.js server/src/server.js
git commit -m "feat: add admin player search endpoint

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5.2: LinkedEntityPicker Component

**Files:**
- Create: `client/src/components/admin/monetization/LinkedEntityPicker.jsx`

**Interfaces:**
- Props: `linkedEntities: LinkedEntity[]`, `onChange(entities)`
- Renders: search box → player result list → selected entities with per-entity override fields

LinkedEntity shape:

```javascript
{
  entityType: 'player',
  entityId: String,        // spid as string
  displayLabel: String,    // player name
  relationType: 'primary' | 'secondary' | 'mentioned' | 'comparison',
  featuredOverride: Boolean | undefined,
  priorityOverride: Number | undefined,
  startAtOverride: Date | undefined,
  endAtOverride: Date | undefined,
}
```

- [ ] **Step 1: Write LinkedEntityPicker**

Create `client/src/components/admin/monetization/LinkedEntityPicker.jsx`:

```jsx
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import { API_BASE } from '../../../config/api';

const RELATION_TYPES = ['primary', 'secondary', 'mentioned', 'comparison'];

async function searchPlayers(q) {
  const res = await axios.get(`${API_BASE}/admin/search/players`, { params: { q, limit: 10 }, withCredentials: true });
  return res.data.data.players;
}

function EntityOverridePanel({ entity, onChange, onRemove }) {
  const [open, setOpen] = useState(false);

  const set = (field) => (val) => onChange({ ...entity, [field]: val || undefined });

  return (
    <div className="rounded-lg border border-hairline bg-canvas-dark">
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink truncate">{entity.displayLabel}</p>
          <p className="text-xs text-ink-muted">{entity.entityType} · {entity.relationType}</p>
        </div>
        <button onClick={() => setOpen(o => !o)} className="text-ink-muted hover:text-ink transition-colors">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button onClick={onRemove} className="text-ink-muted hover:text-error transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="border-t border-hairline px-3 py-3 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1">Relation Type</label>
            <select
              value={entity.relationType ?? 'primary'}
              onChange={(e) => onChange({ ...entity, relationType: e.target.value })}
              className="h-8 w-full rounded border border-hairline bg-surface-2 px-2 text-xs text-ink outline-none focus:border-brand-blue"
            >
              {RELATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">Priority Override</label>
              <input
                type="number"
                value={entity.priorityOverride ?? ''}
                onChange={(e) => onChange({ ...entity, priorityOverride: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="—"
                className="h-8 w-full rounded border border-hairline bg-surface-2 px-2 text-xs text-ink outline-none focus:border-brand-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">Featured Override</label>
              <select
                value={entity.featuredOverride === true ? 'true' : entity.featuredOverride === false ? 'false' : ''}
                onChange={(e) => onChange({ ...entity, featuredOverride: e.target.value === 'true' ? true : e.target.value === 'false' ? false : undefined })}
                className="h-8 w-full rounded border border-hairline bg-surface-2 px-2 text-xs text-ink outline-none focus:border-brand-blue"
              >
                <option value="">— inherit —</option>
                <option value="true">Featured</option>
                <option value="false">Not featured</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">Start Override</label>
              <input type="datetime-local" value={entity.startAtOverride ? new Date(entity.startAtOverride).toISOString().slice(0,16) : ''} onChange={(e) => set('startAtOverride')(e.target.value)} className="h-8 w-full rounded border border-hairline bg-surface-2 px-2 text-xs text-ink outline-none focus:border-brand-blue" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">End Override</label>
              <input type="datetime-local" value={entity.endAtOverride ? new Date(entity.endAtOverride).toISOString().slice(0,16) : ''} onChange={(e) => set('endAtOverride')(e.target.value)} className="h-8 w-full rounded border border-hairline bg-surface-2 px-2 text-xs text-ink outline-none focus:border-brand-blue" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LinkedEntityPicker({ linkedEntities = [], onChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const players = await searchPlayers(query.trim());
        setResults(players);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const addPlayer = (player) => {
    const alreadyAdded = linkedEntities.some(e => e.entityType === 'player' && e.entityId === String(player.spid));
    if (alreadyAdded) return;
    onChange([
      ...linkedEntities,
      {
        entityType: 'player',
        entityId: String(player.spid),
        displayLabel: `${player.name} (${player.seasonName || player.seasonId})`,
        relationType: 'primary',
      },
    ]);
    setQuery('');
    setResults([]);
  };

  const updateEntity = (idx, updated) => {
    const next = [...linkedEntities];
    next[idx] = updated;
    onChange(next);
  };

  const removeEntity = (idx) => {
    onChange(linkedEntities.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search players by name..."
          className="h-10 w-full rounded-lg border border-hairline bg-canvas-dark pl-9 pr-3 text-sm text-ink outline-none focus:border-brand-blue"
        />
        {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">Searching...</span>}
      </div>

      {/* Search results */}
      {results.length > 0 && (
        <div className="rounded-lg border border-hairline bg-canvas-dark divide-y divide-hairline overflow-hidden max-h-56 overflow-y-auto">
          {results.map(player => {
            const added = linkedEntities.some(e => e.entityType === 'player' && e.entityId === String(player.spid));
            return (
              <button
                key={player.spid}
                disabled={added}
                onClick={() => addPlayer(player)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${added ? 'opacity-40 cursor-not-allowed' : 'hover:bg-surface-2'}`}
              >
                {player.imageUrl && <img src={player.imageUrl} alt="" className="h-8 w-8 rounded object-cover shrink-0" />}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{player.name}</p>
                  <p className="text-xs text-ink-muted">{player.position} · OVR {player.overall} · {player.seasonName}</p>
                </div>
                {added && <span className="ml-auto text-xs text-ink-subtle shrink-0">Added</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Selected entities */}
      {linkedEntities.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">{linkedEntities.length} linked</p>
          {linkedEntities.map((entity, idx) => (
            <EntityOverridePanel
              key={`${entity.entityType}-${entity.entityId}`}
              entity={entity}
              onChange={(updated) => updateEntity(idx, updated)}
              onRemove={() => removeEntity(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Integrate into ItemForm**

In `client/src/components/admin/monetization/ItemForm.jsx`, add at bottom of form:

```jsx
import LinkedEntityPicker from './LinkedEntityPicker';

// After placements section, add:
<Field label="Linked Entities" note="Link this item to specific players. Overrides apply per entity.">
  <LinkedEntityPicker
    linkedEntities={data.linkedEntities ?? []}
    onChange={(entities) => onChange({ ...data, linkedEntities: entities })}
  />
</Field>
```

- [ ] **Step 3: Commit**

```bash
git add \
  client/src/components/admin/monetization/LinkedEntityPicker.jsx \
  client/src/components/admin/monetization/ItemForm.jsx
git commit -m "feat: add linked entity picker with per-entity overrides

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5.3: Entity-Aware Sorting in Backend

**Files:**
- Modify: `server/src/controllers/adminMonetization.controller.js`

The `getItem` response already includes `linkedEntities`. No model change needed. The entity-aware sort is implemented in the public feed (Phase 6). However, the admin detail view must expose `linkedEntities` fully, which it already does via `.lean()` / `toObject()`.

Verify only: `GET /api/admin/monetization/:id` returns `linkedEntities` array with all override fields.

- [ ] **Step 1: Smoke test**

Create an item, add two linked entities with different `priorityOverride` values, fetch the item, confirm `linkedEntities` contains both with correct overrides.

- [ ] **Step 2: Commit**

```bash
git commit --allow-empty -m "chore: verify linked entities stored and returned correctly

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5.4: Phase 5 Verification

- [ ] Player search returns results filtered by name.
- [ ] Admin player search requires auth — 401 without session.
- [ ] Adding same player twice is blocked by `alreadyAdded` check in UI.
- [ ] Per-entity `relationType`, `priorityOverride`, `featuredOverride` saved and returned from API.
- [ ] Entity override collapse/expand works in UI.
- [ ] Removing entity from picker removes it from `linkedEntities` in saved item.
- [ ] `GET /api/admin/monetization/:id` returns full `linkedEntities` array with overrides.

- [ ] **Commit verification pass**

```bash
git commit --allow-empty -m "chore: phase 5 verification passed

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 6: Public Monetization Rendering

### Task 6.1: Public Feed API

**Files:**
- Create: `server/src/controllers/publicMonetization.controller.js`
- Create: `server/src/routes/publicMonetization.routes.js`
- Modify: `server/src/server.js`

**Interfaces:**
- Produces:
  - `GET  /api/monetization/feed` — sanitized published items by placement + entity
  - `POST /api/monetization/events` — record impression event
  - `GET  /api/monetization/click/:itemId` — record click and redirect to targetUrl

Query params for feed:

```txt
placement   (required)
entityType
entityId
type
limit       (default: placement.defaultLimit)
```

Response shape — no admin metadata exposed:

```javascript
{
  success: true,
  data: {
    items: [{
      _id, type, title, platform,
      content: { youtubeVideoId, youtubeUrl, channelName, thumbnailUrl, targetUrl, imageUrl, ctaLabel },
      affiliateLinks,
      isFeatured, priority,
    }]
  }
}
```

- [ ] **Step 1: Write public feed controller**

Create `server/src/controllers/publicMonetization.controller.js`:

```javascript
import MonetizationItem from '../models/MonetizationItem.js';
import MonetizationPlacement from '../models/MonetizationPlacement.js';
import MonetizationEvent from '../models/MonetizationEvent.js';

const PUBLIC_ITEM_FIELDS = '_id type title platform content affiliateLinks isFeatured priority linkedEntities';

function isActive(item) {
  const now = new Date();
  if (item.startAt && item.startAt > now) return false;
  if (item.endAt   && item.endAt   < now) return false;
  return true;
}

function sanitizeItem(item, entityType, entityId) {
  const obj = item.toObject ? item.toObject() : { ...item };

  // Remove admin-only fields
  delete obj.status;
  delete obj.displayStrategy;
  delete obj.placementIds;
  delete obj.createdBy;
  delete obj.updatedBy;
  delete obj.publishedBy;
  delete obj.publishedAt;
  delete obj.archivedAt;
  delete obj.tracking;
  delete obj.createdAt;
  delete obj.updatedAt;
  delete obj.__v;

  // Remove provider secrets from ad_slot
  if (obj.type === 'ad_slot' && obj.content?.providerConfig) {
    const { provider, slotId, size } = obj.content.providerConfig;
    obj.content.providerConfig = { provider, slotId, size };
  }

  // Attach entity-specific override info for client sorting
  if (entityType && entityId) {
    const link = item.linkedEntities?.find(e => e.entityType === entityType && e.entityId === String(entityId));
    if (link) {
      obj._entityOverride = {
        relationType:     link.relationType,
        featuredOverride: link.featuredOverride,
        priorityOverride: link.priorityOverride,
      };
    }
  }

  delete obj.linkedEntities;
  return obj;
}

function sortItems(items, entityType, entityId) {
  return items.sort((a, b) => {
    const linkA = a.linkedEntities?.find(e => e.entityType === entityType && e.entityId === String(entityId));
    const linkB = b.linkedEntities?.find(e => e.entityType === entityType && e.entityId === String(entityId));

    // 1. featuredOverride for entity
    const feA = linkA?.featuredOverride ?? a.isFeatured;
    const feB = linkB?.featuredOverride ?? b.isFeatured;
    if (feA !== feB) return feA ? -1 : 1;

    // 2. priorityOverride for entity, fallback to item priority
    const prA = linkA?.priorityOverride ?? a.priority ?? 0;
    const prB = linkB?.priorityOverride ?? b.priority ?? 0;
    if (prA !== prB) return prB - prA;

    // 3. newest publishedAt
    return (b.publishedAt || 0) - (a.publishedAt || 0);
  });
}

export const getFeed = async (req, res) => {
  try {
    const { placement, entityType, entityId, type, limit } = req.query;

    if (!placement) {
      return res.status(400).json({ success: false, message: 'placement is required' });
    }

    // Verify placement exists and is enabled
    const placementDoc = await MonetizationPlacement.findOne({ key: placement, enabled: true });
    if (!placementDoc) {
      return res.json({ success: true, data: { items: [] } });
    }

    const maxLimit = Math.min(Number(limit) || placementDoc.defaultLimit, 50);

    const filter = {
      status: 'published',
      placementIds: placementDoc._id,
    };
    if (type) filter.type = type;

    if (entityType && entityId) {
      filter.linkedEntities = {
        $elemMatch: { entityType, entityId: String(entityId) },
      };
    }

    const items = await MonetizationItem
      .find(filter)
      .select(PUBLIC_ITEM_FIELDS + ' publishedAt linkedEntities')
      .lean();

    const active = items.filter(isActive);
    const sorted = sortItems(active, entityType, entityId);
    const limited = sorted.slice(0, maxLimit);
    const sanitized = limited.map(item => sanitizeItem(item, entityType, entityId));

    res.json({ success: true, data: { items: sanitized } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Feed error', error: err.message });
  }
};

export const recordEvent = async (req, res) => {
  try {
    const { itemId, placementKey, eventType, entityType, entityId, sessionId } = req.body;
    if (!itemId || !placementKey || !eventType) {
      return res.status(400).json({ success: false, message: 'itemId, placementKey, eventType required' });
    }

    // Dedupe impressions by sessionId
    if (eventType === 'impression' && sessionId) {
      const already = await MonetizationEvent.exists({ itemId, eventType: 'impression', sessionId, placementKey });
      if (already) return res.json({ success: true, message: 'Duplicate impression ignored' });
    }

    await MonetizationEvent.create({
      itemId, placementKey, eventType, entityType, entityId, sessionId,
      userAgent: req.headers['user-agent'],
      referrer: req.headers['referer'],
    });

    // Increment counter on item
    const inc = eventType === 'impression' ? { 'tracking.impressionCount': 1 } : { 'tracking.clickCount': 1, 'tracking.lastClickedAt': new Date() };
    await MonetizationItem.findByIdAndUpdate(itemId, { $inc: inc });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Event error', error: err.message });
  }
};

export const recordClick = async (req, res) => {
  try {
    const item = await MonetizationItem.findById(req.params.itemId).select('status content type affiliateLinks');
    if (!item || item.status !== 'published') {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Record click event
    await MonetizationEvent.create({
      itemId: item._id,
      placementKey: req.query.placement || 'unknown',
      eventType: 'click',
      entityType: req.query.entityType,
      entityId: req.query.entityId,
      sessionId: req.query.sessionId,
      userAgent: req.headers['user-agent'],
    });

    await MonetizationItem.findByIdAndUpdate(item._id, {
      $inc: { 'tracking.clickCount': 1 },
      $set: { 'tracking.lastClickedAt': new Date() },
    });

    const targetUrl = item.content?.targetUrl || item.affiliateLinks?.[0]?.url;
    if (!targetUrl) return res.status(400).json({ success: false, message: 'No target URL' });

    res.redirect(302, targetUrl);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Click tracking error', error: err.message });
  }
};
```

- [ ] **Step 2: Write public routes**

Create `server/src/routes/publicMonetization.routes.js`:

```javascript
import express from 'express';
import { getFeed, recordEvent, recordClick } from '../controllers/publicMonetization.controller.js';

const router = express.Router();

router.get('/feed',         getFeed);
router.post('/events',      recordEvent);
router.get('/click/:itemId', recordClick);

export default router;
```

- [ ] **Step 3: Mount in server.js**

```javascript
import publicMonetizationRoutes from './routes/publicMonetization.routes.js';
app.use('/api/monetization', publicMonetizationRoutes);
```

- [ ] **Step 4: Test**

```bash
# Feed without entity context
curl "http://localhost:5000/api/monetization/feed?placement=videos_top"
# Expected: array of published items for that placement

# Feed with entity context
curl "http://localhost:5000/api/monetization/feed?placement=player_detail_featured&entityType=player&entityId=<spid>"
# Expected: items linked to that player, sorted by featured/priority override

# Impression event
curl -X POST http://localhost:5000/api/monetization/events \
  -H "Content-Type: application/json" \
  -d '{"itemId":"<id>","placementKey":"videos_top","eventType":"impression","sessionId":"test-session-1"}'

# Duplicate impression same session — should return "Duplicate impression ignored"

# Click redirect
curl -v "http://localhost:5000/api/monetization/click/<id>?placement=videos_top"
# Expected: 302 redirect to item targetUrl
```

- [ ] **Step 5: Commit**

```bash
git add \
  server/src/controllers/publicMonetization.controller.js \
  server/src/routes/publicMonetization.routes.js \
  server/src/server.js
git commit -m "feat: add public monetization feed, events, and click redirect APIs

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6.2: MonetizationSlot Component

**Files:**
- Create: `client/src/components/monetization/MonetizationSlot.jsx`
- Create: `client/src/components/monetization/renderers/YouTubeCard.jsx`
- Create: `client/src/components/monetization/renderers/AffiliateCtaCard.jsx`
- Create: `client/src/components/monetization/renderers/SponsorBanner.jsx`
- Create: `client/src/components/monetization/renderers/AdSlotPlaceholder.jsx`
- Create: `client/src/hooks/useMonetizationFeed.js`

**Interfaces:**

```jsx
<MonetizationSlot
  placement="player_detail_featured"
  entity={{ type: 'player', id: playerId }}
  limit={1}
/>
```

- [ ] **Step 1: Write useMonetizationFeed hook**

Create `client/src/hooks/useMonetizationFeed.js`:

```javascript
import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/api';

export function useMonetizationFeed({ placement, entity, type, limit }) {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!placement) { setLoading(false); return; }

    const params = { placement };
    if (entity?.type) params.entityType = entity.type;
    if (entity?.id)   params.entityId   = entity.id;
    if (type)         params.type       = type;
    if (limit)        params.limit      = limit;

    setLoading(true);
    axios.get(`${API_BASE}/monetization/feed`, { params })
      .then(r => setItems(r.data?.data?.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [placement, entity?.type, entity?.id, type, limit]);

  return { items, loading };
}
```

- [ ] **Step 2: Write impression tracking util**

Create `client/src/utils/monetizationTracking.js`:

```javascript
import axios from 'axios';
import { API_BASE } from '../config/api';

// Session ID — stable for this browser session
let _sessionId = sessionStorage.getItem('fco_session_id');
if (!_sessionId) {
  _sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  sessionStorage.setItem('fco_session_id', _sessionId);
}

export const SESSION_ID = _sessionId;

export function trackImpression(itemId, placementKey, entityType, entityId) {
  axios.post(`${API_BASE}/monetization/events`, {
    itemId, placementKey, eventType: 'impression',
    entityType, entityId, sessionId: SESSION_ID,
  }).catch(() => {}); // silently fail
}

export function getClickUrl(itemId, placementKey, entityType, entityId) {
  const params = new URLSearchParams({ placement: placementKey });
  if (entityType) params.set('entityType', entityType);
  if (entityId)   params.set('entityId', entityId);
  params.set('sessionId', SESSION_ID);
  return `${API_BASE}/monetization/click/${itemId}?${params}`;
}
```

- [ ] **Step 3: Write renderers**

Create `client/src/components/monetization/renderers/YouTubeCard.jsx`:

```jsx
import { useEffect, useRef } from 'react';
import { Play } from 'lucide-react';
import { trackImpression } from '../../../utils/monetizationTracking';

export default function YouTubeCard({ item, placement, entity, featured = false }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      trackImpression(item._id, placement, entity?.type, entity?.id);
    }
  }, [item._id, placement, entity]);

  const thumbnailUrl = item.content?.thumbnailUrl
    || (item.content?.youtubeVideoId ? `https://img.youtube.com/vi/${item.content.youtubeVideoId}/hqdefault.jpg` : null);

  const youtubeUrl = item.content?.youtubeUrl
    || (item.content?.youtubeVideoId ? `https://www.youtube.com/watch?v=${item.content.youtubeVideoId}` : '#');

  return (
    <a
      href={youtubeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block rounded-xl overflow-hidden border border-hairline bg-surface-1 hover:border-brand-blue/40 transition-colors ${featured ? 'w-full' : ''}`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-surface-2 overflow-hidden">
        {thumbnailUrl && (
          <img src={thumbnailUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm group-hover:bg-brand-blue/80 transition-colors">
            <Play className="h-5 w-5 text-white fill-white" />
          </div>
        </div>
      </div>
      {/* Info */}
      <div className="p-3">
        <p className="font-semibold text-ink text-sm line-clamp-2 group-hover:text-brand-blue transition-colors">{item.title}</p>
        {item.content?.channelName && <p className="text-xs text-ink-muted mt-1">{item.content.channelName}</p>}
      </div>
    </a>
  );
}
```

Create `client/src/components/monetization/renderers/AffiliateCtaCard.jsx`:

```jsx
import { useEffect, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { trackImpression, getClickUrl } from '../../../utils/monetizationTracking';

export default function AffiliateCtaCard({ item, placement, entity }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      trackImpression(item._id, placement, entity?.type, entity?.id);
    }
  }, [item._id, placement, entity]);

  const clickUrl = getClickUrl(item._id, placement, entity?.type, entity?.id);
  const links = item.affiliateLinks?.filter(l => l.status !== 'disabled') ?? [];

  return (
    <div className="rounded-xl border border-hairline bg-surface-1 p-4 space-y-3">
      {item.content?.imageUrl && (
        <img src={item.content.imageUrl} alt={item.title} className="w-full h-24 object-cover rounded-lg" />
      )}
      <div>
        <p className="font-semibold text-ink text-sm">{item.title}</p>
        <p className="text-xs text-ink-muted mt-0.5 italic">Có thể chứa link affiliate.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {links.length > 0 ? links.map((link, i) => (
          <a key={i} href={link.url} target="_blank" rel="noopener noreferrer sponsored"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-blue-dark transition-colors"
          >
            {link.label} <ExternalLink className="h-3 w-3" />
          </a>
        )) : (
          <a href={clickUrl} rel="noopener noreferrer sponsored"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-blue-dark transition-colors"
          >
            {item.content?.ctaLabel || 'Xem ngay'} <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}
```

Create `client/src/components/monetization/renderers/SponsorBanner.jsx`:

```jsx
import { useEffect, useRef } from 'react';
import { trackImpression, getClickUrl } from '../../../utils/monetizationTracking';

export default function SponsorBanner({ item, placement, entity }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      trackImpression(item._id, placement, entity?.type, entity?.id);
    }
  }, [item._id, placement, entity]);

  const clickUrl = getClickUrl(item._id, placement, entity?.type, entity?.id);

  return (
    <a href={clickUrl} rel="noopener noreferrer sponsored" className="block rounded-xl overflow-hidden border border-hairline hover:opacity-90 transition-opacity">
      {item.content?.imageUrl
        ? <img src={item.content.imageUrl} alt={item.title} className="w-full object-cover" />
        : <div className="h-20 bg-surface-2 flex items-center justify-center text-sm text-ink-muted">{item.title}</div>
      }
    </a>
  );
}
```

Create `client/src/components/monetization/renderers/AdSlotPlaceholder.jsx`:

```jsx
export default function AdSlotPlaceholder({ item }) {
  // Placeholder only — GoogleAdSlot added in Phase 9
  if (item.content?.providerConfig?.provider === 'placeholder') {
    return (
      <div className="rounded-xl border border-dashed border-hairline bg-surface-1/50 h-20 flex items-center justify-center">
        <span className="text-xs text-ink-subtle">[Ad slot — {item.title}]</span>
      </div>
    );
  }
  return null; // Real ad providers handled in Phase 9
}
```

- [ ] **Step 4: Write MonetizationSlot**

Create `client/src/components/monetization/MonetizationSlot.jsx`:

```jsx
import { useMonetizationFeed } from '../../hooks/useMonetizationFeed';
import YouTubeCard from './renderers/YouTubeCard';
import AffiliateCtaCard from './renderers/AffiliateCtaCard';
import SponsorBanner from './renderers/SponsorBanner';
import AdSlotPlaceholder from './renderers/AdSlotPlaceholder';

function renderItem(item, placement, entity) {
  const props = { item, placement, entity, key: item._id };
  switch (item.type) {
    case 'youtube_video':   return <YouTubeCard {...props} featured={item._entityOverride?.featuredOverride ?? item.isFeatured} />;
    case 'affiliate_link':  return <AffiliateCtaCard {...props} />;
    case 'sponsor_banner':  return <SponsorBanner {...props} />;
    case 'ad_slot':         return <AdSlotPlaceholder {...props} />;
    case 'custom_cta':      return <AffiliateCtaCard {...props} />;
    default:                return null;
  }
}

export default function MonetizationSlot({ placement, entity, limit, className = '' }) {
  const { items, loading } = useMonetizationFeed({ placement, entity, limit });

  if (loading) return null; // No skeleton — graceful empty
  if (!items.length) return null;

  return (
    <div className={className}>
      {items.map(item => renderItem(item, placement, entity))}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add \
  client/src/hooks/useMonetizationFeed.js \
  client/src/utils/monetizationTracking.js \
  client/src/components/monetization/MonetizationSlot.jsx \
  client/src/components/monetization/renderers/YouTubeCard.jsx \
  client/src/components/monetization/renderers/AffiliateCtaCard.jsx \
  client/src/components/monetization/renderers/SponsorBanner.jsx \
  client/src/components/monetization/renderers/AdSlotPlaceholder.jsx
git commit -m "feat: add MonetizationSlot component and public renderers

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6.3: Integrate MonetizationSlot into Public Pages

**Files:**
- Modify: `client/src/pages/VideosPage.jsx`
- Modify: `client/src/pages/PlayerDetailPage.jsx`

Integrate placement slots as a first rollout. Other pages (Dashboard, Database, Market, Calculator) follow the same pattern.

- [ ] **Step 1: Add slots to VideosPage**

In `client/src/pages/VideosPage.jsx`, import and place:

```jsx
import MonetizationSlot from '../components/monetization/MonetizationSlot';

// Above the videos grid, add:
<MonetizationSlot placement="videos_top" limit={1} className="mb-6" />

// At end of grid (or inline after every N items):
<MonetizationSlot placement="videos_grid" limit={12} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" />
```

- [ ] **Step 2: Add slots to PlayerDetailPage**

In `client/src/pages/PlayerDetailPage.jsx`, get `player.spid` from loaded player data and:

```jsx
import MonetizationSlot from '../components/monetization/MonetizationSlot';

const entity = player ? { type: 'player', id: String(player.spid) } : null;

// Featured video slot (above stats):
{entity && (
  <MonetizationSlot
    placement="player_detail_featured"
    entity={entity}
    limit={1}
    className="mb-6"
  />
)}

// Related videos slot (below stats):
{entity && (
  <MonetizationSlot
    placement="player_detail_related"
    entity={entity}
    limit={4}
    className="grid grid-cols-1 gap-3 sm:grid-cols-2"
  />
)}

// Affiliate CTAs:
{entity && (
  <MonetizationSlot
    placement="player_detail_affiliate"
    entity={entity}
    limit={3}
    className="space-y-3"
  />
)}
```

- [ ] **Step 3: Test**

Publish a YouTube video item linked to a player on `player_detail_featured`. Navigate to that player's detail page. Verify the video card renders. Verify impression event created in MongoDB.

Click the video — verify click event created and `tracking.clickCount` incremented.

Navigate to a different player — verify the item does NOT appear (entity filter working).

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/VideosPage.jsx client/src/pages/PlayerDetailPage.jsx
git commit -m "feat: integrate MonetizationSlot into Videos and PlayerDetail pages

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6.4: Phase 6 Verification

- [ ] `GET /api/monetization/feed?placement=videos_top` returns only `published` items.
- [ ] Draft/disabled/archived items never appear in feed.
- [ ] Items outside `startAt/endAt` window excluded.
- [ ] Entity filter: passing `entityType=player&entityId=X` only returns items linked to player X.
- [ ] Entity sort: item with `featuredOverride=true` for the requested entity ranks first.
- [ ] `POST /api/monetization/events` with same `sessionId` + `itemId` + `impression` a second time returns "Duplicate impression ignored".
- [ ] `GET /api/monetization/click/:id` increments `tracking.clickCount` and redirects.
- [ ] Public feed response contains no `status`, `createdBy`, `publishedBy`, `tracking`, or `placementIds` fields.
- [ ] Player detail page renders featured video slot for linked players and nothing for unlinked players.

- [ ] **Commit verification pass**

```bash
git commit --allow-empty -m "chore: phase 6 verification passed

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 7: Data Ops Migration

### Task 7.1: Protect Existing Data-Ops Endpoints

**Files:**
- Modify: `server/src/routes/enrichment.routes.js`
- Modify: `server/src/routes/player.routes.js`

Replace `requireAdminSync` with `adminAuth` + `requirePermission('dataOps.run')` on write/mutation endpoints. Keep public read endpoints (`/status`, `/seasons`) open.

- [ ] **Step 1: Update enrichment routes**

In `server/src/routes/enrichment.routes.js`:

```javascript
import { adminAuth, requirePermission } from '../middleware/adminAuth.js';

// Replace:  router.post('/fifaaddict/...', requireAdminSync, ...)
// With:     router.post('/fifaaddict/...', adminAuth, requirePermission('dataOps.run'), ...)

// Read-only routes remain public:
router.get('/status', getEnrichmentStatus);
router.get('/fifaaddict/seasons', listSeasons);
```

Apply this pattern to all POST routes in enrichment.routes.js.

- [ ] **Step 2: Update player sync route**

In `server/src/routes/player.routes.js`:

```javascript
import { adminAuth, requirePermission } from '../middleware/adminAuth.js';

// Replace:  router.post('/sync-nexon', requireAdminSync, syncPlayersFromNexon);
// With:
router.post('/sync-nexon', adminAuth, requirePermission('dataOps.run'), syncPlayersFromNexon);
```

- [ ] **Step 3: Add audit logging to data-ops**

In each enrichment controller action that is now admin-protected, add after the action starts:

```javascript
import { createAuditLog } from '../services/auditLog.js';

// At top of each protected controller function:
await createAuditLog({
  actorUserId: req.session?.adminUser?.id,
  actorEmail:  req.session?.adminUser?.email,
  action: 'dataOps.run',
  resourceType: 'DataOps',
  after: { endpoint: req.path, body: req.body },
  req,
});
```

- [ ] **Step 4: Test**

```bash
# Without admin session — should get 401 now (previously 403 with wrong token)
curl -X POST http://localhost:5000/api/enrichment/fifaaddict/sync
# Expected: 401

# With admin session + dataOps.run permission
curl -X POST http://localhost:5000/api/enrichment/fifaaddict/sync \
  -H "Cookie: connect.sid=<session>"
# Expected: starts sync (or rate-limited)

# Public status still works without auth
curl http://localhost:5000/api/enrichment/status
# Expected: 200 with status data
```

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/enrichment.routes.js server/src/routes/player.routes.js
git commit -m "feat: protect data-ops endpoints with adminAuth + dataOps.run permission

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7.2: Admin Data Ops Page

**Files:**
- Create: `client/src/pages/admin/DataOpsPage.jsx`
- Modify: `client/src/App.jsx`

This page replaces the public Settings admin token UI. It mirrors the existing `DataOpsView` functionality but calls endpoints using the admin session cookie (no token needed) and is protected by `dataOps.view`.

- [ ] **Step 1: Write DataOpsPage**

Create `client/src/pages/admin/DataOpsPage.jsx`:

```jsx
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Database, RefreshCw, Play } from 'lucide-react';
import { API_BASE } from '../../config/api';

const api = axios.create({ baseURL: API_BASE, withCredentials: true });

async function fetchStatus() {
  const [enr, players] = await Promise.all([
    api.get('/enrichment/status').then(r => r.data.data),
    api.get('/players/meta').then(r => r.data).catch(() => null),
  ]);
  return { enrichment: enr, players };
}

const ACTIONS = [
  { key: 'sync-nexon',       label: 'Sync Nexon Metadata',       path: '/players/sync-nexon',                 body: { limit: 90000 }, confirm: true },
  { key: 'sync-full',        label: 'FIFAAddict Full Sync',       path: '/enrichment/fifaaddict/sync-full',    body: {},               confirm: true },
  { key: 'sync',             label: 'FIFAAddict Incremental Sync',path: '/enrichment/fifaaddict/sync',         body: {},               confirm: false },
  { key: 'resync',           label: 'FIFAAddict Resync Failed',   path: '/enrichment/fifaaddict/resync',       body: {},               confirm: false },
  { key: 'discover-hybrid',  label: 'FIFAAddict Discover Hybrid', path: '/enrichment/fifaaddict/discover-hybrid', body: {},            confirm: true },
  { key: 'scrape-seasons',   label: 'Scrape Seasons',             path: '/enrichment/fifaaddict/scrape-seasons',  body: {},            confirm: true },
];

export default function DataOpsPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});
  const [log, setLog] = useState([]);
  const pollRef = useRef(null);

  const load = async () => {
    try { setStatus(await fetchStatus()); } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 8000);
    return () => clearInterval(pollRef.current);
  }, []);

  const addLog = (msg, ok = true) => setLog(prev => [{ msg, ok, ts: new Date().toLocaleTimeString('vi-VN') }, ...prev].slice(0, 30));

  const run = async (action) => {
    if (action.confirm && !confirm(`Run "${action.label}"?`)) return;
    setBusy(b => ({ ...b, [action.key]: true }));
    try {
      const res = await api.post(action.path, action.body);
      addLog(`✓ ${action.label}: ${res.data.message || 'started'}`, true);
      setTimeout(load, 2000);
    } catch (e) {
      addLog(`✗ ${action.label}: ${e.response?.data?.message || e.message}`, false);
    } finally {
      setBusy(b => ({ ...b, [action.key]: false }));
    }
  };

  const enr = status?.enrichment;
  const pl  = status?.players;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/15">
            <Database className="h-5 w-5 text-brand-blue" />
          </div>
          <h1 className="text-xl font-semibold text-ink">Data Ops</h1>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 rounded-lg border border-hairline bg-surface-2 px-3 py-1.5 text-sm text-ink-muted hover:text-ink hover:bg-surface-3 transition-colors">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Status tiles */}
      {loading ? <p className="text-ink-muted text-sm">Loading status...</p> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Players', value: pl?.total?.toLocaleString() ?? '—' },
            { label: 'Enriched', value: enr?.enriched?.toLocaleString() ?? '—' },
            { label: 'Pending', value: enr?.pending?.toLocaleString() ?? '—' },
            { label: 'Failed', value: enr?.failed?.toLocaleString() ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-hairline bg-surface-1 p-4">
              <p className="text-2xl font-semibold text-ink">{value}</p>
              <p className="text-xs text-ink-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="rounded-xl border border-hairline bg-surface-1 divide-y divide-hairline overflow-hidden">
        <div className="px-5 py-3 text-sm font-semibold text-ink-muted uppercase tracking-wider">Actions</div>
        {ACTIONS.map(action => (
          <div key={action.key} className="flex items-center justify-between px-5 py-3">
            <div>
              <p className="text-sm font-medium text-ink">{action.label}</p>
              {action.confirm && <p className="text-xs text-ink-muted">Requires confirmation</p>}
            </div>
            <button
              onClick={() => run(action)}
              disabled={busy[action.key]}
              className="flex items-center gap-1.5 rounded-lg bg-brand-blue/10 border border-brand-blue/30 px-3 py-1.5 text-sm font-medium text-brand-blue hover:bg-brand-blue/20 transition-colors disabled:opacity-50"
            >
              {busy[action.key]
                ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                : <Play className="h-3.5 w-3.5" />
              }
              {busy[action.key] ? 'Running...' : 'Run'}
            </button>
          </div>
        ))}
      </div>

      {/* Action log */}
      {log.length > 0 && (
        <div className="rounded-xl border border-hairline bg-surface-1 overflow-hidden">
          <div className="px-5 py-3 text-sm font-semibold text-ink-muted uppercase tracking-wider">Log</div>
          <div className="divide-y divide-hairline max-h-56 overflow-y-auto">
            {log.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-2">
                <span className="text-xs text-ink-subtle shrink-0">{entry.ts}</span>
                <span className={`text-xs ${entry.ok ? 'text-ink' : 'text-error'}`}>{entry.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Register route**

```jsx
import DataOpsPage from './pages/admin/DataOpsPage';
<Route path="data-ops" element={<DataOpsPage />} />
```

- [ ] **Step 3: Remove admin token from public Settings**

In `client/src/pages/SettingsPage.jsx` and `client/src/fco/views/DataOpsView.jsx`, remove:
- Admin sync token input field
- `saveToken` function
- Any `localStorage` read of `fco-admin-sync-token`
- Any `adminHeaders` usage for protected endpoints

Keep dark mode toggle and other non-admin settings in SettingsPage.

- [ ] **Step 4: Commit**

```bash
git add \
  client/src/pages/admin/DataOpsPage.jsx \
  client/src/pages/SettingsPage.jsx \
  client/src/fco/views/DataOpsView.jsx \
  client/src/App.jsx
git commit -m "feat: add admin data ops page; remove public admin token flow from Settings

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7.3: Phase 7 Verification

- [ ] `POST /api/enrichment/fifaaddict/sync` without session returns 401.
- [ ] Manager without `dataOps.run` permission gets 403.
- [ ] Manager with `dataOps.run` can trigger sync.
- [ ] `GET /api/enrichment/status` still returns 200 without auth.
- [ ] Audit log entry `dataOps.run` created per action.
- [ ] Public Settings page no longer shows admin token input.
- [ ] DataOpsPage renders status tiles and action list.
- [ ] Running action from DataOpsPage calls correct endpoint with session cookie.

- [ ] **Commit verification pass**

```bash
git commit --allow-empty -m "chore: phase 7 verification passed

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 8: Analytics

### Task 8.1: Analytics Aggregation API

**Files:**
- Create: `server/src/controllers/adminAnalytics.controller.js`
- Create: `server/src/routes/adminAnalytics.routes.js`
- Modify: `server/src/server.js`

**Interfaces:**
- Produces: `GET /api/admin/analytics/summary` — total impressions, clicks, CTR, top items, top placements, top entities
- Query params: `from`, `to`, `placement`, `platform`, `type`, `entityType`

- [ ] **Step 1: Write analytics controller**

Create `server/src/controllers/adminAnalytics.controller.js`:

```javascript
import MonetizationEvent from '../models/MonetizationEvent.js';
import MonetizationItem from '../models/MonetizationItem.js';

export const getSummary = async (req, res) => {
  try {
    const { from, to, placement, platform, type } = req.query;

    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to)   dateFilter.$lte = new Date(to);

    const eventFilter = {};
    if (Object.keys(dateFilter).length) eventFilter.createdAt = dateFilter;
    if (placement) eventFilter.placementKey = placement;

    // Totals
    const [impressions, clicks] = await Promise.all([
      MonetizationEvent.countDocuments({ ...eventFilter, eventType: 'impression' }),
      MonetizationEvent.countDocuments({ ...eventFilter, eventType: 'click' }),
    ]);

    // Top items by clicks
    const topItemsRaw = await MonetizationEvent.aggregate([
      { $match: { ...eventFilter, eventType: 'click' } },
      { $group: { _id: '$itemId', clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'monetizationitems', localField: '_id', foreignField: '_id', as: 'item' } },
      { $unwind: '$item' },
      { $project: { _id: 1, clicks: 1, title: '$item.title', type: '$item.type', platform: '$item.platform' } },
    ]);

    // Filter by item-level type/platform if requested
    const itemFilter = {};
    if (type)     itemFilter.type = type;
    if (platform) itemFilter.platform = platform;
    const topItems = Object.keys(itemFilter).length
      ? topItemsRaw.filter(i => Object.entries(itemFilter).every(([k, v]) => i[k] === v))
      : topItemsRaw;

    // Top placements by clicks
    const topPlacements = await MonetizationEvent.aggregate([
      { $match: { ...eventFilter, eventType: 'click' } },
      { $group: { _id: '$placementKey', clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      { $limit: 10 },
    ]);

    // Top entities by clicks
    const topEntities = await MonetizationEvent.aggregate([
      { $match: { ...eventFilter, eventType: 'click', entityId: { $exists: true, $ne: null } } },
      { $group: { _id: { entityType: '$entityType', entityId: '$entityId' }, clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      { $limit: 10 },
    ]);

    // CTR over time (daily, last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dailyFilter = { ...eventFilter, createdAt: { $gte: from ? new Date(from) : thirtyDaysAgo } };

    const dailyEvents = await MonetizationEvent.aggregate([
      { $match: dailyFilter },
      { $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          eventType: '$eventType',
        },
        count: { $sum: 1 },
      }},
      { $sort: { '_id.date': 1 } },
    ]);

    // Reshape daily data
    const dailyMap = {};
    for (const row of dailyEvents) {
      const d = row._id.date;
      if (!dailyMap[d]) dailyMap[d] = { date: d, impressions: 0, clicks: 0 };
      dailyMap[d][row._id.eventType === 'impression' ? 'impressions' : 'clicks'] = row.count;
    }
    const dailyCtr = Object.values(dailyMap).map(d => ({
      ...d,
      ctr: d.impressions > 0 ? +((d.clicks / d.impressions) * 100).toFixed(2) : 0,
    }));

    const ctr = impressions > 0 ? +((clicks / impressions) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: { impressions, clicks, ctr, topItems, topPlacements, topEntities, dailyCtr },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Analytics error', error: err.message });
  }
};
```

- [ ] **Step 2: Write analytics routes**

Create `server/src/routes/adminAnalytics.routes.js`:

```javascript
import express from 'express';
import { getSummary } from '../controllers/adminAnalytics.controller.js';
import { adminAuth, requirePermission } from '../middleware/adminAuth.js';

const router = express.Router();
router.use(adminAuth);
router.get('/summary', requirePermission('analytics.view'), getSummary);

export default router;
```

- [ ] **Step 3: Mount**

```javascript
import adminAnalyticsRoutes from './routes/adminAnalytics.routes.js';
app.use('/api/admin/analytics', adminAnalyticsRoutes);
```

- [ ] **Step 4: Commit**

```bash
git add \
  server/src/controllers/adminAnalytics.controller.js \
  server/src/routes/adminAnalytics.routes.js \
  server/src/server.js
git commit -m "feat: add analytics aggregation API

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8.2: Analytics Page

**Files:**
- Create: `client/src/pages/admin/AnalyticsPage.jsx`
- Modify: `client/src/App.jsx`

Layout: summary cards → daily CTR line chart (recharts) → top items table → top placements → top entities. Date range filter.

- [ ] **Step 1: Write AnalyticsPage**

Create `client/src/pages/admin/AnalyticsPage.jsx`:

```jsx
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { BarChart2, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_BASE } from '../../config/api';

const api = axios.create({ baseURL: `${API_BASE}/admin/analytics`, withCredentials: true });

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface-1 p-5">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-subtle">{sub}</p>}
    </div>
  );
}

function TopTable({ title, rows, labelKey, valueKey, valueLabel = 'Clicks' }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface-1 overflow-hidden">
      <div className="px-5 py-3 border-b border-hairline">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-hairline">
            <th className="px-4 py-2 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">#</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Name</th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-ink-muted uppercase tracking-wider">{valueLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {rows.length === 0 ? (
            <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-ink-muted">No data</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i} className="hover:bg-surface-2 transition-colors">
              <td className="px-4 py-2.5 text-ink-subtle text-xs">{i + 1}</td>
              <td className="px-4 py-2.5 text-ink text-xs truncate max-w-[200px]">{row[labelKey]}</td>
              <td className="px-4 py-2.5 text-ink text-right font-medium">{row[valueKey]?.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/summary', { params: { from, to } });
      if (res.data.success) setData(res.data.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/15">
            <BarChart2 className="h-5 w-5 text-brand-blue" />
          </div>
          <h1 className="text-xl font-semibold text-ink">Analytics</h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-9 rounded-lg border border-hairline bg-surface-2 px-3 text-ink outline-none focus:border-brand-blue" />
          <span className="text-ink-muted">–</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-9 rounded-lg border border-hairline bg-surface-2 px-3 text-ink outline-none focus:border-brand-blue" />
        </div>
      </div>

      {loading ? <p className="text-ink-muted text-sm">Loading analytics...</p> : data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Total Impressions" value={data.impressions.toLocaleString()} />
            <StatCard label="Total Clicks" value={data.clicks.toLocaleString()} />
            <StatCard label="CTR" value={`${data.ctr}%`} sub="Click-through rate" />
          </div>

          {/* Daily CTR chart */}
          {data.dailyCtr.length > 0 && (
            <div className="rounded-xl border border-hairline bg-surface-1 p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-brand-blue" />
                <h3 className="text-sm font-semibold text-ink">Daily CTR</h3>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.dailyCtr}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ background: '#1c1c1c', border: '1px solid #262626', borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [`${v}%`, 'CTR']}
                  />
                  <Line type="monotone" dataKey="ctr" stroke="#1d9bf0" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top tables */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <TopTable title="Top Items by Clicks" rows={data.topItems} labelKey="title" valueKey="clicks" />
            <TopTable title="Top Placements" rows={data.topPlacements} labelKey="_id" valueKey="clicks" />
            <TopTable
              title="Top Entities"
              rows={data.topEntities.map(e => ({ label: `${e._id.entityType}:${e._id.entityId}`, clicks: e.clicks }))}
              labelKey="label"
              valueKey="clicks"
            />
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Register route and update AdminOverviewPage**

```jsx
import AnalyticsPage from './pages/admin/AnalyticsPage';
<Route path="analytics" element={<AnalyticsPage />} />
```

In `AdminOverviewPage.jsx`, replace stat placeholder cards with real data by calling `GET /api/admin/analytics/summary` without date filters:

```jsx
// Replace placeholder StatCards with:
const [summary, setSummary] = useState(null);
useEffect(() => {
  axios.get(`${API_BASE}/admin/analytics/summary`, { withCredentials: true })
    .then(r => { if (r.data.success) setSummary(r.data.data); })
    .catch(() => {});
}, []);

<StatCard label="Total Impressions" value={summary?.impressions.toLocaleString() ?? '—'} />
<StatCard label="Total Clicks" value={summary?.clicks.toLocaleString() ?? '—'} />
<StatCard label="CTR" value={summary ? `${summary.ctr}%` : '—'} />
<StatCard label="Active Placements" value="—" note="See Placements" />
```

- [ ] **Step 3: Commit**

```bash
git add \
  client/src/pages/admin/AnalyticsPage.jsx \
  client/src/pages/admin/AdminOverviewPage.jsx \
  client/src/App.jsx
git commit -m "feat: add analytics page with summary cards, CTR chart, and top tables

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8.3: Audit Log Page

**Files:**
- Create: `server/src/routes/adminAuditLog.routes.js`
- Create: `client/src/pages/admin/AuditLogPage.jsx`
- Modify: `server/src/server.js`, `client/src/App.jsx`

- [ ] **Step 1: Write audit log API**

Create `server/src/routes/adminAuditLog.routes.js`:

```javascript
import express from 'express';
import AuditLog from '../models/AuditLog.js';
import { adminAuth, requirePermission } from '../middleware/adminAuth.js';

const router = express.Router();
router.use(adminAuth);

router.get('/', requirePermission('auditLog.view'), async (req, res) => {
  try {
    const { action, actorEmail, resourceType, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (action)       filter.action = { $regex: action, $options: 'i' };
    if (actorEmail)   filter.actorEmail = { $regex: actorEmail, $options: 'i' };
    if (resourceType) filter.resourceType = resourceType;

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      AuditLog.countDocuments(filter),
    ]);
    res.json({ success: true, data: { logs, total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching audit log', error: err.message });
  }
});

export default router;
```

Mount: `app.use('/api/admin/audit-log', adminAuditLogRoutes);`

- [ ] **Step 2: Write AuditLogPage**

Create `client/src/pages/admin/AuditLogPage.jsx`:

```jsx
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { ClipboardList } from 'lucide-react';
import { API_BASE } from '../../config/api';

const api = axios.create({ baseURL: `${API_BASE}/admin/audit-log`, withCredentials: true });

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ action: '', actorEmail: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/', { params: { ...filters, page, limit: 50 } });
      if (res.data.success) { setLogs(res.data.data.logs); setTotal(res.data.data.total); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (k) => (v) => { setFilters(f => ({ ...f, [k]: v })); setPage(1); };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/15">
          <ClipboardList className="h-5 w-5 text-brand-blue" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-ink">Audit Log</h1>
          <p className="text-sm text-ink-muted">{total.toLocaleString()} entries</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <input placeholder="Filter by action..." value={filters.action} onChange={e => setFilter('action')(e.target.value)} className="h-9 rounded-lg border border-hairline bg-surface-2 px-3 text-sm text-ink outline-none focus:border-brand-blue min-w-[160px]" />
        <input placeholder="Filter by actor email..." value={filters.actorEmail} onChange={e => setFilter('actorEmail')(e.target.value)} className="h-9 rounded-lg border border-hairline bg-surface-2 px-3 text-sm text-ink outline-none focus:border-brand-blue min-w-[200px]" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-hairline bg-surface-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline">
                {['Time', 'Actor', 'Action', 'Resource', 'IP'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-muted">Loading...</td></tr>
              ) : logs.map(log => (
                <tr key={log._id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3 text-xs text-ink-muted whitespace-nowrap">{new Date(log.createdAt).toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{log.actorEmail || '—'}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-xs font-mono text-ink">{log.action}</span></td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{log.resourceType ? `${log.resourceType} ${log.resourceId ? String(log.resourceId).slice(-6) : ''}` : '—'}</td>
                  <td className="px-4 py-3 text-xs text-ink-subtle">{log.ip || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-hairline bg-surface-2 px-3 py-1.5 text-sm text-ink disabled:opacity-40">Prev</button>
          <span className="px-3 py-1.5 text-sm text-ink-muted">Page {page} of {Math.ceil(total / 50)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 50)} className="rounded-lg border border-hairline bg-surface-2 px-3 py-1.5 text-sm text-ink disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Register**

```jsx
import AuditLogPage from './pages/admin/AuditLogPage';
<Route path="audit-log" element={<AuditLogPage />} />
```

- [ ] **Step 4: Commit**

```bash
git add \
  server/src/routes/adminAuditLog.routes.js \
  server/src/server.js \
  client/src/pages/admin/AuditLogPage.jsx \
  client/src/App.jsx
git commit -m "feat: add audit log API and admin page

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8.4: Phase 8 Verification

- [ ] `GET /api/admin/analytics/summary` requires `analytics.view` permission.
- [ ] Date range filter narrows impression/click counts correctly.
- [ ] Daily CTR chart renders in AnalyticsPage.
- [ ] Top items table shows real click counts.
- [ ] Audit log page lists entries with correct actor email and action.
- [ ] Audit log action filter narrows entries.
- [ ] AdminOverviewPage shows real impression/click totals.
- [ ] `GET /api/admin/audit-log` requires `auditLog.view`.

- [ ] **Commit verification pass**

```bash
git commit --allow-empty -m "chore: phase 8 verification passed

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 9: Google Ads and External Providers

### Task 9.1: Google Ads Script Loader

**Files:**
- Create: `client/src/utils/googleAds.js`

Load the Google Ads script once globally, defer it, and expose a helper so `GoogleAdSlot` can render ad units after the script is ready. Fail gracefully when blocked by ad blockers.

- [ ] **Step 1: Write loader**

Create `client/src/utils/googleAds.js`:

```javascript
let loaded = false;
let loading = false;
const callbacks = [];

export function loadGoogleAds(publisherId) {
  if (loaded) return Promise.resolve(true);
  if (loading) return new Promise(resolve => callbacks.push(resolve));

  return new Promise(resolve => {
    loading = true;
    callbacks.push(resolve);

    const script = document.createElement('script');
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
    script.async = true;
    script.crossOrigin = 'anonymous';

    script.onload = () => {
      loaded = true;
      loading = false;
      callbacks.forEach(cb => cb(true));
      callbacks.length = 0;
    };

    script.onerror = () => {
      // Ad blocked or network error — resolve with false, do not retry
      loading = false;
      callbacks.forEach(cb => cb(false));
      callbacks.length = 0;
    };

    document.head.appendChild(script);
  });
}

export function pushAd() {
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch { /* blocked */ }
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/utils/googleAds.js
git commit -m "feat: add Google Ads script loader with graceful ad-block handling

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9.2: GoogleAdSlot Renderer

**Files:**
- Create: `client/src/components/monetization/renderers/GoogleAdSlot.jsx`
- Modify: `client/src/components/monetization/MonetizationSlot.jsx`

- [ ] **Step 1: Write GoogleAdSlot**

Create `client/src/components/monetization/renderers/GoogleAdSlot.jsx`:

```jsx
import { useEffect, useRef, useState } from 'react';
import { loadGoogleAds, pushAd } from '../../../utils/googleAds';

export default function GoogleAdSlot({ item }) {
  const { providerConfig } = item.content ?? {};
  const { provider, slotId, publisherId, size = 'auto' } = providerConfig ?? {};
  const adRef = useRef(null);
  const [blocked, setBlocked] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (provider !== 'google_ads' || !publisherId) return;

    loadGoogleAds(publisherId).then(ok => {
      if (!ok) { setBlocked(true); return; }
      setReady(true);
    });
  }, [provider, publisherId]);

  useEffect(() => {
    if (ready && adRef.current) {
      pushAd();
    }
  }, [ready]);

  if (provider !== 'google_ads') return null;
  if (blocked) return null; // Invisible when blocked — do not break page

  return (
    <div className="overflow-hidden" style={{ minHeight: 90 }}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%' }}
        data-ad-client={publisherId}
        data-ad-slot={slotId}
        data-ad-format={size === 'auto' ? 'auto' : undefined}
        data-full-width-responsive="true"
      />
    </div>
  );
}
```

- [ ] **Step 2: Update MonetizationSlot to use GoogleAdSlot**

In `client/src/components/monetization/MonetizationSlot.jsx`:

```jsx
import GoogleAdSlot from './renderers/GoogleAdSlot';

// Update renderItem:
case 'ad_slot':
  if (item.content?.providerConfig?.provider === 'google_ads') {
    return <GoogleAdSlot {...props} />;
  }
  return <AdSlotPlaceholder {...props} />;
```

- [ ] **Step 3: Add provider validation in backend**

In `server/src/services/monetizationValidator.js`, update `ad_slot` validation:

```javascript
case 'ad_slot':
  if (!content.providerConfig?.provider) errors.push('content.providerConfig.provider is required');
  if (!content.providerConfig?.slotId)   errors.push('content.providerConfig.slotId is required');
  if (content.providerConfig?.provider === 'google_ads' && !content.providerConfig?.publisherId) {
    errors.push('content.providerConfig.publisherId is required for google_ads provider');
  }
  break;
```

- [ ] **Step 4: Commit**

```bash
git add \
  client/src/components/monetization/renderers/GoogleAdSlot.jsx \
  client/src/components/monetization/MonetizationSlot.jsx \
  server/src/services/monetizationValidator.js
git commit -m "feat: add GoogleAdSlot renderer with ad-block safe loading

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9.3: Admin Form Support for Google Ads

**Files:**
- Modify: `client/src/components/admin/monetization/ItemForm.jsx`

Extend the `ad_slot` section to include `publisherId` field and a size selector:

```jsx
{data.type === 'ad_slot' && data.content?.providerConfig?.provider === 'google_ads' && (
  <>
    <Field label="Publisher ID (ca-pub-xxx)">
      <Input
        value={data.content?.providerConfig?.publisherId}
        onChange={(v) => onChange({ ...data, content: { ...data.content, providerConfig: { ...data.content?.providerConfig, publisherId: v } } })}
        placeholder="ca-pub-0000000000000000"
      />
    </Field>
    <Field label="Ad Size">
      <Select
        value={data.content?.providerConfig?.size ?? 'auto'}
        onChange={(v) => onChange({ ...data, content: { ...data.content, providerConfig: { ...data.content?.providerConfig, size: v } } })}
        options={['auto','banner','leaderboard','rectangle','skyscraper']}
      />
    </Field>
  </>
)}
```

- [ ] **Step 1: Apply update to ItemForm.jsx**
- [ ] **Step 2: Commit**

```bash
git add client/src/components/admin/monetization/ItemForm.jsx
git commit -m "feat: add Google Ads publisher ID and size fields to admin form

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9.4: Phase 9 Verification

- [ ] `ad_slot` item with `provider: google_ads` and missing `publisherId` fails backend validation.
- [ ] `ad_slot` item with `provider: placeholder` still works without `publisherId`.
- [ ] `GoogleAdSlot` renders `<ins>` element when Google Ads script loads.
- [ ] When Google Ads script fails to load (ad blocker), component renders nothing and does not throw.
- [ ] Page does not error if `adsbygoogle.js` is blocked.
- [ ] `GoogleAdSlot` script loaded only once across multiple ad slots on the same page.
- [ ] Admin form shows `publisherId` and `size` fields only when `google_ads` provider selected.

- [ ] **Commit verification pass**

```bash
git commit --allow-empty -m "chore: phase 9 verification passed

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Final Rollout Checklist

Follow this sequence when deploying to production for the first time:

- [ ] Set `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`, `SESSION_SECRET` in production env.
- [ ] Deploy server — bootstrap creates Owner account on first start.
- [ ] Login as Owner at `https://yourdomain.com/admin/login`.
- [ ] Change password immediately.
- [ ] Remove `ADMIN_BOOTSTRAP_PASSWORD` from production env and redeploy.
- [ ] Verify second server restart does NOT create another Owner.
- [ ] Create placements (auto-seeded on first start — verify 13 rows in DB).
- [ ] Create first monetization items as drafts.
- [ ] Preview items in admin edit page.
- [ ] Publish one low-risk item to `videos_top`.
- [ ] Verify item appears on `/videos` page.
- [ ] Verify impression event logged in MongoDB.
- [ ] Click item, verify click count incremented and redirect works.
- [ ] Gradually enable more placements.
- [ ] Move `DataOpsView` users to `/admin/data-ops`.
- [ ] Monitor Analytics page for CTR.
- [ ] Create Manager account for non-technical team member with `monetization.*` permissions only.
- [ ] Verify Manager can create/edit/publish items but cannot access Users or Data Ops.
