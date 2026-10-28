import { fileURLToPath } from "node:url";
import { application } from "./modules/routes.js";
import { json } from "./modules/data.js";
import { sendAccountMail } from "./modules/mail.js";
import "dotenv/config";
import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { createHash, randomUUID } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { db, query, sql } from "./db.js";
import {
  token,
  hashPassword,
  checkPassword,
  canRemove,
  validMutation,
} from "./security.js";
const env = z
  .object({
    APP_ORIGIN: z.url(),
    DATABASE_URL: z.string().min(1),
    RP_ID: z.string().default("localhost"),
  })
  .parse(process.env);
const origin = new URL(env.APP_ORIGIN).origin;
const production = process.env.NODE_ENV === "production";
if (production && !origin.startsWith("https://")) throw Error("HTTPS requis");
const google =
  process.env.GOOGLE_ENABLED === "true" && !!process.env.GOOGLE_CLIENT_ID;
const passkeys = process.env.PASSKEYS_ENABLED === "true";
export const app = express();
if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);
app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    contentSecurityPolicy: {
      directives: {
        "script-src": ["'self'", "https://accounts.google.com/gsi/client"],
        "frame-src": ["'self'", "https://accounts.google.com"],
        "connect-src": ["'self'", "https://accounts.google.com"],
        "img-src": ["'self'", "data:", "https:"],
        "style-src": [
          "'self'",
          "'unsafe-inline'",
          "https://accounts.google.com",
        ],
      },
    },
  }),
);
app.use(express.json({ limit: "128kb" }));
app.use(
  "/api/v1",
  rateLimit({
    windowMs: 60000,
    limit: process.env.NODE_ENV === "test" ? 5000 : 500,
  }),
);
const fail = (message = "Opération refusée", status = 400) =>
  Object.assign(new Error(message), { status });
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const cookieName = production ? "__Host-mijovia" : "mijovia";
const cookieOptions = {
  httpOnly: true,
  secure: production,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 30 * 86400000,
};
app.use("/api/v1/auth", rateLimit({ windowMs: 15 * 60000, limit: 100 }));
app.use("/api/v1", async (req, res, next) => {
  try {
    const raw = req.headers.cookie
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith(cookieName + "="))
      ?.slice(cookieName.length + 1);
    let session =
      raw && /^[a-f0-9]{64}$/.test(raw)
        ? (
            await query(
              sql`SELECT * FROM sessions WHERE id=${digest(raw)} AND expires_at>${Date.now()}`,
            )
          )[0]
        : null;
    if (!session) {
      const secret = token();
      session = {
        id: digest(secret),
        user_id: null,
        csrf: token(),
        verified_at: 0,
      };
      await query(
        sql`INSERT INTO sessions(id,csrf,expires_at) VALUES(${session.id},${session.csrf},${Date.now() + 30 * 86400000})`,
      );
      res.cookie(cookieName, secret, cookieOptions);
    }
    if (session.user_id) {
      const [user] = await query(
        sql`SELECT suspended FROM users WHERE id=${session.user_id}`,
      );
      if (!user || user.suspended) {
        await query(sql`DELETE FROM sessions WHERE id=${session.id}`);
        throw fail("Compte indisponible", 401);
      }
    }
    res.setHeader("Cache-Control", "no-store");
    res.locals.session = session;
    if (
      !["GET", "HEAD"].includes(req.method) &&
      !validMutation(
        origin,
        req.headers.origin,
        session.csrf,
        req.headers["x-csrf-token"],
      )
    )
      throw fail("Requête expirée ou origine incorrecte", 403);
    next();
  } catch (e) {
    next(e);
  }
});
const router = express.Router();
app.use("/api/v1/auth", router);
function signed(res: express.Response) {
  if (!res.locals.session.user_id) throw fail("Connexion requise", 401);
  return res.locals.session.user_id as string;
}
function recent(res: express.Response) {
  const id = signed(res);
  if (Date.now() - Number(res.locals.session.verified_at) > 300000)
    throw fail("Vérifiez à nouveau votre identité (moins de 5 minutes)", 403);
  return id;
}
async function login(res: express.Response, id: string) {
  const [user] = await query(sql`SELECT suspended FROM users WHERE id=${id}`);
  if (!user || user.suspended) throw fail("Compte indisponible", 403);
  const old = res.locals.session;
  const secret = token();
  await db.transaction(async (tx) => {
    await tx.execute(sql`DELETE FROM sessions WHERE id=${old.id}`);
    await tx.execute(
      sql`INSERT INTO sessions(id,user_id,csrf,verified_at,expires_at) VALUES(${digest(secret)},${id},${token()},${Date.now()},${Date.now() + 30 * 86400000})`,
    );
  });
  res.cookie(cookieName, secret, cookieOptions);
  res.json({ ok: true });
}
async function challenge(
  res: express.Response,
  purpose: string,
  value: string,
) {
  await query(
    sql`REPLACE INTO challenges(session_id,purpose,value,expires_at) VALUES(${res.locals.session.id},${purpose},${value},${Date.now() + 300000})`,
  );
}
async function consume(
  res: express.Response,
  purpose: string,
): Promise<string> {
  return db
    .transaction(async (tx) => {
      const [rows]: any = await tx.execute(
        sql`SELECT * FROM challenges WHERE session_id=${res.locals.session.id} FOR UPDATE`,
      );
      await tx.execute(
        sql`DELETE FROM challenges WHERE session_id=${res.locals.session.id}`,
      );
      if (
        !rows[0] ||
        rows[0].purpose !== purpose ||
        Number(rows[0].expires_at) < Date.now()
      )
        return "";
      return rows[0].value;
    })
    .then((v) => {
      if (!v) throw fail("Challenge expiré");
      return v;
    });
}
router.get("/config", async (req, res) =>
  res.json({
    google: google ? { clientId: process.env.GOOGLE_CLIENT_ID } : null,
    registration: (
      await query(sql`SELECT data FROM settings WHERE id='registration'`)
    ).map((r) => json(r.data))[0],
    mail: !!process.env.SMTP_HOST,
    passkeys,
    apple: false,
    csrf: res.locals.session.csrf,
  }),
);
router.get("/me", async (req, res) => {
  const id = res.locals.session.user_id;
  if (!id) {
    res.json(null);
    return;
  }
  const [user] = await query(
    sql`SELECT id,email,name,role,email_verified,password_hash IS NOT NULL AS password FROM users WHERE id=${id}`,
  );
  res.json({
    ...user,
    identities: await query(
      sql`SELECT id,provider FROM identities WHERE user_id=${id}`,
    ),
    passkeys: await query(
      sql`SELECT id,name FROM passkeys WHERE user_id=${id}`,
    ),
  });
});
async function registrationAllowed(
  invitation?: string,
  tx: any = db,
  consume = false,
) {
  const [rows]: any = await tx.execute(
    sql`SELECT data FROM settings WHERE id='registration'`,
  );
  const settings = json(rows[0].data);
  if (!settings.enabled) throw fail("Les inscriptions sont fermées", 403);
  if (settings.invitationOnly) {
    if (!invitation) throw fail("Invitation requise", 403);
    const [invites]: any = await tx.execute(
      sql`SELECT token_hash FROM signup_invitations WHERE token_hash=${digest(invitation)} AND used_at IS NULL AND expires_at>${Date.now()} FOR UPDATE`,
    );
    if (!invites.length) throw fail("Invitation invalide", 403);
    if (consume)
      await tx.execute(
        sql`UPDATE signup_invitations SET used_at=${Date.now()} WHERE token_hash=${digest(invitation)}`,
      );
  }
}
const credentials = z.object({
  email: z
    .email()
    .max(254)
    .transform((x) => x.toLowerCase()),
  password: z.string().min(12).max(128),
});
router.post(
  "/register",
  rateLimit({
    windowMs: 3600000,
    limit: process.env.NODE_ENV === "test" ? 1000 : 10,
  }),
  async (req, res) => {
    const data = credentials
      .extend({
        name: z.string().trim().min(1).max(100),
        confirmation: z.string(),
        legalAccepted: z.literal(true),
        website: z.string().max(0).default(""),
        invitation: z.string().optional(),
      })
      .refine((v) => v.password === v.confirmation, "Mots de passe différents")
      .parse(req.body);
    await registrationAllowed(data.invitation);
    const id = randomUUID();
    const hash = await hashPassword(data.password);
    try {
      await db.transaction(async (tx) => {
        await registrationAllowed(data.invitation, tx, true);
        await tx.execute(
          sql`INSERT INTO users(id,email,name,password_hash,legal_version,legal_accepted_at) VALUES(${id},${data.email},${data.name},${hash},'1-draft',NOW())`,
        );
      });
    } catch (e: any) {
      if ((e.code || e.cause?.code) === "ER_DUP_ENTRY")
        throw fail(
          "Impossible de créer ce compte. Connectez-vous avec votre méthode habituelle.",
          409,
        );
      throw e;
    }
    if (process.env.SMTP_HOST) {
      try {
        await sendAccountMail({ id, email: data.email }, "verify");
      } catch {
        /* Le compte reste accessible, le lien peut être redemandé. */
      }
    }
    await login(res, id);
  },
);
router.post("/password", async (req, res) => {
  const data = credentials.parse(req.body);
  const [user] = await query(
    sql`SELECT * FROM users WHERE email=${data.email}`,
  );
  const valid = await checkPassword(
    data.password,
    user?.password_hash || (await hashPassword(token())),
  );
  if (!user?.password_hash || !valid)
    throw fail("Identifiants incorrects", 401);
  if (res.locals.session.user_id && res.locals.session.user_id !== user.id)
    throw fail();
  await login(res, user.id);
});
router.post("/password/set", async (req, res) => {
  const id = recent(res);
  const password = z.string().min(12).max(128).parse(req.body.password);
  const hash = await hashPassword(password);
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`UPDATE users SET password_hash=${hash} WHERE id=${id}`,
    );
    await tx.execute(
      sql`DELETE FROM sessions WHERE user_id=${id} AND id<>${res.locals.session.id}`,
    );
  });
  res.json({ ok: true });
});
router.post("/logout", async (req, res) => {
  await query(sql`DELETE FROM sessions WHERE id=${res.locals.session.id}`);
  res.clearCookie(cookieName, {
    httpOnly: true,
    secure: production,
    sameSite: "lax",
    path: "/",
  });
  res.json({ ok: true });
});
router.post("/google/options", async (req, res) => {
  if (!google) throw fail("Google indisponible", 404);
  const mode = z.enum(["login", "link"]).parse(req.body.mode);
  if (mode === "link") signed(res);
  const nonce = token();
  await challenge(res, "google-" + mode, nonce);
  res.json({ nonce });
});
router.post("/google", async (req, res) => {
  if (!google) throw fail("Google indisponible", 404);
  const data = z
    .object({
      credential: z.string().max(10000),
      mode: z.enum(["login", "link"]),
      legalAccepted: z.boolean().optional(),
      invitation: z.string().optional(),
    })
    .parse(req.body);
  const nonce = await consume(res, "google-" + data.mode);
  const ticket = await new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
    .verifyIdToken({
      idToken: data.credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    .catch(() => {
      throw fail("Identité Google non valide", 401);
    });
  const payload = ticket.getPayload();
  if (
    !payload ||
    (payload as typeof payload & { nonce?: string }).nonce !== nonce ||
    !payload.email ||
    !payload.email_verified
  )
    throw fail("Identité Google non vérifiée", 401);
  const [identity] = await query(
    sql`SELECT user_id FROM identities WHERE provider='google' AND subject=${payload.sub}`,
  );
  if (data.mode === "link") {
    const id = signed(res);
    if (!identity) recent(res);
    if (identity && identity.user_id !== id)
      throw fail("Cette identité est déjà associée", 409);
    if (!identity)
      await query(
        sql`INSERT INTO identities(id,user_id,provider,subject) VALUES(${randomUUID()},${id},'google',${payload.sub})`,
      );
    await query(
      sql`UPDATE sessions SET verified_at=${Date.now()} WHERE id=${res.locals.session.id}`,
    );
    res.json({ ok: true });
    return;
  }
  if (
    res.locals.session.user_id &&
    identity?.user_id !== res.locals.session.user_id
  )
    throw fail("Déconnectez-vous avant de changer de compte");
  if (identity) {
    await login(res, identity.user_id);
    return;
  }
  await registrationAllowed(data.invitation);
  if (!data.legalAccepted)
    throw fail("Acceptez les documents légaux avant de créer votre compte");
  const id = randomUUID();
  try {
    await db.transaction(async (tx) => {
      await registrationAllowed(data.invitation, tx, true);
      await tx.execute(
        sql`INSERT INTO users(id,email,name,email_verified,legal_version,legal_accepted_at) VALUES(${id},${payload.email!.toLowerCase()},${(payload.name || "Utilisateur").slice(0, 100)},true,'1-draft',NOW())`,
      );
      await tx.execute(
        sql`INSERT INTO identities(id,user_id,provider,subject) VALUES(${randomUUID()},${id},'google',${payload.sub})`,
      );
    });
  } catch (e: any) {
    if ((e.code || e.cause?.code) === "ER_DUP_ENTRY")
      throw fail(
        "Connectez-vous à votre compte existant puis associez Google dans les paramètres.",
        409,
      );
    throw e;
  }
  await login(res, id);
});
router.post("/passkeys/register/options", async (req, res) => {
  if (!passkeys) throw fail("Passkeys indisponibles", 404);
  const id = recent(res);
  const [user] = await query(sql`SELECT email FROM users WHERE id=${id}`);
  const keys = await query(sql`SELECT id FROM passkeys WHERE user_id=${id}`);
  const options = await generateRegistrationOptions({
    rpName: "Mijovia",
    rpID: env.RP_ID,
    userID: Buffer.from(id),
    userName: user.email,
    attestationType: "none",
    excludeCredentials: keys.map((k) => ({ id: k.id })),
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
  });
  await challenge(res, "register", options.challenge);
  res.json(options);
});
router.post("/passkeys/register", async (req, res) => {
  if (!passkeys) throw fail("", 404);
  const id = recent(res);
  const expectedChallenge = await consume(res, "register");
  const result = await verifyRegistrationResponse({
    response: req.body.response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: env.RP_ID,
    requireUserVerification: true,
  });
  if (!result.verified || !result.registrationInfo) throw fail();
  const c = result.registrationInfo.credential;
  const name = z.string().trim().min(1).max(100).parse(req.body.name);
  await query(
    sql`INSERT INTO passkeys(id,user_id,public_key,counter,transports,name) VALUES(${c.id},${id},${Buffer.from(c.publicKey).toString("base64")},${c.counter},${JSON.stringify(c.transports || [])},${name})`,
  );
  res.json({ ok: true });
});
router.post("/passkeys/options", async (req, res) => {
  if (!passkeys) throw fail("", 404);
  const options = await generateAuthenticationOptions({
    rpID: env.RP_ID,
    userVerification: "required",
  });
  await challenge(res, "authenticate", options.challenge);
  res.json(options);
});
router.post("/passkeys/authenticate", async (req, res) => {
  if (!passkeys) throw fail("", 404);
  const expectedChallenge = await consume(res, "authenticate");
  const keyId = z.string().max(255).parse(req.body.id);
  let userId = "";
  await db.transaction(async (tx) => {
    const [rows]: any = await tx.execute(
      sql`SELECT * FROM passkeys WHERE id=${keyId} FOR UPDATE`,
    );
    const key = rows[0];
    if (!key) throw fail("Clé inconnue", 401);
    if (
      res.locals.session.user_id &&
      key.user_id !== res.locals.session.user_id
    )
      throw fail();
    const result = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: env.RP_ID,
      requireUserVerification: true,
      credential: {
        id: key.id,
        publicKey: Buffer.from(key.public_key, "base64"),
        counter: Number(key.counter),
        transports: JSON.parse(key.transports),
      },
    });
    if (!result.verified) throw fail();
    await tx.execute(
      sql`UPDATE passkeys SET counter=${result.authenticationInfo.newCounter} WHERE id=${key.id}`,
    );
    userId = key.user_id;
  });
  await login(res, userId);
});
router.delete("/methods/:kind/:id", async (req, res) => {
  const userId = recent(res);
  const kind = z.enum(["google", "passkey", "password"]).parse(req.params.kind);
  await db.transaction(async (tx) => {
    const [users]: any = await tx.execute(
      sql`SELECT password_hash FROM users WHERE id=${userId} FOR UPDATE`,
    );
    const [identities]: any = await tx.execute(
      sql`SELECT id,provider FROM identities WHERE user_id=${userId}`,
    );
    const [keys]: any = await tx.execute(
      sql`SELECT id FROM passkeys WHERE user_id=${userId}`,
    );
    const target =
      kind === "password"
        ? users[0].password_hash
          ? { id: "password" }
          : undefined
        : kind === "google"
          ? identities.find(
              (x: any) => x.id === req.params.id && x.provider === "google",
            )
          : keys.find((x: any) => x.id === req.params.id);
    if (!target) throw fail("", 404);
    const remaining =
      Number(!!users[0].password_hash) +
      (google ? identities.length : 0) +
      (passkeys ? keys.length : 0) -
      Number(
        kind === "password"
          ? !!users[0].password_hash
          : kind === "google"
            ? google
            : passkeys,
      );
    if (!canRemove(remaining))
      throw fail("Conservez au moins une méthode de connexion disponible");
    if (kind === "password")
      await tx.execute(
        sql`UPDATE users SET password_hash=NULL WHERE id=${userId}`,
      );
    else if (kind === "google")
      await tx.execute(
        sql`DELETE FROM identities WHERE id=${target.id} AND user_id=${userId}`,
      );
    else
      await tx.execute(
        sql`DELETE FROM passkeys WHERE id=${target.id} AND user_id=${userId}`,
      );
    await tx.execute(
      sql`DELETE FROM sessions WHERE user_id=${userId} AND id<>${res.locals.session.id}`,
    );
  });
  res.json({ ok: true });
});
router.post("/forgot", async (req, res) => {
  const email = z.email().toLowerCase().parse(req.body.email);
  if (!process.env.SMTP_HOST && process.env.NODE_ENV !== "test")
    throw fail("Envoi d’e-mail non configuré", 503);
  const [user] = await query(
    sql`SELECT id,email FROM users WHERE email=${email} AND suspended=false`,
  );
  if (user) await sendAccountMail(user, "reset");
  res.json({ ok: true, message: "Si ce compte existe, un lien a été envoyé." });
});
router.post("/verify/request", async (req, res) => {
  const id = signed(res);
  const [user] = await query(sql`SELECT id,email FROM users WHERE id=${id}`);
  await sendAccountMail(user, "verify");
  res.json({ ok: true });
});
router.post("/verify", async (req, res) => {
  const secret = z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .parse(req.body.token);
  await db.transaction(async (tx) => {
    const [rows]: any = await tx.execute(
      sql`SELECT * FROM account_tokens WHERE token_hash=${digest(secret)} AND purpose='verify' FOR UPDATE`,
    );
    if (!rows[0] || Number(rows[0].expires_at) < Date.now())
      throw fail("Lien expiré");
    await tx.execute(
      sql`UPDATE users SET email_verified=true WHERE id=${rows[0].user_id}`,
    );
    await tx.execute(
      sql`DELETE FROM account_tokens WHERE token_hash=${digest(secret)}`,
    );
  });
  res.json({ ok: true });
});
router.post("/reset", async (req, res) => {
  const data = z
    .object({
      token: z.string().regex(/^[a-f0-9]{64}$/),
      password: z.string().min(12).max(128),
      confirmation: z.string(),
    })
    .refine((v) => v.password === v.confirmation)
    .parse(req.body);
  const hash = await hashPassword(data.password);
  await db.transaction(async (tx) => {
    const [rows]: any = await tx.execute(
      sql`SELECT * FROM account_tokens WHERE token_hash=${digest(data.token)} AND purpose='reset' FOR UPDATE`,
    );
    if (!rows[0] || Number(rows[0].expires_at) < Date.now())
      throw fail("Lien expiré");
    await tx.execute(
      sql`UPDATE users SET password_hash=${hash} WHERE id=${rows[0].user_id}`,
    );
    await tx.execute(
      sql`DELETE FROM sessions WHERE user_id=${rows[0].user_id}`,
    );
    await tx.execute(
      sql`DELETE FROM account_tokens WHERE user_id=${rows[0].user_id}`,
    );
  });
  res.json({ ok: true });
});
app.use("/api/v1", application);
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "Route inconnue" }),
);
if (process.env.NODE_ENV === "production") {
  const staticRoot = fileURLToPath(new URL("../../web/dist/", import.meta.url));
  app.use(express.static(staticRoot, { index: false }));
  app.get("/{*path}", (_req, res) => res.sendFile(staticRoot + "index.html"));
}

app.use(
  (
    error: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Données invalides" });
      return;
    }
    const status = error.status || 500;
    if (status === 500) console.error("API error", error.code || error.name);
    res
      .status(status)
      .json({ error: status === 500 ? "Erreur interne" : error.message });
  },
);
