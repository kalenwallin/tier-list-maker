import { Email } from "@convex-dev/auth/providers/Email";
import { generateRandomString, type RandomReader } from "@oslojs/crypto/random";
import { Resend } from "resend";
import { env } from "./_generated/server";

const FROM_ADDRESS = "Tier List Maker <noreply@mail.tierlistmaker.win>";
const CODE_LIFETIME_MINUTES = 15;

const random: RandomReader = {
  read(bytes) {
    bytes.set(crypto.getRandomValues(new Uint8Array(bytes.length)));
  },
};

// Every sign-in path proves the address with an 8-digit code, so each provider
// differs only in its id and the wording of the email.
function emailCodeProvider(id: string, subject: string, intro: string) {
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
        subject,
        text: [
          intro,
          "",
          token,
          "",
          `The code expires in ${CODE_LIFETIME_MINUTES} minutes. If you didn't ask for it, you can ignore this email.`,
        ].join("\n"),
      });
      if (error) {
        throw new Error(`Could not send ${id} email: ${error.message}`);
      }
    },
  });
}

export const EmailCode = emailCodeProvider(
  "email-code",
  "Your Tier List Maker sign-in code",
  "Enter this code to sign in to Tier List Maker:",
);

export const PasswordVerificationCode = emailCodeProvider(
  "password-verification",
  "Confirm your email for Tier List Maker",
  "Enter this code to confirm your email address:",
);

export const PasswordResetCode = emailCodeProvider(
  "password-reset",
  "Reset your Tier List Maker password",
  "Enter this code to choose a new password:",
);
