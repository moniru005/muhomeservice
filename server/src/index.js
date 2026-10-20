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
import { requireAdmin } from "./middleware/auth.js";
import { getDB } from "./db.js";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: (
      process.env.CLIENT_ORIGIN || "https://muhomeservice-client.vercel.app"
    )
      .split(",")
      .map((s) => s.trim()),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "100kb" }));
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
app.use("/uploads", express.static(uploadsRoot, profileStaticOptions));
app.use("/api/uploads", express.static(uploadsRoot, profileStaticOptions));
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
        let canAssign = false;
        let filter;
        if (req.user.role === "admin") filter = {};
        else if (req.user.role === "technician")
          filter = {
            $or: [
              { technicianId: req.user.sub },
              { technicianIds: req.user.sub },
            ],
          };
        else if (req.user.role === "staff") {
          const staff = await db.collection("users").findOne({
            _id: new (await import("mongodb")).ObjectId(req.user.sub),
            role: "staff",
            accountStatus: "approved",
          });
          canAssign = Boolean(
            staff && (staff.permissions || []).includes("assignTechnicians"),
          );
          filter = canAssign ? {} : { userId: req.user.sub };
        } else filter = { userId: req.user.sub };
        const [total, completed, bookings] = await Promise.all([
          db.collection("bookings").countDocuments(filter),
          db
            .collection("bookings")
            .countDocuments({ ...filter, status: "Completed" }),
          db
            .collection("bookings")
            .find(filter)
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray(),
        ]);
        res.json({
          total,
          completed,
          bookings,
          role: req.user.role,
          canAssign,
        });
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
app.get("/api/admin/finance", requireAdmin, async (_req, res, next) => {
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
app.post("/api/admin/finance", requireAdmin, async (req, res, next) => {
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
    const r = await getDB().collection("financeEntries").insertOne(entry);
    res.status(201).json({
      entry: { ...entry, _id: r.insertedId },
      message: "Finance entry saved",
    });
  } catch (e) {
    next(e);
  }
});
app.get("/api/admin/inventory", requireAdmin, async (_req, res, next) => {
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
app.post("/api/admin/inventory", requireAdmin, async (req, res, next) => {
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
app.patch("/api/admin/inventory/:id", requireAdmin, async (req, res, next) => {
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
app.delete("/api/admin/inventory/:id", requireAdmin, async (req, res, next) => {
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
  requireAdmin,
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
  requireAdmin,
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

app.use("/api/admin", cmsRoutes);
app.use("/api", cmsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", roleRoutes);
app.use("/api", bookingRoutes);
app.use("/api", contactRoutes);
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
try {
  await connectDB();
  app.listen(port, () =>
    console.log(`MU Home Service API running on port ${port}`),
  );
} catch (e) {
  console.error("Could not start API:", e.message);
  process.exit(1);
}
