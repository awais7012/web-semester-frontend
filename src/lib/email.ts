import { Resend } from "resend";

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY environment variable is not set");
  return new Resend(key);
}

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL!;
const FROM = "Funroad <onboarding@resend.dev>";

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${APP_URL()}/verify-email?token=${token}`;

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Confirm your Funroad email",
    html: `
      <h2>Welcome to Funroad!</h2>
      <p>Click the button below to verify your email address. This link expires in 24 hours.</p>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:4px;">
        Verify Email
      </a>
      <p style="margin-top:16px;color:#666;font-size:14px;">Or copy this link: ${url}</p>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${APP_URL()}/reset-password?token=${token}`;

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Reset your Funroad password",
    html: `
      <h2>Reset your password</h2>
      <p>Click the button below to reset your password. This link expires in 1 hour.</p>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:4px;">
        Reset Password
      </a>
      <p style="margin-top:16px;color:#666;font-size:14px;">If you didn't request this, ignore this email.</p>
      <p style="color:#666;font-size:14px;">Or copy this link: ${url}</p>
    `,
  });
}
