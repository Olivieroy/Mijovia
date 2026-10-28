import {
  mysqlTable,
  varchar,
  text,
  json,
  int,
  bigint,
  boolean,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/mysql-core";
export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 254 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }),
  role: varchar("role", { length: 20 }).notNull().default("user"),
  suspended: boolean("suspended").notNull().default(false),
  emailVerified: boolean("email_verified").notNull().default(false),
  legalVersion: varchar("legal_version", { length: 50 }),
  legalAcceptedAt: timestamp("legal_accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const households = mysqlTable("households", {
  id: varchar("id", { length: 36 }).primaryKey(),
  ownerId: varchar("owner_id", { length: 36 })
    .notNull()
    .references(() => users.id),
  name: varchar("name", { length: 200 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
});
export const householdMembers = mysqlTable(
  "household_members",
  {
    householdId: varchar("household_id", { length: 36 })
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.householdId, t.userId] })],
);
export const records = mysqlTable(
  "records",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    kind: varchar("kind", { length: 30 }).notNull(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    householdId: varchar("household_id", { length: 36 }).references(
      () => households.id,
      { onDelete: "cascade" },
    ),
    data: json("data").notNull(),
    revision: int("revision").notNull().default(1),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (t) => [
    index("user_kind").on(t.userId, t.kind),
    index("household_kind").on(t.householdId, t.kind),
  ],
);
export const recordLinks = mysqlTable(
  "record_links",
  {
    sourceId: varchar("source_id", { length: 36 })
      .notNull()
      .references(() => records.id, { onDelete: "cascade" }),
    targetId: varchar("target_id", { length: 36 })
      .notNull()
      .references(() => records.id, { onDelete: "restrict" }),
  },
  (t) => [primaryKey({ columns: [t.sourceId, t.targetId] })],
);
export const sessions = mysqlTable("sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id, {
    onDelete: "cascade",
  }),
  csrf: varchar("csrf", { length: 64 }).notNull(),
  verifiedAt: bigint("verified_at", { mode: "number" }).notNull().default(0),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
});
export const identities = mysqlTable("identities", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 20 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
});
export const passkeys = mysqlTable("passkeys", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  publicKey: text("public_key").notNull(),
  counter: bigint("counter", { mode: "number" }).notNull(),
  transports: text("transports").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
});
export const challenges = mysqlTable("challenges", {
  sessionId: varchar("session_id", { length: 64 })
    .primaryKey()
    .references(() => sessions.id, { onDelete: "cascade" }),
  purpose: varchar("purpose", { length: 30 }).notNull(),
  value: varchar("value", { length: 255 }).notNull(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
});
export const accountTokens = mysqlTable("account_tokens", {
  tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  purpose: varchar("purpose", { length: 20 }).notNull(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
});
export const householdInvitations = mysqlTable("household_invitations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  householdId: varchar("household_id", { length: 36 })
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  email: varchar("email", { length: 254 }),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  usedAt: bigint("used_at", { mode: "number" }),
});
export const settings = mysqlTable("settings", {
  id: varchar("id", { length: 50 }).primaryKey(),
  data: json("data").notNull(),
});
export const signupInvitations = mysqlTable("signup_invitations", {
  tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  usedAt: bigint("used_at", { mode: "number" }),
});
export const auditLogs = mysqlTable("audit_logs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id, {
    onDelete: "set null",
  }),
  event: varchar("event", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
