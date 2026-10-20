import cron from "node-cron";
import { runDigest, DigestRunSummary } from "../services/digestService";
import { query } from "../db/client";

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

// Vacation pause: no digest runs before this date (Eastern, YYYY-MM-DD). Remove or move it
// forward to pause again.
const FIRST_RUN_DATE = "2026-10-19";
const TIMEZONE = "America/New_York";
const RUN_HOUR = 18;
// A missed 6 PM run is still worth catching up until this hour; later than that the 9-hour
// search window no longer lines up with the working day.
const CATCH_UP_UNTIL_HOUR = 23;

export function easternNow(now: Date = new Date()): { date: string; weekday: string; hour: number } {
  return {
    date: now.toLocaleDateString("en-CA", { timeZone: TIMEZONE }),
    weekday: now.toLocaleDateString("en-US", { weekday: "short", timeZone: TIMEZONE }),
    hour: Number(now.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: TIMEZONE })) % 24,
  };
}

// One digest per Eastern calendar day, enforced by a unique row in digest_log, so the 6 PM cron
// and the catch-up check below can never both run it.
export async function claimTodaysRun(date: string): Promise<boolean> {
  const rows = await query(
    "INSERT INTO digest_log (digest_date, email_status) VALUES ($1, 'started') ON CONFLICT (digest_date) DO NOTHING RETURNING id",
    [date]
  );
  return rows.length > 0;
}

async function runDailyDigest(source: "scheduled" | "catch-up"): Promise<void> {
  const { date } = easternNow();
  if (date < FIRST_RUN_DATE) {
    console.log(`[${new Date().toISOString()}] Digest paused until ${FIRST_RUN_DATE}; skipping.`);
    return;
  }
  if (!(await claimTodaysRun(date))) return;

  console.log(`[${new Date().toISOString()}] Running ${source} daily digest...`);
  for (const job of DAILY_JOBS) {
    try {
      const summary = await runProfileUntilTarget(job);
      console.log(`Digest for "${job.profileLabel}":`, summary);
    } catch (err) {
      console.error(`Digest failed for "${job.profileLabel}":`, err);
    }
  }
}

export function startScheduler(): void {
  // Runs weekdays at 6:00 PM Eastern, scraping jobs posted in the last SEARCH_WINDOW_HOURS,
  // regardless of the server's own timezone (cloud hosts typically default to UTC, which
  // would silently shift this otherwise). recoverMissedExecutions makes node-cron fire a
  // minute it skipped because of a stall instead of dropping it silently.
  cron.schedule(
    `0 ${RUN_HOUR} * * 1-5`,
    () => runDailyDigest("scheduled"),
    { timezone: TIMEZONE, recoverMissedExecutions: true }
  );

  // Safety net independent of node-cron's timer: if the 6 PM trigger was missed (server stall,
  // restart or deploy at exactly 6 PM), run the digest as soon as this notices.
  setInterval(async () => {
    try {
      const { weekday, hour } = easternNow();
      if (["Sat", "Sun"].includes(weekday) || hour < RUN_HOUR || hour >= CATCH_UP_UNTIL_HOUR) return;
      await runDailyDigest("catch-up");
    } catch (err) {
      console.error("Catch-up check failed:", err);
    }
  }, 5 * 60 * 1000);

  console.log(`Scheduler started — weekday digest runs at 6:00 PM Eastern Time (paused until ${FIRST_RUN_DATE}), with a 5-minute catch-up check.`);
}
