import mongoose from "mongoose";
import { getISTTimestamp } from "../utils/dateHelper.js";

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    selected: { type: Boolean, default: true },
    topics: [String],
    completedTopics: [String],
    topicProgress: { type: Map, of: String },
    coverage: { type: Number, min: 0, max: 100, default: 0 },
    difficulty: { type: Number, min: 1, max: 5, default: 3 },
    favorite: { type: Number, min: 1, max: 5, default: 3 },
    coverFirst: { type: Boolean, default: false }
  },
  { _id: false }
);

const timeSlotSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    start: { type: String, required: true },
    end: { type: String, required: true },
    energy: { type: Number, min: 1, max: 5, default: 3 }
  },
  { _id: false }
);

const userProfileSchema = new mongoose.Schema(
  {
    name: { type: String, default: "Aspirant" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    examDate: String,
    dailyStudyTarget: { type: Number, default: 5 },
    subjects: [subjectSchema],
    comfortableSlots: [timeSlotSchema],
    weakReasonTags: [String],
    backlog: { type: mongoose.Schema.Types.Mixed, default: [] },
    pyqState: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdTime: { type: String, default: getISTTimestamp },
    updatedTime: { type: String, default: getISTTimestamp }
  },
  { timestamps: true }
);

userProfileSchema.pre("save", function (next) {
  this.updatedTime = getISTTimestamp();
  next();
});

export default mongoose.model("UserProfile", userProfileSchema);
