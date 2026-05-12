import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserProfile" },
    subject: { type: String, required: true },
    topic: { type: String, required: true },
    type: {
      type: String,
      enum: ["concept", "revision", "practice", "test", "pyq"],
      default: "concept"
    },
    estimatedMinutes: { type: Number, default: 60 },
    status: {
      type: String,
      enum: ["planned", "studied", "completed", "missed", "backlog"],
      default: "planned"
    },
    topicProgress: {
      type: String,
      enum: ["not-started", "in-progress", "needs-revision", "covered"],
      default: "not-started"
    },
    backlogWeight: { type: Number, default: 0 },
    dueDate: String,
    missedReason: String
  },
  { timestamps: true }
);

export default mongoose.model("Task", taskSchema);
