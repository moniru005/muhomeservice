import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { connectDB } from "./db.js";
import { services, packages } from "./data.js";
import authRoutes from "./routes/auth.js";
import bookingRoutes from "./routes/bookings.js";
import contactRoutes from "./routes/contact.js";
import cmsRoutes from "./routes/cms.js";
import roleRoutes from "./routes/roles.js";
import operationsRoutes from "./routes/operations.js";
import paymentRoutes from "./routes/payments.js";
import roleEnhancementRoutes from "./routes/role-enhancements.js";
import partnerRoutes from "./routes/partners.js";
import { notifySmsSafely } from "./services/integrations.js";
import { requireAdmin, requireAuth } from "./middleware/auth.js";
import { getRolePermissions } from "./middleware/permissions.js";
import { getDB } from "./db.js";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const app = express();
// Record mutating Admin actions after route authentication has populated req.user.
// Request bodies are deliberately excluded to avoid storing passwords, tokens or personal documents.
app.use((req, res, next) => {
  res.on('finish', () => {
    if (req.user?.role !== 'admin' || !['POST','PUT','PATCH','DELETE'].includes(req.method)) return;
    const path = req.originalUrl.split('?')[0];
    if (!path.startsWith('/api/')) return;
    getDB().collection('adminAuditLogs').insertOne({
      action: `${req.method.toLowerCase()} ${path}`.slice(0,240), actorId: req.user.sub,
      actorRole: 'admin', method: req.method, path, statusCode: res.statusCode,
      ip: req.ip, userAgent: String(req.get('user-agent') || '').slice(0,300), createdAt: new Date()
    }).catch(err => console.error('Admin audit log write failed:', err.message));
  });
  next();
});
function requireAdminOrStaffPermission(permission) {
  return (req, res, next) => requireAuth(req, res, async () => {
    try {
      if (req.user.role === "admin") return next();
      if (req.user.role !== "staff") return res.status(403).json({ message: "এই কাজের অনুমতি নেই।" });
      const { ObjectId } = await import("mongodb");
      if (!ObjectId.isValid(req.user.sub)) return res.status(403).json({ message: "Staff account required" });
      const staff = await getDB().collection("users").findOne({ _id: new ObjectId(req.user.sub), role: "staff", accountStatus: "approved" });
      const rolePerms = await getRolePermissions("staff");
      const resourceAction = { managePayments: ["payments", "create"], manageInventory: ["inventory", "update"], manageBookings: ["bookings", "update"], assignTechnicians: ["bookings", "assign"], manageQuotations: ["quotations", "create"], viewReports: ["reports", "read"] }[permission] || ["dashboard", "read"];
      const actions = rolePerms[resourceAction[0]] || [];
      const legacyGrant = Boolean(staff?.permissions?.includes(permission));
      if (!staff || (!legacyGrant && !actions.some(a => ["*", resourceAction[1], ...(resourceAction[1] === "create" ? ["update"] : [])].includes(a)))) return res.status(403).json({ message: `Role & Permission Manager অনুযায়ী ${resourceAction[0]}:${resourceAction[1]} অনুমতি নেই।` });
      next();
    } catch (e) { next(e); }
  });
}
app.disable("x-powered-by");
// Render terminates TLS at its proxy; trust exactly the first proxy hop for client IPs.
app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: (process.env.CLIENT_ORIGIN || "http://localhost:5173")
      .split(",")
      .map((s) => s.trim()),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "100kb", verify: (req, _res, buffer) => { req.rawBody = Buffer.from(buffer); } }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);
