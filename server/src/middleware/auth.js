import jwt from "jsonwebtoken";
export function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return res.status(401).json({ message: "Login required" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res
      .status(401)
      .json({ message: "Session expired. Please login again." });
  }
}
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Login required" });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ message: "আপনার এই কাজের অনুমতি নেই।" });
    next();
  };
}
export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => requireRole("admin")(req, res, next));
}
