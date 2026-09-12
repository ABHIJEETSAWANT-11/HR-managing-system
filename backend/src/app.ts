import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";

const app = express();

// 1. Security Headers
app.use(helmet());

// 2. CORS
app.use(
  cors({
    origin: env.CORS_ORIGINS.split(","),
    credentials: true,
  })
);

// 3. Body parser
app.use(express.json({ limit: "10kb" }));

// 4. NoSQL Injection Prevention
app.use(mongoSanitize());

import authRoutes from "./modules/auth/auth.routes";
import jobRoutes, { publicJobRouter } from "./modules/jobs/job.routes";
import candidateRoutes from "./modules/candidates/candidate.routes";
import resumeRoutes from "./modules/resumes/resume.routes";
import applicationRoutes from "./modules/applications/application.routes";

// 5. Global Rate Limiter
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
});
app.use("/api", globalLimiter);

// Auth Rate Limiter
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
});
import userRoutes from "./modules/users/user.routes";

app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/jobs", jobRoutes);
app.use("/api/v1/public/jobs", publicJobRouter);
app.use("/api/v1/candidates", candidateRoutes);
app.use("/api/v1/resumes", resumeRoutes);
app.use("/api/v1/applications", applicationRoutes);
app.use("/api/v1/interviews", interviewRoutes);

// Health routes
app.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "OK" });
});

// Central Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || "INTERNAL_SERVER_ERROR",
      message: err.message || "An unexpected error occurred",
    },
  });
});

export default app;