const uploadsRoot = fileURLToPath(new URL("../uploads/", import.meta.url));
fs.mkdirSync(path.join(uploadsRoot, "profiles"), { recursive: true });
// Serve uploads at both paths: /uploads for direct access and /api/uploads for hosts
// that only proxy /api/* requests to the backend.
const profileStaticOptions = {
  index: false,
  dotfiles: "deny",
  fallthrough: true,
  setHeaders: (res) => res.setHeader("Cache-Control", "public, max-age=3600"),
};
// Only explicitly public asset directories are exposed. Partner documents and
// all other private uploads remain accessible through authenticated routes only.
for (const publicDir of ["profiles", "service-reports", "cms", "services"]) {
  const dir = path.join(uploadsRoot, publicDir);
  if (fs.existsSync(dir)) app.use(`/api/uploads/${publicDir}`, express.static(dir, profileStaticOptions));
}
// Legacy CMS media URLs use /api/uploads; expose only the CMS media directory there.
const cmsMediaDir = path.join(uploadsRoot, "cms");
if (fs.existsSync(cmsMediaDir)) app.use("/api/uploads", express.static(cmsMediaDir, profileStaticOptions));
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", service: "MU Home Service API" }),
);
app.get("/api/services", async (_req, res, next) => {
  try {
    const saved = await getDB()
      .collection("siteContent")
      .findOne({ _id: "services" });
    if (!saved)
      return res.status(503).json({
        message: "Service catalogue is not initialized in the database.",
      });
    res.set("Cache-Control", "no-store");
    res.json({ services: saved.items || [] });
  } catch (e) {
    next(e);
  }
});
app.get("/api/packages", async (_req, res, next) => {
  try {
    const saved = await getDB()
      .collection("siteContent")
      .findOne({ _id: "packages" });
    if (!saved)
      return res.status(503).json({
        message: "Package catalogue is not initialized in the database.",
      });
    res.set("Cache-Control", "no-store");
    res.json({ packages: saved.items || [] });
  } catch (e) {
    next(e);
  }
});
app.get("/api/admin/content", requireAdmin, async (_req, res, next) => {
  try {
    const [s, p] = await Promise.all([
      getDB().collection("siteContent").findOne({ _id: "services" }),
      getDB().collection("siteContent").findOne({ _id: "packages" }),
    ]);
    res.json({
      services: s?.items || services,
      packages: p?.items || packages,
    });
  } catch (e) {
    next(e);
  }
});
app.put("/api/admin/content", requireAdmin, async (req, res, next) => {
  try {
    const { services: sv, packages: pk } = req.body || {};
    if (
      !Array.isArray(sv) ||
      !Array.isArray(pk) ||
      sv.length > 100 ||
      pk.length > 50
    )
      return res.status(400).json({ message: "Invalid content format" });
    const validate = (items, type) => {
      const ids = new Set();
      for (const x of items) {
        if (
          !x ||
          typeof x.id !== "string" ||
          !x.id.trim() ||
          typeof x.name !== "string" ||
          !x.name.trim() ||
          !Number.isFinite(Number(x.price)) ||
          Number(x.price) < 0
        )
          return `${type}-এর প্রতিটি আইটেমে বৈধ id, name ও price থাকতে হবে।`;
        if (ids.has(x.id.trim()))
          return `${type}-এর ID unique হতে হবে: ${x.id}`;
        ids.add(x.id.trim());
        if (x.image && typeof x.image !== "string") return "Image URL সঠিক নয়।";
      }
      return null;
    };
    const validationError = validate(sv, "সার্ভিস") || validate(pk, "প্যাকেজ");
    if (validationError)
      return res.status(400).json({ message: validationError });
    const db = getDB();
    const now = new Date();
    await Promise.all([
      db
        .collection("siteContent")
        .updateOne(
          { _id: "services" },
          { $set: { items: sv, updatedAt: now, updatedBy: req.user.email } },
          { upsert: true },
        ),
      db
        .collection("siteContent")
        .updateOne(
          { _id: "packages" },
          { $set: { items: pk, updatedAt: now, updatedBy: req.user.email } },
          { upsert: true },
        ),
    ]);
    res.set("Cache-Control", "no-store");
    res.json({
      message: "Website content saved successfully",
      services: sv,
      packages: pk,
      updatedAt: now,
    });
  } catch (e) {
    next(e);
  }
});
app.get("/api/dashboard/summary", async (req, res, next) => {
  try {
    const { requireAuth } = await import("./middleware/auth.js");
    requireAuth(req, res, async () => {
      try {
        const db = getDB();
        const { ObjectId } = await import("mongodb");
        let filter = {};
        let canAssign = false;
        let role = req.user.role;
        if (role === "admin") filter = {};
        else if (role === "technician") {
          const tech = ObjectId.isValid(req.user.sub)
            ? await db.collection("users").findOne({
                _id: new ObjectId(req.user.sub),
                role: "technician",
                accountStatus: "approved",
                technicianStatus: "approved",
              })
            : null;
          if (!tech)
            return res
              .status(403)
              .json({ message: "Technician অ্যাকাউন্ট অনুমোদিত নয়।" });
          filter = {
            $or: [
              { technicianId: req.user.sub },
              { technicianIds: req.user.sub },
            ],
          };
        } else if (role === "staff") {
          const staff = ObjectId.isValid(req.user.sub)
            ? await db.collection("users").findOne({
                _id: new ObjectId(req.user.sub),
                role: "staff",
                accountStatus: "approved",
              })
            : null;
          if (!staff)
            return res
              .status(403)
              .json({ message: "Staff অ্যাকাউন্ট অনুমোদিত নয়।" });
          const rolePerms = await getRolePermissions("staff");
          canAssign = (rolePerms.bookings || []).some(a => ["*", "assign"].includes(a));
          const canReadQueue = (rolePerms.bookings || []).some(a => ["*", "read", "update", "assign", "status"].includes(a)) || (rolePerms.quotations || []).some(a => ["*", "read", "create"].includes(a));
          filter = canReadQueue ? {} : { _id: { $exists: false } };
        } else filter = { userId: req.user.sub };
        filter = { ...filter, deletedAt: { $exists: false } };
        const [total, completed, bookings] = await Promise.all([
          db.collection("bookings").countDocuments(filter),
          db
            .collection("bookings")
            .countDocuments({ ...filter, status: "Completed" }),
          db
            .collection("bookings")
            .find(filter)
            .sort({ createdAt: -1 })
            .limit(100)
            .toArray(),
        ]);
        // Resolve the signed-in technician's decision server-side. This avoids
        // UI identity-shape mismatches (_id vs id) and keeps the decision hidden
        // after refresh/re-login.
        const dashboardBookings = role === "technician"
          ? bookings.map((booking) => ({
              ...booking,
              myTechnicianDecision: booking.technicianDecisions?.[req.user.sub] || null,
            }))
          : bookings;
        res.set("Cache-Control", "no-store");
        res.json({ total, completed, bookings: dashboardBookings, role, canAssign });
      } catch (e) {
        next(e);
      }
    });
  } catch (e) {
    next(e);
  }
});

