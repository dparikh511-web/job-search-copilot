import stringSimilarity from "string-similarity";
import { query } from "../db/client";
import { normalizeEmployerName, H1B_MATCH_CONFIDENCE_THRESHOLD } from "../config/constants";

export interface H1bMatchResult {
  isMatch: boolean;
  confidence: number;
  matchedEmployerName: string | null;
}

interface LcaEmployerRow {
  raw_employer_name: string;
  employer_name_normalized: string;
}

export async function matchH1bSponsor(companyName: string): Promise<H1bMatchResult> {
  const normalized = normalizeEmployerName(companyName);

  const exact = await query<LcaEmployerRow>(
    `SELECT DISTINCT raw_employer_name, employer_name_normalized FROM lca_employers
     WHERE employer_name_normalized = $1 LIMIT 1`,
    [normalized]
  );
  if (exact.length > 0) {
    return { isMatch: true, confidence: 1, matchedEmployerName: exact[0].raw_employer_name };
  }

  const candidates = await query<LcaEmployerRow>(
    `SELECT DISTINCT raw_employer_name, employer_name_normalized FROM lca_employers
     WHERE employer_name_normalized LIKE $1 LIMIT 50`,
    [`${normalized.slice(0, 4)}%`]
  );

  if (candidates.length === 0) {
    return { isMatch: false, confidence: 0, matchedEmployerName: null };
  }

  const { bestMatch } = stringSimilarity.findBestMatch(
    normalized,
    candidates.map((c) => c.employer_name_normalized)
  );

  if (bestMatch.rating >= H1B_MATCH_CONFIDENCE_THRESHOLD) {
    const matchedCandidate = candidates.find(
      (c) => c.employer_name_normalized === bestMatch.target
    );
    return {
      isMatch: true,
      confidence: bestMatch.rating,
      matchedEmployerName: matchedCandidate?.raw_employer_name ?? null,
    };
  }

  return { isMatch: false, confidence: bestMatch.rating, matchedEmployerName: null };
}

export interface SponsorshipDisclaimerResult {
  explicitlyNoSponsorship: boolean;
  explicitlySponsors: boolean;
  matchedPhrase: string | null;
}

const NO_SPONSORSHIP_PATTERNS: RegExp[] = [
  /will not sponsor/i,
  /does not (?:provide|offer) (?:visa )?sponsorship/i,
  /unable to (?:provide|offer) (?:visa )?sponsorship/i,
  /no (?:visa )?sponsorship (?:is )?available/i,
  /not able to sponsor/i,
  /cannot sponsor/i,
  /without (?:the need for )?sponsorship(?: now or in the future)?/i,
  /authorized to work.{0,40}without.{0,20}sponsorship/i,
  /we do not sponsor/i,
  /not eligible for (?:visa )?sponsorship/i,
  /sponsorship is not (?:available|provided|offered)/i,
  /does not sponsor/i,
  /no longer sponsor/i,
];

const SPONSORSHIP_AVAILABLE_PATTERNS: RegExp[] = [
  /visa sponsorship (?:is )?available/i,
  /will sponsor (?:visa|h-?1b|employment)/i,
  /open to sponsoring/i,
  /sponsorship (?:is )?(?:provided|offered)/i,
  /we (?:do |can )?sponsor (?:visa|h-?1b|employment)/i,
];

/**
 * Job postings sometimes explicitly state their sponsorship stance in the text itself.
 * This is a more current signal than historical LCA filings, so it should override them
 * when present (a company that sponsored 2 years ago may say "no sponsorship" for this role).
 */
export function detectSponsorshipDisclaimer(jobText: string): SponsorshipDisclaimerResult {
  for (const pattern of NO_SPONSORSHIP_PATTERNS) {
    const match = jobText.match(pattern);
    if (match) {
      return { explicitlyNoSponsorship: true, explicitlySponsors: false, matchedPhrase: match[0] };
    }
  }
  for (const pattern of SPONSORSHIP_AVAILABLE_PATTERNS) {
    const match = jobText.match(pattern);
    if (match) {
      return { explicitlyNoSponsorship: false, explicitlySponsors: true, matchedPhrase: match[0] };
    }
  }
  return { explicitlyNoSponsorship: false, explicitlySponsors: false, matchedPhrase: null };
}
