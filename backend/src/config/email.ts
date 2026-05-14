import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    // App passwords work with or without spaces; strip them to be safe
    pass: (process.env.GMAIL_APP_PASSWORD ?? "").replace(/\s+/g, ""),
  },
  tls: { rejectUnauthorized: false },
});

const FROM = `Funroad <${process.env.GMAIL_USER}>`;

export async function sendOTPEmail(to: string, username: string, otp: string): Promise<void> {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Your Funroad verification code: ${otp}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
        <h1 style="font-size:24px;font-weight:700;margin-bottom:8px">Verify your email</h1>
        <p style="color:#555;margin-bottom:24px">Hi ${username}, enter this code to verify your Funroad account:</p>
        <div style="background:#f4f4f0;border:2px solid #000;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
          <span style="font-size:40px;font-weight:700;letter-spacing:12px">${otp}</span>
        </div>
        <p style="color:#888;font-size:13px">This code expires in 10 minutes. If you didn't sign up, ignore this email.</p>
      </div>
    `,
  });
}

export async function sendVendorApprovedEmail(to: string, username: string): Promise<void> {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: "Your vendor account has been approved!",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
        <h1 style="font-size:24px;font-weight:700;margin-bottom:8px">You're approved!</h1>
        <p style="color:#555;margin-bottom:24px">Hi ${username}, your vendor account on Funroad has been approved by an admin.</p>
        <a href="${process.env.ROOT_DOMAIN ? `http://${process.env.ROOT_DOMAIN}` : "http://localhost:3000"}/sign-in"
           style="background:#000;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          Go to Dashboard
        </a>
      </div>
    `,
  });
}

export async function sendVendorRejectedEmail(to: string, username: string): Promise<void> {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: "Update on your Funroad vendor application",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
        <h1 style="font-size:24px;font-weight:700;margin-bottom:8px">Application not approved</h1>
        <p style="color:#555;margin-bottom:16px">Hi ${username}, thank you for applying to become a vendor on Funroad.</p>
        <p style="color:#555;margin-bottom:24px">
          Unfortunately your vendor application was not approved at this time.
          Your account remains active as a regular shopper — you can still browse and purchase products.
          If you believe this is a mistake, please contact our support team.
        </p>
        <a href="${process.env.ROOT_DOMAIN ? `http://${process.env.ROOT_DOMAIN}` : "http://localhost:3000"}"
           style="background:#000;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          Continue Shopping
        </a>
      </div>
    `,
  });
}