// Admin operations: technician management, income/expense ledger, and inventory.
app.get("/api/admin/technicians", requireAdmin, async (_req, res, next) => {
  try {
    const rows = await getDB()
      .collection("users")
      .find(
        { role: "technician" },
        { projection: { passwordHash: 0, resetTokenHash: 0 } },
      )
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();
    res.json({ technicians: rows });
  } catch (e) {
    next(e);
  }
});
app.patch(
  "/api/admin/technicians/:id/status",
  requireAdmin,
  async (req, res, next) => {
    try {
      const { ObjectId } = await import("mongodb");
      if (!ObjectId.isValid(req.params.id))
        return res.status(400).json({ message: "Invalid technician ID" });
      const status = ["pending", "approved", "suspended"].includes(
        req.body.status,
      )
        ? req.body.status
        : null;
      if (!status) return res.status(400).json({ message: "Invalid status" });
      const r = await getDB()
        .collection("users")
        .updateOne(
          { _id: new ObjectId(req.params.id), role: "technician" },
          {
            $set: {
              technicianStatus: status,
              accountStatus: status,
              updatedAt: new Date(),
            },
          },
        );
      if (!r.matchedCount)
        return res.status(404).json({ message: "Technician not found" });
      res.json({ message: "Technician status updated", status });
    } catch (e) {
      next(e);
    }
  },
);
app.get("/api/admin/staff", requireAdmin, async (_req, res, next) => {
  try {
    const rows = await getDB()
      .collection("users")
      .find(
        { role: "staff" },
        { projection: { passwordHash: 0, resetTokenHash: 0 } },
      )
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();
    res.json({ staff: rows });
  } catch (e) {
    next(e);
  }
});
app.patch(
  "/api/admin/staff/:id/assign-permission",
  requireAdmin,
  async (req, res, next) => {
    try {
      const { ObjectId } = await import("mongodb");
      if (!ObjectId.isValid(req.params.id))
        return res.status(400).json({ message: "Invalid staff ID" });
      const enabled = Boolean(req.body.enabled);
      const update = enabled
        ? {
            $addToSet: { permissions: "assignTechnicians" },
            $set: { updatedAt: new Date() },
          }
        : {
            $pull: { permissions: "assignTechnicians" },
            $set: { updatedAt: new Date() },
          };
      const r = await getDB()
        .collection("users")
        .updateOne({ _id: new ObjectId(req.params.id), role: "staff" }, update);
      if (!r.matchedCount)
        return res.status(404).json({ message: "Staff account not found" });
      res.json({ message: "Permission updated", enabled });
    } catch (e) {
      next(e);
    }
  },
);
app.patch(
  "/api/admin/staff/:id/permissions",
  requireAdmin,
  async (req, res, next) => {
    try {
      const { ObjectId } = await import("mongodb");
      if (!ObjectId.isValid(req.params.id))
        return res.status(400).json({ message: "Invalid staff ID" });
      const permission = String(req.body.permission || "");
      const enabled = Boolean(req.body.enabled);
      if (
        ![
          "assignTechnicians",
          "manageQuotations",
          "manageBookings",
          "managePayments",
          "manageInventory",
          "viewReports",
        ].includes(permission)
      )
        return res.status(400).json({ message: "Invalid permission" });
      const update = enabled
        ? {
            $addToSet: { permissions: permission },
            $set: { updatedAt: new Date() },
          }
        : {
            $pull: { permissions: permission },
            $set: { updatedAt: new Date() },
          };
      const r = await getDB()
        .collection("users")
        .updateOne({ _id: new ObjectId(req.params.id), role: "staff" }, update);
      if (!r.matchedCount)
        return res.status(404).json({ message: "Staff account not found" });
      res.json({ message: "Permission updated", permission, enabled });
    } catch (e) {
      next(e);
    }
  },
);
app.patch(
  "/api/admin/staff/:id/status",
  requireAdmin,
  async (req, res, next) => {
    try {
      const { ObjectId } = await import("mongodb");
      if (!ObjectId.isValid(req.params.id))
        return res.status(400).json({ message: "Invalid staff ID" });
      const status = ["pending", "approved", "suspended"].includes(
        req.body.status,
      )
        ? req.body.status
        : null;
      if (!status) return res.status(400).json({ message: "Invalid status" });
      const r = await getDB()
        .collection("users")
        .updateOne(
          { _id: new ObjectId(req.params.id), role: "staff" },
          { $set: { accountStatus: status, updatedAt: new Date() } },
        );
      if (!r.matchedCount)
        return res.status(404).json({ message: "Staff account not found" });
      res.json({ message: "Staff account status updated", status });
    } catch (e) {
      next(e);
    }
  },
);
app.get("/api/admin/finance", requireAdminOrStaffPermission("managePayments"), async (_req, res, next) => {
  try {
    const rows = await getDB()
      .collection("financeEntries")
      .find({})
      .sort({ date: -1, createdAt: -1 })
      .limit(1000)
      .toArray();
    const income = rows
      .filter((x) => x.type === "income")
      .reduce((a, x) => a + Number(x.amount || 0), 0);
    const expense = rows
      .filter((x) => x.type === "expense")
      .reduce((a, x) => a + Number(x.amount || 0), 0);
    res.json({ entries: rows, income, expense, profit: income - expense });
  } catch (e) {
    next(e);
  }
});
app.post("/api/admin/finance", requireAdminOrStaffPermission("managePayments"), async (req, res, next) => {
  try {
    const { type, category, amount, note, date } = req.body || {};
    if (
      !["income", "expense"].includes(type) ||
      !String(category || "").trim() ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    )
      return res
        .status(400)
        .json({ message: "Valid type, category and positive amount required" });
    const entry = {
      type,
      category: String(category).trim().slice(0, 100),
      amount: Number(amount),
      note: String(note || "").slice(0, 500),
      date: date ? new Date(date) : new Date(),
      createdAt: new Date(),
      createdBy: req.user.email,
    };
    if (Number.isNaN(entry.date.getTime()))
      return res.status(400).json({ message: "Invalid date" });
    const db = getDB();
    const r = await db.collection("financeEntries").insertOne(entry);
    await writeAudit(
      db,
      req,
      "finance.entry.created",
      "financeEntries",
      r.insertedId,
      { type, category: entry.category, amount: entry.amount },
    );
    res.status(201).json({
      entry: { ...entry, _id: r.insertedId },
      message: "Finance entry saved",
    });
  } catch (e) {
    next(e);
  }
});
app.get("/api/admin/inventory", requireAdminOrStaffPermission("manageInventory"), async (_req, res, next) => {
  try {
    const items = await getDB()
      .collection("inventory")
      .find({})
      .sort({ name: 1 })
      .limit(2000)
      .toArray();
    res.json({ items });
  } catch (e) {
    next(e);
  }
});
app.post("/api/admin/inventory", requireAdminOrStaffPermission("manageInventory"), async (req, res, next) => {
  try {
    const { name, sku, quantity, unit, costPrice, reorderLevel } =
      req.body || {};
    if (
      !String(name || "").trim() ||
      !Number.isFinite(Number(quantity)) ||
      Number(quantity) < 0 ||
      !Number.isFinite(Number(costPrice)) ||
      Number(costPrice) < 0
    )
      return res
        .status(400)
        .json({ message: "Valid name, quantity and cost price required" });
    const item = {
      name: String(name).trim().slice(0, 150),
      sku: String(sku || "")
        .trim()
        .slice(0, 80),
      quantity: Number(quantity),
      unit: String(unit || "pcs").slice(0, 30),
      costPrice: Number(costPrice),
      reorderLevel: Math.max(0, Number(reorderLevel) || 0),
      updatedAt: new Date(),
      createdAt: new Date(),
    };
    const r = await getDB().collection("inventory").insertOne(item);
    res.status(201).json({ item: { ...item, _id: r.insertedId } });
  } catch (e) {
    next(e);
  }
});
app.patch("/api/admin/inventory/:id", requireAdminOrStaffPermission("manageInventory"), async (req, res, next) => {
  try {
    const { ObjectId } = await import("mongodb");
    if (!ObjectId.isValid(req.params.id))
      return res.status(400).json({ message: "Invalid item ID" });
    const body = req.body || {};
    const set = { updatedAt: new Date() };
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name)
        return res.status(400).json({ message: "Item name is required" });
      set.name = name.slice(0, 150);
    }
    if (body.sku !== undefined)
      set.sku = String(body.sku || "")
        .trim()
        .slice(0, 80);
    if (body.unit !== undefined)
      set.unit =
        String(body.unit || "pcs")
          .trim()
          .slice(0, 30) || "pcs";
    for (const key of ["quantity", "costPrice", "reorderLevel"]) {
      if (body[key] !== undefined) {
        const value = Number(body[key]);
        if (!Number.isFinite(value) || value < 0)
          return res
            .status(400)
            .json({ message: `${key} must be a non-negative number` });
        set[key] = value;
      }
    }
    const r = await getDB()
      .collection("inventory")
      .updateOne({ _id: new ObjectId(req.params.id) }, { $set: set });
    if (!r.matchedCount)
      return res.status(404).json({ message: "Inventory item not found" });
    res.json({ message: "Inventory updated" });
  } catch (e) {
    next(e);
  }
});
app.delete("/api/admin/inventory/:id", requireAdminOrStaffPermission("manageInventory"), async (req, res, next) => {
  try {
    const { ObjectId } = await import("mongodb");
    if (!ObjectId.isValid(req.params.id))
      return res.status(400).json({ message: "Invalid item ID" });
    const r = await getDB()
      .collection("inventory")
      .deleteOne({ _id: new ObjectId(req.params.id) });
    if (!r.deletedCount)
      return res.status(404).json({ message: "Inventory item not found" });
    res.json({ message: "Inventory item deleted" });
  } catch (e) {
    next(e);
  }
});

