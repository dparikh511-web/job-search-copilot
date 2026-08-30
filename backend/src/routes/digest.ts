import { Router } from "express";
import { runDigest } from "../services/digestService";

export const digestRouter = Router();

digestRouter.post("/run", async (req, res) => {
  const { profileLabel, keywords, location, limit, targetMatches } = req.body ?? {};

  if (!profileLabel || !keywords || !location) {
    res.status(400).json({ error: "profileLabel, keywords, and location are required" });
    return;
  }

  try {
    const summary = await runDigest({
      profileLabel,
      searchKeywords: keywords,
      searchLocation: location,
      limit: limit ?? 5,
      targetMatches,
    });
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});
