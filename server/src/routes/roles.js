import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { DEFAULT_ROLE_PERMISSIONS, getRolePermissions } from '../middleware/permissions.js';
import { getDB } from '../db.js';

const router = Router();
const BUILT_IN_ROLES = ['admin', 'staff', 'technician', 'customer'];
const VALID_ACTIONS = new Set(['read', 'create', 'update', 'delete', 'assign', 'status', 'publish', '*']);

router.get('/permissions/me', requireAuth, async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json({ role: req.user.role, permissions: await getRolePermissions(req.user.role) });
  } catch (e) { next(e); }
});

router.get('/roles', requireAuth, requireRole('admin'), async (_req, res, next) => {
  try {
    const saved = await getDB().collection('rolePermissions').find({}).toArray();
    const map = new Map(saved.map(x => [x.role, x.permissions]));
    res.set('Cache-Control', 'no-store');
    res.json({ roles: BUILT_IN_ROLES.map(role => ({ role, permissions: map.get(role) || DEFAULT_ROLE_PERMISSIONS[role] || {} })) });
  } catch (e) { next(e); }
});

router.put('/roles/:role/permissions', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const role = String(req.params.role || '').toLowerCase();
    if (!BUILT_IN_ROLES.includes(role) || role === 'admin') return res.status(400).json({ message: 'এই Role-এর Permission পরিবর্তন করা যাবে না।' });
    const permissions = req.body?.permissions;
    if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions) || Object.keys(permissions).length > 100) return res.status(400).json({ message: 'Invalid permissions object.' });
    for (const [resource, actions] of Object.entries(permissions)) {
      if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(resource) || !Array.isArray(actions) || actions.length > 8 || actions.some(a => !VALID_ACTIONS.has(a))) return res.status(400).json({ message: 'Invalid resource or action.' });
    }
    const now = new Date();
    await getDB().collection('rolePermissions').updateOne({ role }, { $set: { role, permissions, updatedAt: now, updatedBy: req.user.email }, $setOnInsert: { createdAt: now } }, { upsert: true });
    res.json({ message: 'Role permissions updated.', role, permissions });
  } catch (e) { next(e); }
});

export default router;
