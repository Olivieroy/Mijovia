import mysql from "mysql2/promise";
const db = await mysql.createConnection(process.env.DATABASE_URL!);
await db.execute("DELETE FROM sessions WHERE expires_at<?", [Date.now()]);
await db.execute("DELETE FROM challenges WHERE expires_at<?", [Date.now()]);
await db.execute("DELETE FROM account_tokens WHERE expires_at<?", [Date.now()]);
await db.execute(
  "DELETE FROM household_invitations WHERE expires_at<? OR used_at IS NOT NULL",
  [Date.now()],
);
await db.execute(
  "DELETE FROM signup_invitations WHERE expires_at<? OR used_at IS NOT NULL",
  [Date.now()],
);
await db.execute(
  "DELETE FROM audit_logs WHERE created_at<DATE_SUB(NOW(),INTERVAL 90 DAY)",
);
await db.end();
console.log("Sessions, liens temporaires et journaux expirés purgés.");
