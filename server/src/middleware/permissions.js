import { getDB } from "../db.js";

export const DEFAULT_ROLE_PERMISSIONS = Object.freeze({
  admin: { "*": ["*"] },
  staff: {
    dashboard: ["read"],
    bookings: ["read", "update"],
    customers: ["read"],
    services: ["read"],
  },
  technician: {
    dashboard: ["read"],
    assignedBookings: ["read", "update"],
    profile: ["read", "update"],
  },
  customer: {
    dashboard: ["read"],
    ownBookings: ["read", "create"],
    profile: ["read", "update"],
    services: ["read"],
  },
});

export async function getRolePermissions(role) {
  const saved = await getDB().collection("rolePermissions").findOne({ role });
  return saved?.permissions || DEFAULT_ROLE_PERMISSIONS[role] || {};
}

export function requirePermission(resource, action) {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Login required" });
      if (req.user.role === "admin") return next();
      const permissions = await getRolePermissions(req.user.role);
      const actions = permissions[resource] || [];
      if (actions.includes("*") || actions.includes(action)) return next();
      return res.status(403).json({ message: "এই কাজের অনুমতি নেই।" });
    } catch (error) {
      next(error);
    }
  };
}
