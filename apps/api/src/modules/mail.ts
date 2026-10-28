import { createHash } from "node:crypto";
import nodemailer from "nodemailer";
import { token } from "../security.js";
import { query, sql } from "../db.js";
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
let mailer:
  | ((message: {
      to: string;
      subject: string;
      text: string;
    }) => Promise<unknown>)
  | undefined;
export function useTestMailer(send: typeof mailer) {
  if (process.env.NODE_ENV !== "test") throw Error("Test uniquement");
  mailer = send;
}
export async function sendAccountMail(
  user: { id: string; email: string },
  purpose: "reset" | "verify",
) {
  if (!process.env.SMTP_HOST && !mailer)
    throw Object.assign(
      Error("Envoi d’e-mail non configuré. Contactez le propriétaire."),
      { status: 503 },
    );
  const secret = token();
  await query(
    sql`DELETE FROM account_tokens WHERE user_id=${user.id} AND purpose=${purpose}`,
  );
  await query(
    sql`INSERT INTO account_tokens(token_hash,user_id,purpose,expires_at) VALUES(${digest(secret)},${user.id},${purpose},${Date.now() + (purpose === "reset" ? 3600000 : 86400000)})`,
  );
  const message = {
    to: user.email,
    subject:
      purpose === "reset"
        ? "Réinitialiser votre mot de passe Mijovia"
        : "Vérifier votre adresse Mijovia",
    text: `Ouvrez ce lien pour ${purpose === "reset" ? "réinitialiser votre mot de passe" : "vérifier votre adresse"} : ${process.env.APP_ORIGIN}/connexion?${purpose}=${secret}\nSi vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.`,
  };
  try {
    if (mailer) await mailer(message);
    else
      await nodemailer
        .createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_PORT === "465",
          requireTLS: process.env.SMTP_PORT !== "465",
          auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
            : undefined,
        })
        .sendMail({ ...message, from: process.env.MAIL_FROM });
  } catch {
    await query(
      sql`DELETE FROM account_tokens WHERE token_hash=${digest(secret)}`,
    );
    throw Object.assign(Error("Envoi impossible. Réessayez plus tard."), {
      status: 503,
    });
  }
}
