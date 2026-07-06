import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpSecure = (process.env.SMTP_SECURE || "true") === "true";
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const fromEmail = process.env.MAIL_FROM || smtpUser || "no-reply@giftbox.lk";

function ensureMailerConfig() {
  if (!smtpUser || !smtpPass) {
    throw new Error("SMTP_USER and SMTP_PASS are required for email sending");
  }
}

function buildResetTemplate(resetUrl: string) {
  return `
  <div style="font-family: Arial, sans-serif; background:#f7f7fb; padding:24px;">
    <table role="presentation" style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden; border:1px solid #f0e6ed;">
      <tr>
        <td style="background:#A7066A; color:#ffffff; padding:20px 24px; font-size:22px; font-weight:700;">
          GiftBox Password Reset
        </td>
      </tr>
      <tr>
        <td style="padding:24px; color:#1F1720; line-height:1.6; font-size:15px;">
          <p style="margin:0 0 12px 0;">Hello,</p>
          <p style="margin:0 0 16px 0;">We received a request to reset your GiftBox account password. Click the button below to continue.</p>
          <p style="margin:24px 0;">
            <a href="${resetUrl}" style="display:inline-block; background:#A7066A; color:#ffffff; text-decoration:none; padding:12px 20px; border-radius:999px; font-weight:600;">Reset Password</a>
          </p>
          <p style="margin:0 0 12px 0; color:#6B5A64;">This link will expire in 1 hour.</p>
          <p style="margin:0; color:#6B5A64;">If you did not request this, you can safely ignore this email.</p>
        </td>
      </tr>
    </table>
  </div>`;
}

export async function sendPasswordResetEmail(params: { to: string; resetUrl: string }) {
  ensureMailerConfig();

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  await transporter.sendMail({
    from: `GiftBox <${fromEmail}>`,
    to: params.to,
    subject: "Reset your GiftBox password",
    html: buildResetTemplate(params.resetUrl),
  });
}
