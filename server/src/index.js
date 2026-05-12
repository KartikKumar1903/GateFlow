import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";
import plannerRoutes from "./routes/plannerRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "gate-cse-adaptive-planner" });
});

app.use("/api/auth", authRoutes);
app.use("/api", plannerRoutes);

const start = async () => {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("MongoDB connected");
    } else {
      console.log("MONGODB_URI missing; API will run without database persistence.");
    }

    app.listen(port, () => {
      console.log(`API listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Unable to start API", error);
    process.exit(1);
  }
};

start();
