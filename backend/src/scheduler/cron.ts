import cron from "node-cron";
import { runDigest, DigestRunSummary } from "../services/digestService";

interface DigestProfileConfig {
  profileLabel: string;
  searchLocation: string;
  limit: number;
  targetMatches: number;
  // Tried in order, each a full extra Apify search, until targetMatches is hit or the
  // list runs out. A single day's search terms can just underdeliver on real postings,
  // so hitting a target reliably means being willing to search again with different
  // terms, not just scraping a bigger pile of results from the same search.
  keywordVariants: string[];
}

const DAILY_JOBS: DigestProfileConfig[] = [
  {
    profileLabel: "Software Developer",
    searchLocation: "United States",
    limit: 45,
    targetMatches: 6,
    keywordVariants: [
      "Software Engineer Full Stack TypeScript Node",
      "Full Stack Developer React Node TypeScript",
      "Backend Engineer Node TypeScript React",
    ],
  },
  {
    profileLabel: "Mobile Developer",
    searchLocation: "United States",
    limit: 35,
    targetMatches: 5,
    keywordVariants: [
      "Mobile Application Developer Ionic Angular",
      "Mobile Developer Ionic Cordova Android",
      "Hybrid Mobile Developer React Native TypeScript",
    ],
  },
];

async function runProfileUntilTarget(config: DigestProfileConfig): Promise<DigestRunSummary> {
  const combined: DigestRunSummary = { scraped: 0, alreadyProcessed: 0, rejected: 0, matched: 0, failed: 0 };

  for (const searchKeywords of config.keywordVariants) {
    const remaining = config.targetMatches - combined.matched;
    if (remaining <= 0) break;

    const summary = await runDigest({
      profileLabel: config.profileLabel,
      searchKeywords,
      searchLocation: config.searchLocation,
      limit: config.limit,
      targetMatches: remaining,
    });

    combined.scraped += summary.scraped;
    combined.alreadyProcessed += summary.alreadyProcessed;
    combined.rejected += summary.rejected;
    combined.matched += summary.matched;
    combined.failed += summary.failed;
  }

  return combined;
}

export function startScheduler(): void {
  // Runs every day at 6:00 AM Eastern Time, regardless of the server's own timezone
  // (cloud hosts typically default to UTC, which would silently shift this otherwise).
  cron.schedule(
    "0 6 * * *",
    async () => {
      console.log(`[${new Date().toISOString()}] Running scheduled daily digest...`);
      for (const job of DAILY_JOBS) {
        try {
          const summary = await runProfileUntilTarget(job);
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
