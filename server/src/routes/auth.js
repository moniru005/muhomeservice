import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDB } from "../db.js";
import { ObjectId } from "mongodb";
import crypto from "node:crypto";
import nodemailer from "nodemailer";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { requireAuth } from "../middleware/auth.js";
const router = Router();
const uploadsDir = fileURLToPath(
  new URL("../../uploads/profiles/", import.meta.url),
);
fs.mkdirSync(uploadsDir, { recursive: true });
const profileUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) =>
      cb(
        null,
        `${String(req.user.sub).replace(/[^a-f0-9]/gi, "")}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`,
      ),
  }),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype))
      return cb(new Error("প্রোফাইল ফটো JPG, PNG অথবা WebP হতে হবে।"));
    cb(null, true);
  },
});
const safeUser = (u) => ({
  id: u._id.toString(),
  name: u.name,
  email: u.email,
  phone: u.phone || "",
  role: u.role || "customer",
  profilePhoto: u.profilePhoto || "",
});
function issueToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role || "customer",
    },
    process.env.JWT_SECRET,
    { expiresIn: "12h" },
  );
}
router.post("/register", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim(),
      email = String(req.body.email || "")
        .trim()
        .toLowerCase(),
      phone = String(req.body.phone || "").trim(),
      password = String(req.body.password || "");
    if (
      name.length < 2 ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      password.length < 8 ||
      !/^\+?[0-9\s()-]{8,18}$/.test(phone)
    )
      return res.status(400).json({
        message: "নাম, বৈধ ইমেইল, ফোন এবং কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড দিন।",
      });
    const users = getDB().collection("users");
    if (await users.findOne({ email }))
      return res
        .status(409)
        .json({ message: "এই ইমেইল দিয়ে অ্যাকাউন্ট রয়েছে।" });
    const requestedRole = String(
      req.body.accountType || "customer",
    ).toLowerCase();
    if (!["customer", "technician", "staff"].includes(requestedRole))
      return res.status(400).json({
        message:
          "নিবন্ধনের জন্য Customer, Technician অথবা Staff Role নির্বাচন করুন।",
      });
    const role = requestedRole;
    const user = {
      name,
      email,
      phone,
      passwordHash: await bcrypt.hash(password, 12),
      role,
      ...(["technician", "staff"].includes(role)
        ? { accountStatus: "pending" }
        : {}),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await users.insertOne(user);
    const pending = ["technician", "staff"].includes(role);
    res.status(201).json({
      message: pending
        ? "নিবন্ধন গ্রহণ করা হয়েছে। Admin অনুমোদনের পর লগইন করতে পারবেন।"
        : "অ্যাকাউন্ট তৈরি হয়েছে",
      ...(pending ? {} : { token: issueToken(user) }),
      user: safeUser(user),
    });
  } catch (e) {
    if (e.code === 11000)
      return res
        .status(409)
        .json({ message: "এই ইমেইল দিয়ে অ্যাকাউন্ট রয়েছে।" });
    next(e);
  }
});
router.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "")
        .trim()
        .toLowerCase(),
      password = String(req.body.password || "");
    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    let user = await getDB().collection("users").findOne({ email });
    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      if (
        ["staff", "technician"].includes(user.role) &&
        (user.role === "technician"
          ? user.technicianStatus || user.accountStatus
          : user.accountStatus) !== "approved"
      )
        return res.status(403).json({
          message: "আপনার অ্যাকাউন্টটি Admin অনুমোদনের অপেক্ষায় আছে।",
        });
      return res.json({
        token: issueToken(user),
        user: safeUser(user),
        admin:
          user.role === "admin"
            ? { name: user.name, email: user.email }
            : undefined,
      });
    }
    const admin = await getDB().collection("admins").findOne({ email });
    if (admin && (await bcrypt.compare(password, admin.passwordHash))) {
      const a = { ...admin, role: "admin" };
      return res.json({
        token: issueToken(a),
        user: {
          id: admin._id.toString(),
          name: admin.name,
          email: admin.email,
          phone: "",
          role: "admin",
        },
        admin: { name: admin.name, email: admin.email },
      });
    }
    return res.status(401).json({ message: "ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।" });
  } catch (e) {
    next(e);
  }
});

