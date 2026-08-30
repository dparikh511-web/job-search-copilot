import "dotenv/config";
import { scrapeJobs } from "../services/apifyService";

async function main() {
  const jobs = await scrapeJobs("Software Engineer", "New York, United States", 3);
  console.log(jobs);
}

main();