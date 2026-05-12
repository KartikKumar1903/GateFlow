import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserProfile" },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    message: { type: String, required: true },
    reasonType: {
      type: String,
      enum: ["time", "difficulty", "health", "fatigue", "external", "motivation", "unknown"],
      default: "unknown"
    },
    response: String
  },
  { timestamps: true }
);

export default mongoose.model("Feedback", feedbackSchema);
