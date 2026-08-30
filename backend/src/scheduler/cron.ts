import cron from "node-cron";
import { runDigest } from "../services/digestService";

interface DigestJobConfig {
  profileLabel: string;
  searchKeywords: string;
  searchLocation: string;
  limit: number;
  targetMatches: number;
}

// One search per profile. `limit` is the raw candidate pool scraped from LinkedIn — it needs
// to be generous since only a fraction of scraped jobs pass the H1B/stack/location filters.
// `targetMatches` is the number of actual matched-and-emailed jobs we're aiming for; the run
// stops early once it's hit, so a good day doesn't generate more resumes than needed.
const DAILY_JOBS: DigestJobConfig[] = [
  {
    profileLabel: "Software Developer",
    searchKeywords: "Software Engineer Full Stack TypeScript Node",
    searchLocation: "New York, United States",
    limit: 30,
    targetMatches: 6,
  },
  {
    profileLabel: "Mobile Developer",
    searchKeywords: "Mobile Application Developer Ionic Angular",
    searchLocation: "United States",
    limit: 25,
    targetMatches: 5,
  },
];

export function startScheduler(): void {
  // Runs every day at 6:00 AM Eastern Time, regardless of the server's own timezone
  // (cloud hosts typically default to UTC, which would silently shift this otherwise).
  cron.schedule(
    "0 6 * * *",
    async () => {
      console.log(`[${new Date().toISOString()}] Running scheduled daily digest...`);
      for (const job of DAILY_JOBS) {
        try {
          const summary = await runDigest(job);
          console.log(`Digest for "${job.profileLabel}":`, summary);
        } catch (err) {
          console.error(`Digest failed for "${job.profileLabel}":`, err);
        }
      }
    },
    { timezone: "America/New_York" }
  );

  console.log("Scheduler started — daily digest runs at 6:00 AM Eastern Time.");
}
