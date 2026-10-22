import { Email } from "@convex-dev/auth/providers/Email";
import { generateRandomString, type RandomReader } from "@oslojs/crypto/random";
import { Resend } from "resend";
import { DEFAULT_TIERS } from "../lib/tier-list";
import { env } from "./_generated/server";

const FROM_ADDRESS = "Tier List Maker <noreply@mail.tierlistmaker.win>";
const APP_URL = "https://tierlistmaker.win";
const CODE_LIFETIME_MINUTES = 15;

// Email clients can't load Inter or the app's CSS variables, so the light
// theme's colors are inlined and the fonts fall back to system faces.
const FONT =
  "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const CODE_FONT =
  "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

const random: RandomReader = {
  read(bytes) {
    bytes.set(crypto.getRandomValues(new Uint8Array(bytes.length)));
  },
};

type EmailCopy = { subject: string; heading: string; intro: string };

const expiryNote = `This code expires in ${CODE_LIFETIME_MINUTES} minutes.`;
const ignoreNote = "If you didn't ask for it, you can ignore this email.";

function renderText({ intro }: EmailCopy, token: string) {
  return [intro, "", token, "", `${expiryNote} ${ignoreNote}`].join("\n");
}

// Table layout and inline styles keep the card intact in Gmail and Outlook.
// Every interpolated value is a constant or the numeric code, so nothing here
// needs escaping.
function renderHtml({ subject, heading, intro }: EmailCopy, token: string) {
  const lastTier = DEFAULT_TIERS.length - 1;
  const tierStripe = DEFAULT_TIERS.map((tier, index) => {
    const radius = index === 0 ? "6px 0 0 0" : index === lastTier ? "0 6px 0 0" : "0";
    return `<td height="10" style="height:10px;background:${tier.color};border-radius:${radius};font-size:0;line-height:0;">&nbsp;</td>`;
  }).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${subject}</title>
<style>
  @media (max-width: 480px) {
    .card-body { padding: 26px 20px 24px !important; }
    .code { font-size: 28px !important; letter-spacing: 4px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f7f7f2;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your code is ${token}. ${expiryNote}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f7f2;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
  <tr><td style="padding:0 0 24px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="vertical-align:middle;"><img src="${APP_URL}/email/brand-mark.png" width="46" height="46" alt="" style="display:block;border:0;"></td>
      <td style="vertical-align:middle;padding-left:12px;font-family:${FONT};font-size:18px;font-weight:800;color:#111111;">Tier List Maker</td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#ffffff;border:2px solid #111111;border-radius:8px;box-shadow:6px 6px 0 #111111;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:2px solid #111111;"><tr>${tierStripe}</tr></table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td class="card-body" style="padding:32px 28px 28px;font-family:${FONT};">
        <h1 style="margin:0 0 8px;font-size:24px;line-height:1.2;font-weight:800;color:#171717;">${heading}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#686861;">${intro}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td class="code" align="center" style="padding:18px 12px 18px 20px;background:#eefbf5;border:2px solid #111111;border-radius:8px;box-shadow:3px 3px 0 #111111;font-family:${CODE_FONT};font-size:34px;line-height:1.1;font-weight:800;letter-spacing:8px;color:#0b3d2d;">${token}</td>
        </tr></table>
        <p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:#686861;">${expiryNote}</p>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:24px 4px 0;font-family:${FONT};font-size:13px;line-height:1.5;color:#686861;">
    <p style="margin:0 0 8px;">${ignoreNote}</p>
    <p style="margin:0;"><a href="${APP_URL}" style="color:#057a59;font-weight:700;text-decoration:underline;">tierlistmaker.win</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// Every sign-in path proves the address with an 8-digit code, so each provider
// differs only in its id and the wording of the email.
function emailCodeProvider(id: string, copy: EmailCopy) {
  return Email({
    id,
    maxAge: CODE_LIFETIME_MINUTES * 60,
    async generateVerificationToken() {
      return generateRandomString(random, "0123456789", 8);
    },
    async sendVerificationRequest({ identifier: email, token }) {
      const { error } = await new Resend(env.AUTH_RESEND_KEY).emails.send({
        from: FROM_ADDRESS,
        to: [email],
        subject: copy.subject,
        html: renderHtml(copy, token),
        text: renderText(copy, token),
      });
      if (error) {
        throw new Error(`Could not send ${id} email: ${error.message}`);
      }
    },
  });
}

export const EmailCode = emailCodeProvider("email-code", {
  subject: "Your Tier List Maker sign-in code",
  heading: "Your sign-in code",
  intro: "Enter this code to sign in to Tier List Maker:",
});

export const PasswordVerificationCode = emailCodeProvider("password-verification", {
  subject: "Confirm your email for Tier List Maker",
  heading: "Confirm your email",
  intro: "Enter this code to confirm your email address:",
});

export const PasswordResetCode = emailCodeProvider("password-reset", {
  subject: "Reset your Tier List Maker password",
  heading: "Reset your password",
  intro: "Enter this code to choose a new password:",
});
