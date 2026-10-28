import { test, after } from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";
const enabled = !!process.env.TEST_DATABASE_URL;
if (enabled) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.NODE_ENV = "test";
  process.env.APP_ORIGIN = "http://localhost:5173";
  process.env.GOOGLE_ENABLED = "false";
  process.env.PASSKEYS_ENABLED = "false";
}
test(
  "API MySQL : comptes, isolation, foyers, menus, courses et récupération",
  { skip: !enabled },
  async () => {
    const { app } = await import("../apps/api/src/app.js");
    const { query, sql, pool } = await import("../apps/api/src/db.js");
    const { useTestMailer } = await import("../apps/api/src/modules/mail.js");
    const mail: any[] = [];
    useTestMailer(async (message) => {
      mail.push(message);
    });
    const created: string[] = [];
    const houses: string[] = [];
    const make = async (name: string) => {
      const agent = supertest.agent(app);
      let csrf = "";
      const call = async (method: string, path: string, body?: any) => {
        if (method !== "get") {
          const config = await agent.get("/api/v1/auth/config");
          csrf = config.body.csrf;
        }
        return (agent as any)
          [method]("/api/v1" + path)
          .set("Origin", "http://localhost:5173")
          .set("X-CSRF-Token", csrf)
          .send(body);
      };
      const email = `${name}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
      const password = "A test password with 28 chars";
      const response = await call("post", "/auth/register", {
        name,
        email,
        password,
        confirmation: password,
        legalAccepted: true,
      });
      assert.equal(response.status, 200, JSON.stringify(response.body));
      const me = await call("get", "/auth/me");
      created.push(me.body.id);
      return { agent, call, email, password, id: me.body.id };
    };
    try {
      const alice = await make("Alice"),
        bob = await make("Bob"),
        eve = await make("Eve");
      const forged = await alice.agent
        .post("/api/v1/data/foods")
        .set("Origin", "https://evil.test")
        .send({});
      assert.equal(forged.status, 403);
      assert.equal((await bob.call("get", "/admin")).status, 403);
      let response = await alice.call("post", "/data/weights", {
        data: { date: "2026-10-28", value: 100 },
      });
      assert.equal(response.status, 403);
      assert.equal(
        (
          await alice.call("post", "/data/profiles", {
            data: { name: "Alice", healthConsent: true },
          })
        ).status,
        201,
      );
      const weight = await alice.call("post", "/data/weights", {
        data: { date: "2026-10-28", value: 100 },
      });
      assert.equal(weight.status, 201);
      assert.equal(
        (await bob.call("get", "/data")).body.some(
          (r: any) => r.id === weight.body.id,
        ),
        false,
      );
      assert.equal(
        (
          await bob.call("put", "/data/weights/" + weight.body.id, {
            data: { date: "2026-10-28", value: 50 },
            revision: 1,
          })
        ).status,
        404,
      );
      assert.equal(
        (
          await alice.call("put", "/data/weights/" + weight.body.id, {
            data: { date: "2026-10-28", value: 99 },
            revision: 2,
          })
        ).status,
        409,
      );
      const house = await alice.call("post", "/households", {
        name: "Foyer de test",
      });
      assert.equal(house.status, 201);
      const householdId = house.body.id;
      houses.push(householdId);
      const invitation = await alice.call(
        "post",
        `/households/${householdId}/invitations`,
        {},
      );
      assert.equal(invitation.status, 200);
      const secret = new URL(invitation.body.url).searchParams.get(
        "invitation",
      );
      assert.equal(
        (await bob.call("post", "/households/join", { token: secret })).status,
        200,
      );
      assert.equal(
        (await eve.call("post", "/households/join", { token: secret })).status,
        400,
      );
      const scope = "?householdId=" + householdId;
      assert.equal((await eve.call("get", "/data" + scope)).status, 403);
      assert.equal(
        (
          await alice.call("post", "/data/weights" + scope, {
            data: { date: "2026-10-28", value: 100 },
          })
        ).status,
        403,
      );
      const create = async (kind: string, data: any) => {
        const result = await alice.call("post", "/data/" + kind + scope, {
          data,
        });
        assert.equal(result.status, 201, JSON.stringify(result.body));
        return result.body.id;
      };
      const foodId = await create("foods", {
        name: "Riz",
        category: "Féculents",
        unit: "g",
        allergens: [],
      });
      const storeId = await create("stores", {
        name: "Magasin manuel",
        city: "Angers",
        postcode: "49000",
      });
      const productId = await create("products", {
        name: "Riz 500g",
        category: "Féculents",
        foodId,
        storeId,
        packQuantity: "500",
        unit: "g",
      });
      await create("prices", {
        productId,
        cents: 210,
        date: "2026-10-28",
        source: "Prix fictif de test isolé",
        reliability: "saisie",
      });
      const recipeId = await create("recipes", {
        name: "Riz nature",
        category: "Plat",
        portions: 4,
        ingredients: [{ foodId, quantity: "250", unit: "g" }],
        steps: "Cuire le riz",
        prep: 5,
        cook: 10,
      });
      await create("meals", {
        date: "2026-10-28",
        slot: "Déjeuner",
        recipeId,
        servings: 2,
      });
      await create("inventory", { foodId, quantity: "25", unit: "g" });
      const preview = await bob.call("post", "/shopping/preview" + scope, {
        start: "2026-10-26",
        end: "2026-11-01",
      });
      assert.equal(preview.status, 200, JSON.stringify(preview.body));
      assert.equal(preview.body.items[0].quantity, "100");
      assert.equal(preview.body.total.cents, 210);
      assert.equal(
        (
          await bob.call("post", "/shopping/generate" + scope, {
            start: "2026-10-26",
            end: "2026-11-01",
          })
        ).status,
        200,
      );
      assert.equal(
        (await alice.call("get", "/data" + scope)).body.some(
          (r: any) => r.kind === "shoppingItems",
        ),
        true,
      );
      assert.equal(
        (
          await bob.call("delete", "/data/foods/" + foodId + scope, {
            revision: 1,
          })
        ).status,
        409,
      );
      const foreign = await eve.call("post", "/data/meals", {
        data: { date: "2026-10-28", slot: "Dîner", recipeId, servings: 1 },
      });
      assert.equal(foreign.status, 403);
      await create("budgets", {
        name: "Octobre",
        start: "2026-10-01",
        end: "2026-10-31",
        period: "mois",
        cents: 10000,
      });
      await create("expenses", {
        name: "Courses",
        date: "2026-10-28",
        cents: 210,
        category: "Féculents",
      });
      const stats = await bob.call(
        "get",
        "/statistics" + scope + "&start=2026-10-01&end=2026-10-31",
      );
      assert.equal(stats.status, 200);
      assert.equal(stats.body.budgets[0].remaining, 9790);
      assert.equal(stats.body.weights.length, 0);
      const generated = await bob.call("post", "/meals/generate" + scope, {
        start: "2026-11-02",
        end: "2026-11-08",
        slots: ["Déjeuner", "Dîner"],
        servings: 2,
      });
      assert.equal(generated.status, 200, JSON.stringify(generated.body));
      assert.equal(generated.body.count, 14);
      assert.equal(
        (
          await bob.call(
            "delete",
            `/households/${householdId}/invitations/${invitation.body.id || "00000000-0000-4000-8000-000000000000"}`,
            {},
          )
        ).status,
        403,
      );
      const recurring = await alice.call("post", "/data/workouts", {
        data: {
          name: "Marche",
          date: "2026-10-28",
          duration: 30,
          status: "prévue",
          recurrence: "hebdomadaire",
        },
      });
      assert.equal(recurring.status, 201);
      const expanded = await alice.call("post", "/workouts/expand", {
        workoutId: recurring.body.id,
        until: "2026-11-11",
      });
      assert.equal(expanded.status, 200, JSON.stringify(expanded.body));
      assert.equal(expanded.body.count, 2);
      assert.equal(
        (
          await alice.call("post", "/workouts/expand", {
            workoutId: recurring.body.id,
            until: "2026-11-11",
          })
        ).body.count,
        0,
      );
      assert.equal(
        (
          await eve.call("post", "/workouts/expand", {
            workoutId: recurring.body.id,
            until: "2026-11-11",
          })
        ).status,
        400,
      );
      const verification = await alice.call("post", "/auth/verify/request", {});
      assert.equal(verification.status, 200);
      const verify = new URL(
        mail.at(-1).text.match(/http:\/\/[^\s]+/)[0],
      ).searchParams.get("verify");
      assert.equal(
        (await alice.call("post", "/auth/verify", { token: verify })).status,
        200,
      );
      assert.equal(
        (await alice.call("get", "/auth/me")).body.email_verified,
        1,
      );
      assert.equal(
        (await alice.call("post", "/auth/forgot", { email: alice.email }))
          .status,
        200,
      );
      const reset = new URL(
        mail.at(-1).text.match(/http:\/\/[^\s]+/)[0],
      ).searchParams.get("reset");
      const next = "A newly reset password 42";
      assert.equal(
        (
          await alice.call("post", "/auth/reset", {
            token: reset,
            password: next,
            confirmation: next,
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await alice.call("post", "/auth/reset", {
            token: reset,
            password: next,
            confirmation: next,
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await alice.call("post", "/auth/password", {
            email: alice.email,
            password: alice.password,
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await alice.call("post", "/auth/password", {
            email: alice.email,
            password: next,
          })
        ).status,
        200,
      );
      assert.equal(
        (await alice.call("get", "/account/export")).body.personal.some(
          (r: any) => r.kind === "weights",
        ),
        true,
      );
      assert.equal(
        (
          await bob.call(
            "delete",
            `/households/${householdId}/members/${bob.id}`,
            {},
          )
        ).status,
        200,
      );
      assert.equal((await bob.call("get", "/data" + scope)).status, 403);
      assert.equal(
        (await eve.call("delete", "/account", { confirmation: "SUPPRIMER" }))
          .status,
        200,
      );
    } finally {
      for (const house of houses) {
        await query(
          sql`DELETE l FROM record_links l JOIN records r ON l.source_id=r.id WHERE r.household_id=${house}`,
        );
        await query(sql`DELETE FROM households WHERE id=${house}`);
      }
      for (const id of created) {
        await query(
          sql`DELETE l FROM record_links l JOIN records r ON l.source_id=r.id WHERE r.user_id=${id}`,
        );
        await query(sql`DELETE FROM users WHERE id=${id}`);
      }
      await pool.end();
    }
  },
);
