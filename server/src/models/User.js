import mongoose from "mongoose";
import { getISTTimestamp } from "../utils/dateHelper.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: "UserProfile" },
    createdTime: { type: String, default: getISTTimestamp },
    updatedTime: { type: String, default: getISTTimestamp }
  },
  { timestamps: true }
);

userSchema.pre("save", function (next) {
  this.updatedTime = getISTTimestamp();
  next();
});

export default mongoose.model("User", userSchema);
