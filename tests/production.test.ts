import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import supertest from "supertest";
test(
  "production : routes SPA, manifest, fichiers publics et séparation API",
  { skip: !existsSync("apps/web/dist/index.html") },
  async () => {
    process.env.NODE_ENV = "production";
    process.env.APP_ORIGIN = "https://mijovia.example";
    process.env.DATABASE_URL = "mysql://localhost/mijovia_unused";
    process.env.GOOGLE_ENABLED = "false";
    process.env.PASSKEYS_ENABLED = "false";
    const { app } = await import("../apps/api/src/app.js");
    const { pool } = await import("../apps/api/src/db.js");
    try {
      const request = supertest(app);
      assert.equal((await request.get("/dashboard")).status, 200);
      const manifest = await request.get("/manifest.webmanifest");
      assert.equal(manifest.status, 200);
      assert.equal(JSON.parse(manifest.text).short_name, "Mijovia");
      assert.equal((await request.get("/icon-192.png")).status, 200);
      assert.equal((await request.get("/sw.js")).status, 200);
      const missing = await request.get("/api/unknown");
      assert.equal(missing.status, 404);
      assert.equal(missing.body.error, "Route inconnue");
      const secret = await request.get("/.env");
      assert.equal(secret.text.includes("DATABASE_URL="), false);
      const source = await request.get("/apps/api/src/app.ts");
      assert.equal(source.text.includes("registrationAllowed"), false);
    } finally {
      await pool.end();
    }
  },
);