// Integrated operations: payments -> finance ledger; stock movements -> inventory ledger + finance.
app.get(
  "/api/admin/operations/bookings",
  requireAdminOrStaffPermission("managePayments"),
  async (_req, res, next) => {
    try {
      const rows = await getDB()
        .collection("bookings")
        .find({ status: { $ne: "Cancelled" } })
        .sort({ createdAt: -1 })
        .limit(500)
        .project({
          ticketId: 1,
          name: 1,
          phone: 1,
          serviceName: 1,
          status: 1,
          createdAt: 1,
          technicianIds: 1,
          technicianId: 1,
          paymentStatus: 1,
          paymentAmount: 1,
          payments: 1,
          totalAmount: 1,
          quotedAmount: 1,
          partnerId: 1,
          partnerStatus: 1,
          partnerPayout: 1,
        })
        .toArray();
      res.json({
        bookings: rows.map((b) => ({
          ...b,
          paidAmount: (b.payments || []).reduce(
            (n, p) => n + Number(p.amount || 0),
            0,
          ),
        })),
      });
    } catch (e) {
      next(e);
    }
  },
);

// Record money actually received. Every payment has a unique reference and creates one linked income entry.
app.post(
  "/api/admin/bookings/:id/payments",
  requireAdminOrStaffPermission("managePayments"),
  async (req, res, next) => {
    try {
      const { ObjectId } = await import("mongodb");
      const db = getDB();
      if (!ObjectId.isValid(req.params.id))
        return res.status(400).json({ message: "Invalid booking ID" });
      const amount = Number(req.body.amount);
      const method = String(req.body.method || "cash")
        .trim()
        .slice(0, 40);
      const reference = String(req.body.reference || "")
        .trim()
        .slice(0, 100);
      if (!Number.isFinite(amount) || amount <= 0)
        return res
          .status(400)
          .json({ message: "Payment amount must be greater than zero" });
      const booking = await db
        .collection("bookings")
        .findOne({ _id: new ObjectId(req.params.id) });
      if (!booking)
        return res.status(404).json({ message: "Booking not found" });
      if (
        reference &&
        (await db.collection("financeEntries").findOne({
          sourceKey: `booking-payment:${booking._id}:${reference}`,
        }))
      )
        return res
          .status(409)
          .json({ message: "এই payment reference আগে রেকর্ড হয়েছে।" });
      const payment = {
        paymentId: randomUUID(),
        amount,
        method,
        reference,
        receivedAt: new Date(),
        receivedBy: req.user.email,
      };
      const totalPaid = Number(booking.paymentAmount || 0) + amount;
      const expectedTotal = Number(
        booking.totalAmount || booking.quotedAmount || 0,
      );
      const paymentStatus =
        expectedTotal > 0 && totalPaid >= expectedTotal ? "paid" : "partial";
      await db.collection("bookings").updateOne(
        { _id: booking._id },
        {
          $push: { payments: payment },
          $inc: { paymentAmount: amount },
          $set: { paymentStatus, updatedAt: new Date() },
        },
      );
      const entry = {
        type: "income",
        category: "Service payment",
        amount,
        note: `${booking.ticketId} · ${booking.serviceName || "Service"} · ${method}${reference ? ` · Ref ${reference}` : ""}`,
        date: payment.receivedAt,
        createdAt: payment.receivedAt,
        createdBy: req.user.email,
        sourceType: "booking-payment",
        sourceId: booking._id.toString(),
        sourceKey: `booking-payment:${booking._id}:${payment.paymentId}`,
        bookingId: booking._id.toString(),
        ticketId: booking.ticketId,
        paymentMethod: method,
      };
      await db.collection("financeEntries").insertOne(entry);
      await notifySmsSafely({ to: booking.phone, message: `MU Home Service: ${booking.ticketId} বুকিংয়ে ৳${amount.toFixed(2)} পেমেন্ট রেকর্ড হয়েছে।`, context: "manual-payment" });
      res.status(201).json({
        message: "Payment recorded and income ledger updated",
        payment,
        totalPaid,
        paymentStatus,
      });
    } catch (e) {
      next(e);
    }
  },
);

