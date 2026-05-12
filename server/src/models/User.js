import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: "UserProfile" }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
