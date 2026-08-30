import { Resend } from "resend";
import { env } from "../config/env";

const resend = new Resend(env.resendApiKey);

const FROM_ADDRESS = "onboarding@resend.dev";

export interface EmailAttachment {
  filename: string;
  content: Buffer;
}

export async function sendDigestEmail(
  subject: string,
  html: string,
  attachments: EmailAttachment[] = []
): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: env.digestToEmail,
    subject,
    html,
    attachments,
  });

  if (error) {
    throw new Error(`Failed to send digest email: ${error.message}`);
  }
}