app.get(
  "/api/admin/inventory/:id/movements",
  requireAdmin,
  async (req, res, next) => {
    try {
      const { ObjectId } = await import("mongodb");
      if (!ObjectId.isValid(req.params.id))
        return res.status(400).json({ message: "Invalid item ID" });
      const movements = await getDB()
        .collection("inventoryMovements")
        .find({ itemId: req.params.id })
        .sort({ createdAt: -1 })
        .limit(300)
        .toArray();
      res.json({ movements });
    } catch (e) {
      next(e);
    }
  },
);
app.post(
  "/api/admin/inventory/:id/movements",
  requireAdmin,
  async (req, res, next) => {
    try {
      const { ObjectId } = await import("mongodb");
      const db = getDB();
      if (!ObjectId.isValid(req.params.id))
        return res.status(400).json({ message: "Invalid item ID" });
      const type = String(req.body.type || "");
      const quantity = Number(req.body.quantity);
      const bookingId = String(req.body.bookingId || "").trim();
      const unitCost = Number(req.body.unitCost || 0);
      const note = String(req.body.note || "")
        .trim()
        .slice(0, 300);
      if (
        !["in", "out"].includes(type) ||
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isFinite(unitCost) ||
        unitCost < 0
      )
        return res.status(400).json({
          message: "Valid movement type, quantity and unit cost required",
        });
      const item = await db
        .collection("inventory")
        .findOne({ _id: new ObjectId(req.params.id) });
      if (!item)
        return res.status(404).json({ message: "Inventory item not found" });
      if (type === "out" && Number(item.quantity) < quantity)
        return res.status(409).json({
          message: `Insufficient stock. Available: ${item.quantity} ${item.unit || ""}`,
        });
      const delta = type === "in" ? quantity : -quantity;
      const updateFilter = { _id: item._id };
      if (type === "out") updateFilter.quantity = { $gte: quantity };
      const updated = await db.collection("inventory").updateOne(updateFilter, {
        $inc: { quantity: delta },
        $set: { updatedAt: new Date() },
      });
      if (!updated.modifiedCount)
        return res
          .status(409)
          .json({ message: "Stock changed; refresh and try again." });
      const movement = {
        itemId: item._id.toString(),
        itemName: item.name,
        sku: item.sku || "",
        type,
        quantity,
        unit: item.unit || "pcs",
        unitCost,
        totalCost: quantity * unitCost,
        bookingId: bookingId || null,
        note,
        createdAt: new Date(),
        createdBy: req.user.email,
      };
      const saved = await db
        .collection("inventoryMovements")
        .insertOne(movement);
      movement._id = saved.insertedId;
      // Purchased stock is an expense at purchase time. Stock used on a booking is recorded as cost of service.
      if (
        (type === "in" && req.body.recordPurchaseExpense === true) ||
        (type === "out" && bookingId && req.body.recordUsageExpense !== false)
      ) {
        const key = `inventory-movement:${saved.insertedId}`;
        await db.collection("financeEntries").updateOne(
          { sourceKey: key },
          {
            $setOnInsert: {
              type: "expense",
              category:
                type === "in" ? "Inventory purchase" : "Service material usage",
              amount: quantity * unitCost,
              note: `${item.name} · ${quantity} ${item.unit || "pcs"}${bookingId ? ` · Booking ${bookingId}` : ""}${note ? ` · ${note}` : ""}`,
              date: movement.createdAt,
              createdAt: movement.createdAt,
              createdBy: req.user.email,
              sourceType: "inventory-movement",
              sourceId: String(saved.insertedId),
              sourceKey: key,
              bookingId: bookingId || null,
              itemId: item._id.toString(),
            },
          },
          { upsert: true },
        );
      }
      res.status(201).json({
        message: "Stock movement saved",
        movement,
        quantity: Number(item.quantity) + delta,
      });
    } catch (e) {
      next(e);
    }
  },
);

