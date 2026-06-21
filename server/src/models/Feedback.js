import mongoose from "mongoose";
import { getISTTimestamp } from "../utils/dateHelper.js";

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
    response: String,
    createdTime: { type: String, default: getISTTimestamp },
    updatedTime: { type: String, default: getISTTimestamp }
  },
  { timestamps: true }
);

feedbackSchema.pre("save", function (next) {
  this.updatedTime = getISTTimestamp();
  next();
});

export default mongoose.model("Feedback", feedbackSchema);
