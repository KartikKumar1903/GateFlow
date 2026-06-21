import jwt from "jsonwebtoken";
import UserProfile from "../models/UserProfile.js";

const tokenSecret = process.env.JWT_SECRET || "dev-secret-change-before-production";

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication token required." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, tokenSecret);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

export const authorizeProfile = async (req, res, next) => {
  try {
    // Look for profile id in path params, request body, or query params
    const profileId = req.params.id || req.body.userId || req.query.userId;
    if (!profileId) {
      return res.status(400).json({ message: "Profile reference required." });
    }

    const profile = await UserProfile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found." });
    }

    // Check if the user ID from JWT matches the profile's owner
    if (profile.userId.toString() !== req.userId) {
      return res.status(403).json({ message: "Access denied. Unauthorized profile access." });
    }

    req.profile = profile;
    next();
  } catch (err) {
    return res.status(500).json({ message: "Server authorization error." });
  }
};