app.get(
  "/api/admin/operations/summary",
  requireAdmin,
  async (_req, res, next) => {
    try {
      const db = getDB();
      const [entries, items, bookings] = await Promise.all([
        db.collection("financeEntries").find({}).toArray(),
        db.collection("inventory").find({}).toArray(),
        db.collection("bookings").find({}).toArray(),
      ]);
      const income = entries
          .filter((x) => x.type === "income")
          .reduce((n, x) => n + Number(x.amount || 0), 0),
        expense = entries
          .filter((x) => x.type === "expense")
          .reduce((n, x) => n + Number(x.amount || 0), 0);
      const lowStock = items.filter(
        (x) => Number(x.quantity) <= Number(x.reorderLevel || 0),
      );
      const unpaid = bookings.reduce(
        (n, b) =>
          n +
          Math.max(
            0,
            Number(b.totalAmount || b.quotedAmount || 0) -
              Number(b.paymentAmount || 0),
          ),
        0,
      );
      res.json({
        income,
        expense,
        profit: income - expense,
        inventoryItems: items.length,
        inventoryValue: items.reduce(
          (n, x) => n + Number(x.quantity || 0) * Number(x.costPrice || 0),
          0,
        ),
        lowStock: lowStock.length,
        lowStockItems: lowStock,
        unpaidBookings: bookings.filter(
          (b) =>
            Number(b.paymentAmount || 0) === 0 &&
            Number(b.totalAmount || b.quotedAmount || 0) > 0,
        ).length,
        unpaidAmount: unpaid,
      });
    } catch (e) {
      next(e);
    }
  },
);

