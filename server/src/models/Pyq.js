import mongoose from "mongoose";

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
    notes: String
  },
  { timestamps: true }
);

export default mongoose.model("Pyq", pyqSchema);
