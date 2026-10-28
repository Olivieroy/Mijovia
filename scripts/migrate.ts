import mysql from "mysql2/promise";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const connection = await mysql.createConnection({
  uri: process.env.DATABASE_URL!,
  multipleStatements: true,
});
await connection.query(
  "CREATE TABLE IF NOT EXISTS migrations (name varchar(200) PRIMARY KEY, checksum char(64) NOT NULL, applied_at timestamp DEFAULT CURRENT_TIMESTAMP)",
);
const [lock]: any = await connection.query(
  "SELECT GET_LOCK('mijovia_migrations',30) AS acquired",
);
if (!lock[0].acquired) throw Error("Migration déjà en cours");
try {
  for (const name of (await readdir("apps/api/migrations"))
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    const source = await readFile("apps/api/migrations/" + name, "utf8");
    const hash = createHash("sha256").update(source).digest("hex");
    const [rows]: any = await connection.query(
      "SELECT checksum FROM migrations WHERE name=?",
      [name],
    );
    if (rows.length) {
      if (rows[0].checksum !== hash)
        throw Error("Migration modifiée : " + name);
      continue;
    }
    await connection.query(source);
    await connection.query(
      "INSERT INTO migrations(name,checksum) VALUES (?,?)",
      [name, hash],
    );
    console.log("Migration appliquée :", name);
  }
} finally {
  await connection.query("SELECT RELEASE_LOCK('mijovia_migrations')");
  await connection.end();
}
