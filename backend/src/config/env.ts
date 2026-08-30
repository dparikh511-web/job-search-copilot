import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required("DATABASE_URL"),
  apifyToken: process.env.APIFY_TOKEN ?? "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  digestToEmail: process.env.DIGEST_TO_EMAIL ?? "",
  dashboardUsername: required("DASHBOARD_USERNAME"),
  dashboardPassword: required("DASHBOARD_PASSWORD"),
};
