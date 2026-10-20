export const USER_ROLES = Object.freeze({ ADMIN: 'admin', CUSTOMER: 'customer', TECHNICIAN: 'technician' });
export function publicUser(user) { if (!user) return null; const { passwordHash, password, ...safe } = user; return safe; }
