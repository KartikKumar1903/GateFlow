import bcrypt from "bcryptjs";
import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import UserProfile from "../models/UserProfile.js";

const router = express.Router();
const tokenSecret = process.env.JWT_SECRET || "dev-secret-change-before-production";

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  profileId: user.profileId
});

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required." });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ message: "An account already exists with this email." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash });
  const token = jwt.sign({ userId: user._id }, tokenSecret, { expiresIn: "7d" });

  res.status(201).json({ user: publicUser(user), token, needsOnboarding: true });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).populate("profileId");

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const token = jwt.sign({ userId: user._id }, tokenSecret, { expiresIn: "7d" });
  res.json({ user: publicUser(user), profile: user.profileId, token, needsOnboarding: !user.profileId });
});

export default router;
