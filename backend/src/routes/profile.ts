import { Router } from "express";
import { query } from "../db/client";
import { asyncHandler } from "./asyncHandler";

export const profileRouter = Router();

profileRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const profiles = await query("SELECT * FROM profile ORDER BY id");
    res.json(profiles);
  })
);

profileRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const rows = await query("SELECT * FROM profile WHERE id = $1", [req.params.id]);
    if (rows.length === 0) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    res.json(rows[0]);
  })
);
