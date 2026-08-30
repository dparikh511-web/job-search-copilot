import express, { ErrorRequestHandler } from "express";
import cors from "cors";
import { basicAuth } from "./middleware/basicAuth";
import { profileRouter } from "./routes/profile";
import { jobsRouter } from "./routes/jobs";
import { applicationsRouter } from "./routes/applications";
import { digestRouter } from "./routes/digest";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Everything else under /api holds personal data (profile, resumes, job history) —
// require Basic Auth before any of it is reachable.
app.use("/api", basicAuth);

app.use("/api/profile", profileRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/applications", applicationsRouter);
app.use("/api/digest", digestRouter);

// Final safety net: an error from any route (e.g. a DB hiccup) becomes a 500 response
// instead of crashing the whole process and taking down every other request in flight.
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error("Unhandled route error:", err);
  res.status(500).json({ error: "Internal server error" });
};
app.use(errorHandler);
