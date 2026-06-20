import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
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
    if (process.env.USE_LOCAL_DB === 'true') {
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      console.log(`Local MongoDB Memory Server connected: ${mongoUri}`);
    } else if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("MongoDB connected");
    } else {
      console.warn("No MongoDB configuration provided. Starting API without database connection.");
    }

    // Serve React frontend in production
    app.use(express.static(path.join(__dirname, "../../client/dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "../../client/dist/index.html"));
    });

    app.listen(port, () => {
      console.log(`API listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Unable to start API", error);
    process.exit(1);
  }
};

start();
