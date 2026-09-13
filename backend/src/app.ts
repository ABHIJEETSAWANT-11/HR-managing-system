import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
// NOTE: express-mongo-sanitize removed - it is incompatible with Express 5
// (req.query is getter-only in Express 5, so the middleware threw
// "Cannot set property query of #<IncomingMessage> which has only a getter"
// on every request). NoSQL-injection protection is instead enabled at the
// query layer via mongoose connect option sanitizeFilter: true (see db.ts).
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


import authRoutes from "./modules/auth/auth.routes";
import jobRoutes, { publicJobRouter } from "./modules/jobs/job.routes";
import candidateRoutes from "./modules/candidates/candidate.routes";
import resumeRoutes from "./modules/resumes/resume.routes";
import applicationRoutes from "./modules/applications/application.routes";
import interviewRoutes from "./modules/interviews/interview.routes";
import offerRoutes from "./modules/offers/offer.routes";
import templateRoutes from "./modules/templates/template.routes";
import portalRoutes from "./modules/portal/portal.routes";
import notificationRoutes from "./modules/notifications/notification.routes";
import reportRoutes from "./modules/reports/report.routes";

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
app.use("/api/v1/offers", offerRoutes);
app.use("/api/v1/templates", templateRoutes);
app.use("/api/v1/candidates", candidateRoutes);
app.use("/api/v1/resumes", resumeRoutes);
app.use("/api/v1/applications", applicationRoutes);
app.use("/api/v1/interviews", interviewRoutes);
// Public candidate offer portal — NO auth middleware, dedicated rate limiter inside
app.use("/api/v1/portal/offers", portalRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/reports", reportRoutes);

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
