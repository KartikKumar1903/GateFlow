import mongoose from "mongoose";

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
    weakReasonTags: [String]
  },
  { timestamps: true }
);

export default mongoose.model("UserProfile", userProfileSchema);
