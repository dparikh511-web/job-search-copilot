import "dotenv/config";
import { runDigest } from "../services/digestService";

async function main() {
  const profileLabel = process.argv[2] ?? "Software Developer";
  const keywords = process.argv[3] ?? "Software Engineer";
  const location = process.argv[4] ?? "New York, United States";
  const limit = Number(process.argv[5] ?? 5);
  const targetMatches = process.argv[6] ? Number(process.argv[6]) : undefined;

  console.log(`Running digest for profile "${profileLabel}" | "${keywords}" in "${location}" (limit ${limit}, target ${targetMatches ?? "none"})`);
  const summary = await runDigest({ profileLabel, searchKeywords: keywords, searchLocation: location, limit, targetMatches });
  console.log("Summary:", summary);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
