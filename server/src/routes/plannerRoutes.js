import express from "express";
import Feedback from "../models/Feedback.js";
import Pyq from "../models/Pyq.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import UserProfile from "../models/UserProfile.js";
import { interpretFeedback } from "../services/feedback.js";
import { buildAdaptiveSchedule } from "../services/scheduler.js";

const router = express.Router();

router.post("/profiles", async (req, res) => {
  const profile = await UserProfile.create(req.body);
  if (req.body.userId) {
    await User.findByIdAndUpdate(req.body.userId, { profileId: profile._id });
  }
  res.status(201).json(profile);
});

router.get("/profiles/:id", async (req, res) => {
  const profile = await UserProfile.findById(req.params.id);
  res.json(profile);
});

router.put("/profiles/:id", async (req, res) => {
  const profile = await UserProfile.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(profile);
});

router.post("/schedule", async (req, res) => {
  const { profileId, profile: fallbackProfile } = req.body;
  const profile = profileId ? await UserProfile.findById(profileId) : fallbackProfile;
  const tasks = profileId ? await Task.find({ userId: profileId }) : req.body.tasks || [];

  if (!profile) {
    return res.status(400).json({ message: "Profile data is required to build a schedule." });
  }

  return res.json({ schedule: buildAdaptiveSchedule({ profile, tasks }) });
});

router.post("/tasks", async (req, res) => {
  const task = await Task.create(req.body);
  res.status(201).json(task);
});

router.patch("/tasks/:id/missed", async (req, res) => {
  const task = await Task.findByIdAndUpdate(
    req.params.id,
    {
      status: "backlog",
      missedReason: req.body.reason,
      $inc: { backlogWeight: 1 }
    },
    { new: true }
  );
  res.json(task);
});

router.post("/feedback", async (req, res) => {
  const interpretation = interpretFeedback(req.body.message);
  const feedback = await Feedback.create({
    ...req.body,
    reasonType: interpretation.type,
    response: interpretation.response
  });

  if (req.body.taskId) {
    await Task.findByIdAndUpdate(req.body.taskId, {
      status: "backlog",
      missedReason: req.body.message,
      $inc: { backlogWeight: interpretation.type === "difficulty" ? 2 : 1 }
    });
  }

  res.status(201).json(feedback);
});

router.get("/pyqs", async (req, res) => {
  const query = req.query.userId ? { userId: req.query.userId } : {};
  const pyqs = await Pyq.find(query).sort({ year: -1, subject: 1 });
  res.json(pyqs);
});

router.post("/pyqs", async (req, res) => {
  const pyq = await Pyq.create(req.body);
  res.status(201).json(pyq);
});

router.patch("/pyqs/:id", async (req, res) => {
  const pyq = await Pyq.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(pyq);
});

export default router;
