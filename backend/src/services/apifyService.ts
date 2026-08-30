import { ApifyClient } from "apify-client";
import { env } from "../config/env";

const client = new ApifyClient({ token: env.apifyToken });

const LINKEDIN_JOBS_ACTOR = "curious_coder/linkedin-jobs-scraper";

export interface ScrapedJob {
  externalId: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  postedDate: string | null;
}

interface RawLinkedInJob {
  id: string;
  title: string;
  companyName: string;
  location: string;
  descriptionText: string;
  link: string;
  postedAt: string | null;
}

export async function scrapeJobs(
  keywords: string,
  location: string,
  limit: number = 20
): Promise<ScrapedJob[]> {
  const run = await client.actor(LINKEDIN_JOBS_ACTOR).call({
    keywords,
    location,
    datePosted: "pastWeek",
    limitPerSource: limit,
    scrapeCompany: false,
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  return (items as unknown as RawLinkedInJob[]).map((job) => ({
    externalId: job.id,
    title: job.title,
    company: job.companyName,
    location: job.location,
    description: job.descriptionText,
    url: job.link,
    postedDate: job.postedAt,
  }));
}