// Password recovery: store only a SHA-256 hash of the single-use token.
router.post("/forgot-password", async (req, res, next) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email))
      return res.status(400).json({ message: "একটি বৈধ ইমেইল ঠিকানা দিন।" });
    const db = getDB();
    const user = await db.collection("users").findOne({ email });
    const admin = user
      ? null
      : await db.collection("admins").findOne({ email });
    const account = user || admin;
    // Do not reveal whether an email address has an account.
    if (account) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");
      const now = new Date();
      await db.collection("passwordResets").deleteMany({ email });
      await db.collection("passwordResets").insertOne({
        email,
        tokenHash,
        accountType: user ? "users" : "admins",
        createdAt: now,
        expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
        usedAt: null,
      });
      const frontend = (
        process.env.FRONTEND_URL ||
        process.env.CLIENT_ORIGIN ||
        "http://localhost:5173"
      )
        .split(",")[0]
        .trim()
        .replace(/\/$/, "");
      const resetUrl = `${frontend}/reset-password?token=${rawToken}`;
      try {
        if (
          !process.env.SMTP_HOST ||
          !process.env.SMTP_USER ||
          !process.env.SMTP_PASS
        )
          throw new Error("SMTP is not configured");
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: String(process.env.SMTP_SECURE || "false") === "true",
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        await transporter.sendMail({
          from: process.env.MAIL_FROM || process.env.SMTP_USER,
          to: email,
          subject: "MU Home Service — Password Reset",
          text: `আপনার পাসওয়ার্ড পরিবর্তনের অনুরোধ এসেছে। ৩০ মিনিটের মধ্যে এই লিংক খুলুন: ${resetUrl}\nআপনি অনুরোধ না করলে এই ইমেইল উপেক্ষা করুন।`,
          html: `<div style="font-family:Arial,sans-serif;line-height:1.7"><h2>MU Home Service</h2><p>আপনার অ্যাকাউন্টের পাসওয়ার্ড পরিবর্তনের অনুরোধ এসেছে। লিংকটি ৩০ মিনিটের মধ্যে ব্যবহার করুন।</p><p><a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#0b2340;color:white;text-decoration:none;border-radius:8px">নতুন পাসওয়ার্ড সেট করুন</a></p><p>আপনি অনুরোধ না করলে এই ইমেইল উপেক্ষা করুন।</p></div>`,
        });
      } catch (mailError) {
        console.error(
          "Password reset email could not be sent:",
          mailError.message,
        );
        // Do not disclose or return the reset token. Configure SMTP before production use.
        await db.collection("passwordResets").deleteOne({ tokenHash });
      }
    }
    return res.json({
      message:
        "এই ইমেইলটি নিবন্ধিত থাকলে পাসওয়ার্ড পরিবর্তনের নির্দেশনা পাঠানো হবে। ইমেইলের Inbox ও Spam ফোল্ডার দেখুন।",
    });
  } catch (e) {
    next(e);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const token = String(req.body.token || "").trim();
    const password = String(req.body.password || "");
    if (!token || password.length < 8)
      return res.status(400).json({
        message: "বৈধ reset link এবং কমপক্ষে ৮ অক্ষরের নতুন পাসওয়ার্ড দিন।",
      });
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const db = getDB();
    const reset = await db
      .collection("passwordResets")
      .findOne({ tokenHash, usedAt: null, expiresAt: { $gt: new Date() } });
    if (!reset)
      return res.status(400).json({
        message:
          "লিংকটি মেয়াদোত্তীর্ণ বা ইতিমধ্যে ব্যবহার করা হয়েছে। নতুন করে Forgot Password করুন।",
      });
    const collection = db.collection(reset.accountType);
    const account = await collection.findOne({ email: reset.email });
    if (!account) {
      await db.collection("passwordResets").deleteOne({ _id: reset._id });
      return res.status(400).json({
        message: "অ্যাকাউন্ট পাওয়া যায়নি। আবার password reset অনুরোধ করুন।",
      });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await collection.updateOne(
      { _id: account._id },
      {
        $set: {
          passwordHash,
          updatedAt: new Date(),
          passwordChangedAt: new Date(),
        },
      },
    );
    await db.collection("passwordResets").deleteMany({ email: reset.email });
    return res.json({
      message:
        "নতুন পাসওয়ার্ড সফলভাবে সেট হয়েছে। এখন নতুন পাসওয়ার্ড দিয়ে লগইন করুন।",
    });
  } catch (e) {
    next(e);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.user.sub))
      return res.status(401).json({ message: "Session expired" });
    const collection = req.user.role === "admin" ? "admins" : "users";
    const u = await getDB()
      .collection(collection)
      .findOne(
        { _id: new ObjectId(req.user.sub) },
        { projection: { passwordHash: 0, password: 0, resetTokenHash: 0 } },
      );
    if (!u) return res.status(401).json({ message: "Account not found" });
    res.set("Cache-Control", "no-store");
    res.json({
      user: {
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        phone: u.phone || "",
        role: req.user.role,
        profilePhoto: u.profilePhoto || "",
        createdAt: u.createdAt || null,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.put("/me", requireAuth, (req, res, next) =>
  profileUpload.single("profilePhoto")(req, res, async (err) => {
    if (err) {
      const msg =
        err.code === "LIMIT_FILE_SIZE"
          ? "প্রোফাইল ফটো সর্বোচ্চ ৩ MB হতে পারবে।"
          : err.message || "ফটো আপলোড করা যায়নি।";
      return res.status(400).json({ message: msg });
    }
    try {
      if (!ObjectId.isValid(req.user.sub))
        return res.status(401).json({ message: "Session expired" });
      const collection = req.user.role === "admin" ? "admins" : "users";
      const accounts = getDB().collection(collection);
      const accountId = new ObjectId(req.user.sub);
      const current = await accounts.findOne({ _id: accountId });
      if (!current)
        return res.status(404).json({ message: "অ্যাকাউন্ট পাওয়া যায়নি।" });
      const name = String(req.body.name ?? current.name ?? "").trim();
      const phone = String(req.body.phone ?? current.phone ?? "").trim();
      if (name.length < 2 || name.length > 100) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res
          .status(400)
          .json({ message: "নাম ২ থেকে ১০০ অক্ষরের মধ্যে দিন।" });
      }
      if (phone && !/^\+?[0-9\s()-]{8,18}$/.test(phone)) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(400).json({ message: "সঠিক ফোন নম্বর দিন।" });
      }
      const update = { name, phone, updatedAt: new Date() };
      if (req.file)
        update.profilePhoto = `/uploads/profiles/${req.file.filename}`;
      await accounts.updateOne({ _id: accountId }, { $set: update });
      if (
        req.file &&
        current.profilePhoto &&
        current.profilePhoto.startsWith("/uploads/profiles/")
      ) {
        const oldPath = path.join(
          uploadsDir,
          path.basename(current.profilePhoto),
        );
        if (oldPath !== req.file.path) fs.unlink(oldPath, () => {});
      }
      const updated = { ...current, ...update };
      res.set("Cache-Control", "no-store");
      res.json({
        message: "প্রোফাইল সফলভাবে আপডেট হয়েছে।",
        user: {
          id: updated._id.toString(),
          name: updated.name,
          email: updated.email,
          phone: updated.phone || "",
          role: req.user.role,
          profilePhoto: updated.profilePhoto || "",
          createdAt: updated.createdAt || null,
        },
      });
    } catch (e) {
      if (req.file) fs.unlink(req.file.path, () => {});
      next(e);
    }
  }),
);
export default router;