// Phase 3 Business Control: feedback, performance, audit trail and date-filtered reports.
async function writeAudit(db, req, action, entityType, entityId, details = {}) {
  await db.collection("auditLogs").insertOne({
    action,
    entityType,
    entityId: String(entityId || ""),
    actorId: req.user?.sub || "",
    actorEmail: req.user?.email || "system",
    actorRole: req.user?.role || "system",
    ip: String(
      req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "",
    )
      .split(",")[0]
      .slice(0, 100),
    userAgent: String(req.headers["user-agent"] || "").slice(0, 250),
    details,
    createdAt: new Date(),
  });
}
app.post("/api/feedback", async (req, res, next) => {
  try {
    const { requireAuth, requireRole } = await import("./middleware/auth.js");
    requireAuth(req, res, () =>
      requireRole("customer")(req, res, async () => {
        try {
          const { ObjectId } = await import("mongodb");
          const bookingId = String(req.body.bookingId || "");
          const rating = Number(req.body.rating);
          const comment = String(req.body.comment || "")
            .trim()
            .slice(0, 2000);
          if (
            !ObjectId.isValid(bookingId) ||
            !Number.isInteger(rating) ||
            rating < 1 ||
            rating > 5
          )
            return res
              .status(400)
              .json({ message: "Booking and rating (1–5) are required" });
          const db = getDB(),
            booking = await db
              .collection("bookings")
              .findOne({ _id: new ObjectId(bookingId), userId: req.user.sub });
          if (!booking)
            return res.status(404).json({ message: "Booking not found" });
          if (!["Completed", "completed"].includes(String(booking.status)))
            return res.status(409).json({
              message: "Feedback is available after service completion",
            });
          if (await db.collection("customerFeedback").findOne({ bookingId }))
            return res.status(409).json({
              message: "Feedback has already been submitted for this booking",
            });
          const feedback = {
            bookingId,
            ticketId: booking.ticketId,
            customerId: req.user.sub,
            customerEmail: req.user.email,
            technicianIds:
              booking.technicianIds || [booking.technicianId].filter(Boolean),
            rating,
            comment,
            createdAt: new Date(),
            status: "published",
          };
          const result = await db
            .collection("customerFeedback")
            .insertOne(feedback);
          await writeAudit(
            db,
            req,
            "feedback.created",
            "customerFeedback",
            result.insertedId,
            { bookingId, rating },
          );
          res.status(201).json({
            message: "Thank you for your feedback",
            feedback: { ...feedback, _id: result.insertedId },
          });
        } catch (e) {
          next(e);
        }
      }),
    );
  } catch (e) {
    next(e);
  }
});
app.get(
  "/api/admin/business-control/performance",
  requireAdmin,
  async (_req, res, next) => {
    try {
      const db = getDB();
      const [users, bookings, feedback] = await Promise.all([
        db
          .collection("users")
          .find(
            { role: "technician" },
            {
              projection: { name: 1, email: 1, phone: 1, technicianStatus: 1 },
            },
          )
          .limit(1000)
          .toArray(),
        db.collection("bookings").find({}).limit(5000).toArray(),
        db.collection("customerFeedback").find({}).limit(5000).toArray(),
      ]);
      const rows = users
        .map((u) => {
          const assigned = bookings.filter(
            (b) =>
              (b.technicianIds || []).includes(u._id.toString()) ||
              b.technicianId === u._id.toString(),
          );
          const done = assigned.filter((b) =>
            ["Completed", "completed"].includes(String(b.status)),
          );
          const fb = feedback.filter((f) =>
            (f.technicianIds || []).includes(u._id.toString()),
          );
          return {
            _id: u._id,
            name: u.name || u.email,
            email: u.email,
            phone: u.phone || "",
            status: u.technicianStatus || "pending",
            assigned: assigned.length,
            completed: done.length,
            completionRate: assigned.length
              ? Math.round((done.length / assigned.length) * 100)
              : 0,
            feedbackCount: fb.length,
            averageRating: fb.length
              ? Math.round(
                  (fb.reduce((n, f) => n + f.rating, 0) / fb.length) * 10,
                ) / 10
              : 0,
          };
        })
        .sort((a, b) => b.completed - a.completed);
      res.json({ technicians: rows });
    } catch (e) {
      next(e);
    }
  },
);
app.get(
  "/api/admin/business-control/feedback",
  requireAdmin,
  async (req, res, next) => {
    try {
      const rows = await getDB()
        .collection("customerFeedback")
        .find({})
        .sort({ createdAt: -1 })
        .limit(1000)
        .toArray();
      res.json({ feedback: rows });
    } catch (e) {
      next(e);
    }
  },
);
app.patch(
  "/api/admin/business-control/feedback/:id/status",
  requireAdmin,
  async (req, res, next) => {
    try {
      const { ObjectId } = await import("mongodb");
      if (!ObjectId.isValid(req.params.id))
        return res.status(400).json({ message: "Invalid feedback ID" });
      const status = ["published", "hidden"].includes(req.body.status)
        ? req.body.status
        : null;
      if (!status) return res.status(400).json({ message: "Invalid status" });
      const db = getDB();
      const r = await db.collection("customerFeedback").updateOne(
        { _id: new ObjectId(req.params.id) },
        {
          $set: {
            status,
            moderatedAt: new Date(),
            moderatedBy: req.user.email,
          },
        },
      );
      if (!r.matchedCount)
        return res.status(404).json({ message: "Feedback not found" });
      await writeAudit(
        db,
        req,
        "feedback.moderated",
        "customerFeedback",
        req.params.id,
        { status },
      );
      res.json({ message: "Feedback status updated", status });
    } catch (e) {
      next(e);
    }
  },
);
app.get(
  "/api/admin/business-control/audit",
  requireAdmin,
  async (req, res, next) => {
    try {
      const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
      const rows = await getDB()
        .collection("auditLogs")
        .find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
      res.json({ logs: rows });
    } catch (e) {
      next(e);
    }
  },
);
app.get(
  "/api/admin/business-control/reports",
  requireAdmin,
  async (req, res, next) => {
    try {
      const db = getDB();
      const from = req.query.from
        ? new Date(`${req.query.from}T00:00:00.000Z`)
        : new Date(Date.now() - 29 * 86400000);
      const to = req.query.to
        ? new Date(`${req.query.to}T23:59:59.999Z`)
        : new Date();
      if (
        Number.isNaN(from.getTime()) ||
        Number.isNaN(to.getTime()) ||
        from > to
      )
        return res.status(400).json({ message: "Invalid date range" });
      const [entries, bookings, feedback, items] = await Promise.all([
        db
          .collection("financeEntries")
          .find({ date: { $gte: from, $lte: to } })
          .limit(10000)
          .toArray(),
        db
          .collection("bookings")
          .find({ createdAt: { $gte: from, $lte: to } })
          .limit(10000)
          .toArray(),
        db
          .collection("customerFeedback")
          .find({ createdAt: { $gte: from, $lte: to } })
          .limit(10000)
          .toArray(),
        db.collection("inventory").find({}).limit(5000).toArray(),
      ]);
      const income = entries
          .filter((x) => x.type === "income")
          .reduce((n, x) => n + Number(x.amount || 0), 0),
        expense = entries
          .filter((x) => x.type === "expense")
          .reduce((n, x) => n + Number(x.amount || 0), 0);
      const statusCounts = {};
      for (const b of bookings)
        statusCounts[b.status || "Unknown"] =
          (statusCounts[b.status || "Unknown"] || 0) + 1;
      const categories = {};
      for (const e of entries) {
        const k = e.category || "Uncategorized";
        categories[k] = (categories[k] || 0) + Number(e.amount || 0);
      }
      res.json({
        from,
        to,
        finance: {
          income,
          expense,
          profit: income - expense,
          entries: entries.length,
          byCategory: categories,
        },
        bookings: {
          total: bookings.length,
          statusCounts,
          completed: bookings.filter((b) =>
            ["Completed", "completed"].includes(String(b.status)),
          ).length,
          cancelled: bookings.filter(
            (b) => String(b.status).toLowerCase() === "cancelled",
          ).length,
        },
        feedback: {
          count: feedback.length,
          averageRating: feedback.length
            ? Math.round(
                (feedback.reduce((n, f) => n + Number(f.rating || 0), 0) /
                  feedback.length) *
                  100,
              ) / 100
            : 0,
        },
        inventory: {
          items: items.length,
          stockValue: items.reduce(
            (n, x) => n + Number(x.quantity || 0) * Number(x.costPrice || 0),
            0,
          ),
          lowStock: items.filter(
            (x) => Number(x.quantity || 0) <= Number(x.reorderLevel || 0),
          ).length,
        },
      });
    } catch (e) {
      next(e);
    }
  },
);

app.use("/api/admin", cmsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", roleRoutes);
app.use("/api", bookingRoutes);
app.use("/api", contactRoutes);
app.use("/api", operationsRoutes);
app.use("/api", paymentRoutes);
app.use("/api", roleEnhancementRoutes);
app.use("/api", partnerRoutes);
app.use((req, res) =>
  res.status(404).json({ message: `Not found: ${req.method} ${req.path}` }),
);
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    message:
      process.env.NODE_ENV === "production"
        ? "Server error. Please try again."
        : err.message || "Server error",
  });
});
const port = Number(process.env.PORT || 5000);
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) { console.error("JWT_SECRET must be configured with at least 32 characters."); process.exit(1); }
try {
  await connectDB();
  app.listen(port, () =>
    console.log(`MU Home Service API running on port ${port}`),
  );
} catch (e) {
  console.error("Could not start API:", e.message);
  process.exit(1);
}
