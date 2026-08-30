import { Router } from "express";
import { query } from "../db/client";
import { asyncHandler } from "./asyncHandler";

export const jobsRouter = Router();

jobsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : null;
    const rows = status
      ? await query("SELECT * FROM jobs WHERE status = $1 ORDER BY id DESC", [status])
      : await query("SELECT * FROM jobs ORDER BY id DESC");
    res.json(rows);
  })
);

jobsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const rows = await query("SELECT * FROM jobs WHERE id = $1", [req.params.id]);
    if (rows.length === 0) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json(rows[0]);
  })
);

const VALID_STATUSES = ["new", "matched", "generated", "digested", "applied", "rejected"];

jobsRouter.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const { status } = req.body ?? {};
    if (!VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
      return;
    }
    const rows = await query("UPDATE jobs SET status = $1 WHERE id = $2 RETURNING *", [
      status,
      req.params.id,
    ]);
    if (rows.length === 0) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json(rows[0]);
  })
);
