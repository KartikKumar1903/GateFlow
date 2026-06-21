import mongoose from "mongoose";
import { getISTTimestamp } from "../utils/dateHelper.js";

const pyqSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserProfile" },
    year: { type: Number, required: true },
    subject: { type: String, required: true },
    topic: String,
    difficulty: { type: Number, min: 1, max: 5, default: 3 },
    status: {
      type: String,
      enum: ["not-started", "attempted", "revisit", "solved"],
      default: "not-started"
    },
    notes: String,
    createdTime: { type: String, default: getISTTimestamp },
    updatedTime: { type: String, default: getISTTimestamp }
  },
  { timestamps: true }
);

pyqSchema.pre("save", function (next) {
  this.updatedTime = getISTTimestamp();
  next();
});

export default mongoose.model("Pyq", pyqSchema);
