import { ApifyClient } from "apify-client";
import { env } from "../config/env";
import { SEARCH_WINDOW_HOURS } from "../config/constants";

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
  // The actor's own datePosted option only offers 24 hours / week / month. LinkedIn's search
  // URL accepts any window in seconds (f_TPR=r<seconds>), and the actor takes a raw URL, so
  // build the URL ourselves to get a tighter window.
  const searchUrl =
    `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keywords)}` +
    `&location=${encodeURIComponent(location)}&position=1&pageNum=0` +
    `&f_TPR=r${SEARCH_WINDOW_HOURS * 3600}`;

  const run = await client.actor(LINKEDIN_JOBS_ACTOR).call({
    urls: [searchUrl],
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
