import express from "express";
import Feedback from "../models/Feedback.js";
import Pyq from "../models/Pyq.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import UserProfile from "../models/UserProfile.js";
import { interpretFeedback } from "../services/feedback.js";
import { buildAdaptiveSchedule } from "../services/scheduler.js";
import { requireAuth, authorizeProfile } from "../middleware/auth.js";

const router = express.Router();

router.post("/profiles", requireAuth, async (req, res) => {
  // Ensure profile is linked to the authenticated user ID from JWT
  const profileData = { ...req.body, userId: req.userId };
  const profile = await UserProfile.create(profileData);
  if (req.userId) {
    await User.findByIdAndUpdate(req.userId, { profileId: profile._id });
  }
  res.status(201).json(profile);
});

router.get("/profiles/:id", requireAuth, authorizeProfile, async (req, res) => {
  res.json(req.profile);
});

router.put("/profiles/:id", requireAuth, authorizeProfile, async (req, res) => {
  const profile = await UserProfile.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(profile);
});

router.post("/schedule", requireAuth, async (req, res) => {
  const { profileId, profile: fallbackProfile } = req.body;
  const targetProfileId = profileId || (fallbackProfile ? fallbackProfile._id : null);
  
  if (targetProfileId) {
    const profile = await UserProfile.findById(targetProfileId);
    if (!profile || profile.userId.toString() !== req.userId) {
      return res.status(403).json({ message: "Unauthorized profile schedule build." });
    }
    const tasks = await Task.find({ userId: targetProfileId });
    return res.json({ schedule: buildAdaptiveSchedule({ profile, tasks }) });
  }

  if (fallbackProfile && fallbackProfile.userId && fallbackProfile.userId.toString() !== req.userId) {
    return res.status(403).json({ message: "Unauthorized profile schedule build." });
  }

  return res.json({ schedule: buildAdaptiveSchedule({ profile: fallbackProfile, tasks: req.body.tasks || [] }) });
});

router.post("/tasks", requireAuth, authorizeProfile, async (req, res) => {
  const task = await Task.create(req.body);
  res.status(201).json(task);
});

router.patch("/tasks/:id/missed", requireAuth, async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    return res.status(404).json({ message: "Task not found." });
  }
  const profile = await UserProfile.findById(task.userId);
  if (!profile || profile.userId.toString() !== req.userId) {
    return res.status(403).json({ message: "Unauthorized task update." });
  }

  task.status = "backlog";
  task.missedReason = req.body.reason;
  task.backlogWeight += 1;
  await task.save();
  res.json(task);
});

router.post("/feedback", requireAuth, authorizeProfile, async (req, res) => {
  const interpretation = interpretFeedback(req.body.message);
  const feedback = await Feedback.create({
    ...req.body,
    reasonType: interpretation.type,
    response: interpretation.response
  });

  if (req.body.taskId) {
    const task = await Task.findById(req.body.taskId);
    if (task && task.userId.toString() === req.body.userId) {
      task.status = "backlog";
      task.missedReason = req.body.message;
      task.backlogWeight += interpretation.type === "difficulty" ? 2 : 1;
      await task.save();
    }
  }

  res.status(201).json(feedback);
});

router.get("/pyqs", requireAuth, async (req, res) => {
  const userId = req.query.userId;
  if (userId) {
    const profile = await UserProfile.findById(userId);
    if (!profile || profile.userId.toString() !== req.userId) {
      return res.status(403).json({ message: "Unauthorized profile PYQ access." });
    }
  }
  const query = userId ? { userId } : {};
  const pyqs = await Pyq.find(query).sort({ year: -1, subject: 1 });
  res.json(pyqs);
});

router.post("/pyqs", requireAuth, authorizeProfile, async (req, res) => {
  const pyq = await Pyq.create(req.body);
  res.status(201).json(pyq);
});

router.patch("/pyqs/:id", requireAuth, async (req, res) => {
  const pyq = await Pyq.findById(req.params.id);
  if (!pyq) {
    return res.status(404).json({ message: "PYQ not found." });
  }
  const profile = await UserProfile.findById(pyq.userId);
  if (!profile || profile.userId.toString() !== req.userId) {
    return res.status(403).json({ message: "Unauthorized PYQ update." });
  }
  Object.assign(pyq, req.body);
  await pyq.save();
  res.json(pyq);
});

export default router;
