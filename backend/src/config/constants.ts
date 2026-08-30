export const EMPLOYER_SUFFIX_PATTERN =
  /\b(inc|incorporated|llc|l\.l\.c|corp|corporation|co|company|ltd|limited|plc)\b\.?/gi;

export function normalizeEmployerName(name: string): string {
  return name
    .toLowerCase()
    .replace(EMPLOYER_SUFFIX_PATTERN, "")
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const H1B_MATCH_CONFIDENCE_THRESHOLD = 0.82;
export const STACK_MATCH_SCORE_THRESHOLD = 0.3;

// Any US location is allowed — LinkedIn postings are almost always "City, ST" with a
// two-letter state code, not the literal phrase "United States", so the filter has to
// recognize every state, not just the priority ones. Bare "Remote" (no state/country) is
// intentionally NOT allowed, since that's exactly what let non-US jobs through before.
const US_STATE_NAMES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina",
  "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
  "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
  "District of Columbia",
];

const US_STATE_ABBREVIATIONS = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN",
  "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV",
  "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN",
  "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
];

const ALLOWED_LOCATION_PATTERNS: RegExp[] = [
  ...US_STATE_NAMES.map((name) => new RegExp(`\\b${name}\\b`, "i")),
  // Abbreviations need a comma before them ("City, NY") to avoid matching unrelated words
  // that happen to contain a state code, e.g. "IN" inside "Marketing".
  ...US_STATE_ABBREVIATIONS.map((abbr) => new RegExp(`,\\s*${abbr}\\b`, "i")),
  /\bunited states\b|\busa\b|\bu\.s\.a?\.?\b/i,
];

export function isAllowedLocation(location: string): boolean {
  return ALLOWED_LOCATION_PATTERNS.some((pattern) => pattern.test(location));
}
