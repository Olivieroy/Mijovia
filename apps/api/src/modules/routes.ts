import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { type Kind, amount, privateKinds, parseRecord } from "@mijovia/shared";
import { db, query, sql } from "../db.js";
import {
  list,
  save,
  remove,
  kindSchema,
  membership,
  fail,
  json,
  audit,
} from "./data.js";
import {
  groceries,
  totalCost,
  allowedRecipes,
  budgetSummary,
  movingAverage,
  recipeNutrition,
  recipeCandidates,
  decimal,
  portion,
} from "./calculations.js";
import { token, hashPassword } from "../security.js";
export const application = Router();
application.use((req, res, next) => {
  if (!res.locals.session?.user_id) {
    next(fail("Connexion requise", 401));
    return;
  }
  next();
});
const uid = (res: any) => res.locals.session.user_id as string;
const scope = (req: any) =>
  req.query.householdId ? z.uuid().parse(req.query.householdId) : null;
const recent = (res: any) => {
  if (Date.now() - Number(res.locals.session.verified_at) > 300000)
    throw fail("Vérifiez votre identité dans Sécurité", 403);
  return uid(res);
};
application.get("/data", async (req, res) =>
  res.json(await list(uid(res), scope(req))),
);
application.post("/data/:kind", async (req, res) => {
  const kind = kindSchema.parse(req.params.kind);
  const id = await save(uid(res), kind, req.body.data, scope(req));
  res.status(201).json({ id });
});
application.put("/data/:kind/:id", async (req, res) => {
  res.json({
    id: await save(
      uid(res),
      kindSchema.parse(req.params.kind),
      req.body.data,
      scope(req),
      z.uuid().parse(req.params.id),
      z.number().int().positive().parse(req.body.revision),
    ),
  });
});
application.delete("/data/:kind/:id", async (req, res) => {
  kindSchema.parse(req.params.kind);
  await remove(
    uid(res),
    z.uuid().parse(req.params.id),
    scope(req),
    z.number().int().positive().parse(req.body.revision),
    kindSchema.parse(req.params.kind),
  );
  res.json({ ok: true });
});
const period = z
  .object({
    start: z.iso.date(),
    end: z.iso.date(),
    storeId: z.uuid().optional(),
  })
  .refine(
    (v) =>
      v.end >= v.start &&
      Date.parse(v.end) - Date.parse(v.start) <= 366 * 86400000,
    "Période invalide",
  );
application.post("/shopping/preview", async (req, res) => {
  const p = period.parse(req.body);
  const rows = groceries(
    await list(uid(res), scope(req)),
    p.start,
    p.end,
    p.storeId,
  );
  const records = await list(uid(res), scope(req));
  const meals = records.filter(
    (r) => r.kind === "meals" && r.data.date >= p.start && r.data.date <= p.end,
  );
  const total = totalCost(rows);
  const servings = meals.reduce((n, r) => n + r.data.servings, 0);
  res.json({
    items: rows,
    total,
    perMeal: meals.length ? Math.round(total.cents / meals.length) : null,
    perPerson: servings ? Math.round(total.cents / servings) : null,
  });
});
application.post("/shopping/generate", async (req, res) => {
  const p = period.parse(req.body);
  const userId = uid(res),
    house = scope(req);
  await db.transaction(async (tx) => {
    if (house) {
      await membership(userId, house, tx);
      await tx.execute(
        sql`SELECT id FROM households WHERE id=${house} FOR UPDATE`,
      );
    } else
      await tx.execute(sql`SELECT id FROM users WHERE id=${userId} FOR UPDATE`);
    const all = await list(userId, house, tx);
    const items = groceries(all, p.start, p.end, p.storeId);
    const id = await save(
      userId,
      "shoppingLists",
      { name: `Courses du ${p.start}`, start: p.start, end: p.end },
      house,
      undefined,
      undefined,
      tx,
    );
    for (const item of items) {
      if (Number(item.quantity) > 0)
        await save(
          userId,
          "shoppingItems",
          { ...item, listId: id, checked: false, available: false },
          house,
          undefined,
          undefined,
          tx,
        );
    }
  });
  res.json({ ok: true });
});
application.post("/meals/generate", async (req, res) => {
  const p = period
    .and(
      z.object({
        slots: z.array(z.string().min(1).max(100)).min(1).max(12),
        servings: amount,
        maxPrep: z.number().nonnegative().optional(),
        budgetCents: z.number().int().nonnegative().optional(),
      }),
    )
    .parse(req.body);
  if (Date.parse(p.end) - Date.parse(p.start) > 30 * 86400000)
    throw fail("Générez au maximum 31 jours à la fois");
  const userId = uid(res),
    house = scope(req);
  let count = 0;
  await db.transaction(async (tx) => {
    if (house) {
      await membership(userId, house, tx);
      await tx.execute(
        sql`SELECT id FROM households WHERE id=${house} FOR UPDATE`,
      );
    } else
      await tx.execute(sql`SELECT id FROM users WHERE id=${userId} FOR UPDATE`);
    const records = await list(userId, house, tx);
    const personal = await list(userId, null, tx);
    let excluded: string[] =
      personal.find((r) => r.kind === "profiles")?.data.excludedAllergens || [];
    if (house) {
      const [profiles]: any = await tx.execute(
        sql`SELECT r.data FROM records r JOIN household_members m ON m.user_id=r.user_id WHERE m.household_id=${house} AND r.kind='profiles' AND r.household_id IS NULL`,
      );
      excluded = [
        ...excluded,
        ...profiles
          .filter((p: any) => json(p.data).shareDietaryConstraints)
          .flatMap((p: any) => json(p.data).excludedAllergens || []),
      ];
    }
    const recipes = allowedRecipes(
      [...records, ...personal.filter((r) => r.kind === "preferences")],
      excluded,
      p.maxPrep,
    );
    if (!recipes.length)
      throw fail(
        "Aucune recette compatible. Ajoutez des recettes et renseignez leurs allergènes.",
      );
    const uses = new Map<string, number>();
    for (
      let day = new Date(p.start + "T12:00:00Z");
      day <= new Date(p.end + "T12:00:00Z");
      day.setUTCDate(day.getUTCDate() + 1)
    ) {
      for (const slot of p.slots) {
        const date = day.toISOString().slice(0, 10);
        const existing = records.find(
          (r) =>
            r.kind === "meals" && r.data.date === date && r.data.slot === slot,
        );
        if (existing?.data.locked) continue;
        const candidates = recipeCandidates(
          [...records, ...personal.filter((r) => r.kind === "preferences")],
          excluded,
          p.servings,
          date,
          p.storeId,
          p.maxPrep,
        ).filter((c) => recipes.some((r) => r.id === c.id));
        candidates.sort((a, b) => {
          if (p.budgetCents !== undefined) {
            const cost =
              Number(a.cost.missing > 0) - Number(b.cost.missing > 0) ||
              a.cost.cents - b.cost.cents;
            if (cost) return cost;
          }
          return (
            (uses.get(a.id) || 0) - (uses.get(b.id) || 0) ||
            Number(b.favorite) - Number(a.favorite) ||
            b.stock - a.stock ||
            a.name.localeCompare(b.name)
          );
        });
        const recipe = recipes.find((r) => r.id === candidates[0].id)!;
        uses.set(recipe.id, (uses.get(recipe.id) || 0) + 1);
        const data = {
          date,
          slot,
          recipeId: recipe.id,
          servings: p.servings,
          locked: false,
          consumed: false,
          members: [],
          guests: 0,
        };
        if (existing) {
          await save(
            userId,
            "meals",
            data,
            house,
            existing.id,
            existing.revision,
            tx,
          );
          existing.data = data;
          existing.revision++;
        } else {
          const id = await save(
            userId,
            "meals",
            data,
            house,
            undefined,
            undefined,
            tx,
          );
          records.push({
            id,
            kind: "meals",
            data,
            revision: 1,
            householdId: house,
            updatedAt: new Date().toISOString(),
          });
        }
        count++;
      }
    }
    if (p.budgetCents !== undefined) {
      const result = totalCost(groceries(records, p.start, p.end, p.storeId));
      if (result.missing || result.cents > p.budgetCents)
        throw fail(
          "Impossible de garantir ce budget avec cette sélection et les prix disponibles. Ajustez les recettes ou utilisez Optimiser mon panier.",
        );
    }
  });
  res.json({ count });
});
application.post("/meals/copy", async (req, res) => {
  const p = z
    .object({ start: z.iso.date(), end: z.iso.date(), target: z.iso.date() })
    .parse(req.body);
  if (
    p.end < p.start ||
    Date.parse(p.end) - Date.parse(p.start) > 30 * 86400000
  )
    throw fail("Période invalide");
  const house = scope(req),
    userId = uid(res);
  await db.transaction(async (tx) => {
    const rows = await list(userId, house, tx);
    const source = rows.filter(
      (r) =>
        r.kind === "meals" && r.data.date >= p.start && r.data.date <= p.end,
    );
    for (const item of source) {
      const date = new Date(
        Date.parse(p.target) + Date.parse(item.data.date) - Date.parse(p.start),
      )
        .toISOString()
        .slice(0, 10);
      if (
        rows.some(
          (r) =>
            r.kind === "meals" &&
            r.data.date === date &&
            r.data.slot === item.data.slot,
        )
      )
        throw fail(
          "La destination contient déjà un repas. Déplacez-le ou supprimez-le avant de copier.",
          409,
        );
      await save(
        userId,
        "meals",
        { ...item.data, date, locked: false, consumed: false },
        house,
        undefined,
        undefined,
        tx,
      );
    }
  });
  res.json({ ok: true });
});
application.post("/shopping/optimize", async (req, res) => {
  const p = period.parse(req.body);
  const records = await list(uid(res), scope(req));
  const items = groceries(records, p.start, p.end);
  const notes = items.map((i) => ({
    food: i.name,
    detail:
      i.cents === null
        ? "Prix manquant : saisir un tarif pour comparer."
        : Number(i.quantity) === 0
          ? "Couvert par votre inventaire."
          : `${i.packs ?? "?"} conditionnement(s), ${i.cents} centimes, meilleure offre totale renseignée.`,
    source: i.source,
    date: i.priceDate,
  }));
  res.json({ items, notes, total: totalCost(items) });
});
application.get("/statistics", async (req, res) => {
  const p = period.parse(req.query);
  const records = await list(uid(res), scope(req));
  const privateRecords = await list(uid(res));
  const selected = records.filter(
    (r) => !r.data.date || (r.data.date >= p.start && r.data.date <= p.end),
  );
  const weights = privateRecords
    .filter(
      (r) =>
        r.kind === "weights" && r.data.date >= p.start && r.data.date <= p.end,
    )
    .map((r) => r.data);
  const workouts = privateRecords.filter(
    (r) =>
      r.kind === "workouts" &&
      r.data.status === "effectuée" &&
      r.data.date >= p.start &&
      r.data.date <= p.end,
  );
  res.json({
    weights: movingAverage(weights as any),
    workouts: workouts.map((r) => r.data),
    duration: workouts.reduce((n, r) => n + r.data.duration, 0),
    meals: selected.filter((r) => r.kind === "meals").map((r) => r.data),
    budgets: records
      .filter((r) => r.kind === "budgets")
      .map((r) => ({
        name: r.data.name,
        ...budgetSummary(
          r.data,
          records.filter((r) => r.kind === "expenses"),
        ),
      })),
    expenses: selected.filter((r) => r.kind === "expenses").map((r) => r.data),
    prices: selected
      .filter((r) => r.kind === "prices")
      .map((r) => ({
        ...r.data,
        name: records.find((p) => p.id === r.data.productId)?.data.name,
      })),
    sports: workouts.map((r) => ({
      ...r.data,
      sport:
        privateRecords.find((s) => s.id === r.data.sportId)?.data.name ||
        r.data.name,
    })),
    sets: workouts.flatMap((r) =>
      r.data.sets.map((set: any) => ({
        ...set,
        date: r.data.date,
        name: privateRecords.find((e) => e.id === set.exerciseId)?.data.name,
      })),
    ),
    nutrition: selected
      .filter((r) => r.kind === "meals")
      .map((meal) => {
        const recipe = records.find((r) => r.id === meal.data.recipeId);
        return {
          date: meal.data.date,
          name: recipe?.data.name,
          ...(recipe
            ? recipeNutrition(records, recipe.data, meal.data.servings)
            : { missing: 1 }),
        };
      }),
  });
});
application.get("/households", async (req, res) => {
  const houses = await query(
    sql`SELECT h.* FROM households h JOIN household_members m ON h.id=m.household_id WHERE m.user_id=${uid(res)}`,
  );
  for (const house of houses) {
    house.members = await query(
      sql`SELECT u.id,u.name FROM users u JOIN household_members m ON u.id=m.user_id WHERE m.household_id=${house.id}`,
    );
    house.invitations =
      house.owner_id === uid(res)
        ? await query(
            sql`SELECT id,email,expires_at,used_at FROM household_invitations WHERE household_id=${house.id}`,
          )
        : [];
  }
  res.json(houses);
});
application.post("/households", async (req, res) => {
  const name = z.string().trim().min(1).max(200).parse(req.body.name);
  const currency = z
    .string()
    .regex(/^[A-Z]{3}$/)
    .default("EUR")
    .parse(req.body.currency);
  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`INSERT INTO households(id,owner_id,name,currency) VALUES(${id},${uid(res)},${name},${currency})`,
    );
    await tx.execute(
      sql`INSERT INTO household_members(household_id,user_id) VALUES(${id},${uid(res)})`,
    );
  });
  res.status(201).json({ id });
});
application.post("/households/:id/invitations", async (req, res) => {
  const house = await membership(uid(res), z.uuid().parse(req.params.id));
  if (house.owner_id !== uid(res)) throw fail("Propriétaire requis", 403);
  const email = z
    .email()
    .toLowerCase()
    .optional()
    .parse(req.body.email || undefined);
  const secret = token();
  const { digest } = await import("./mail.js");
  const id = randomUUID();
  await query(
    sql`INSERT INTO household_invitations(id,household_id,token_hash,email,expires_at) VALUES(${id},${house.id},${digest(secret)},${email || null},${Date.now() + 7 * 86400000})`,
  );
  res.json({ url: `${process.env.APP_ORIGIN}/foyer?invitation=${secret}` });
});
application.delete(
  "/households/:id/invitations/:invitation",
  async (req, res) => {
    const house = await membership(uid(res), z.uuid().parse(req.params.id));
    if (house.owner_id !== uid(res)) throw fail("Propriétaire requis", 403);
    await query(
      sql`DELETE FROM household_invitations WHERE id=${z.uuid().parse(req.params.invitation)} AND household_id=${house.id}`,
    );
    res.json({ ok: true });
  },
);
application.post("/households/join", async (req, res) => {
  const { digest } = await import("./mail.js");
  const secret = z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .parse(req.body.token);
  await db.transaction(async (tx) => {
    const [rows]: any = await tx.execute(
      sql`SELECT * FROM household_invitations WHERE token_hash=${digest(secret)} FOR UPDATE`,
    );
    const invitation = rows[0];
    if (
      !invitation ||
      invitation.used_at ||
      Number(invitation.expires_at) < Date.now()
    )
      throw fail("Invitation expirée");
    const [users]: any = await tx.execute(
      sql`SELECT email,email_verified FROM users WHERE id=${uid(res)}`,
    );
    if (
      invitation.email &&
      (!users[0].email_verified || users[0].email !== invitation.email)
    )
      throw fail(
        "Vérifiez l’adresse e-mail destinataire de cette invitation",
        403,
      );
    await tx.execute(
      sql`INSERT IGNORE INTO household_members(household_id,user_id) VALUES(${invitation.household_id},${uid(res)})`,
    );
    await tx.execute(
      sql`UPDATE household_invitations SET used_at=${Date.now()} WHERE id=${invitation.id}`,
    );
  });
  res.json({ ok: true });
});
application.delete("/households/:id/members/:member", async (req, res) => {
  const house = await membership(uid(res), z.uuid().parse(req.params.id));
  const member = z.uuid().parse(req.params.member);
  if (member === house.owner_id)
    throw fail("Transférez la propriété ou supprimez le foyer avant de partir");
  if (house.owner_id !== uid(res) && member !== uid(res))
    throw fail("Propriétaire requis", 403);
  await query(
    sql`DELETE FROM household_members WHERE household_id=${house.id} AND user_id=${member}`,
  );
  res.json({ ok: true });
});
application.post("/households/:id/transfer", async (req, res) => {
  recent(res);
  const house = await membership(uid(res), z.uuid().parse(req.params.id));
  const member = z.uuid().parse(req.body.userId);
  if (house.owner_id !== uid(res)) throw fail("", 403);
  await membership(member, house.id);
  await query(
    sql`UPDATE households SET owner_id=${member} WHERE id=${house.id} AND owner_id=${uid(res)}`,
  );
  res.json({ ok: true });
});
application.delete("/households/:id", async (req, res) => {
  recent(res);
  const house = await membership(uid(res), z.uuid().parse(req.params.id));
  if (house.owner_id !== uid(res)) throw fail("", 403);
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`DELETE l FROM record_links l JOIN records r ON l.source_id=r.id WHERE r.household_id=${house.id}`,
    );
    await tx.execute(sql`DELETE FROM households WHERE id=${house.id}`);
  });
  res.json({ ok: true });
});
application.get("/account/export", async (req, res) => {
  const id = uid(res);
  const [profile] = await query(
    sql`SELECT id,email,name,created_at,email_verified FROM users WHERE id=${id}`,
  );
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="mijovia-export.json"',
  );
  res.json({
    user: profile,
    personal: await list(id),
    households: await query(
      sql`SELECT h.id,h.name FROM households h JOIN household_members m ON m.household_id=h.id WHERE m.user_id=${id}`,
    ),
  });
});
application.get("/account/sessions", async (req, res) =>
  res.json(
    await query(
      sql`SELECT id,expires_at,verified_at FROM sessions WHERE user_id=${uid(res)} AND expires_at>${Date.now()}`,
    ),
  ),
);
application.delete("/account/sessions", async (req, res) => {
  recent(res);
  await query(
    sql`DELETE FROM sessions WHERE user_id=${uid(res)} AND id<>${res.locals.session.id}`,
  );
  res.json({ ok: true });
});
application.delete("/account", async (req, res) => {
  const userId = recent(res);
  if (req.body.confirmation !== "SUPPRIMER") throw fail("Saisissez SUPPRIMER");
  await db.transaction(async (tx) => {
    const [houses]: any = await tx.execute(
      sql`SELECT id FROM households WHERE owner_id=${userId} FOR UPDATE`,
    );
    if (houses.length) throw fail("Transférez ou supprimez d’abord vos foyers");
    await tx.execute(
      sql`UPDATE records r JOIN households h ON r.household_id=h.id SET r.user_id=h.owner_id WHERE r.user_id=${userId}`,
    );
    await tx.execute(
      sql`DELETE l FROM record_links l JOIN records r ON l.source_id=r.id WHERE r.user_id=${userId} AND r.household_id IS NULL`,
    );
    await tx.execute(sql`DELETE FROM users WHERE id=${userId}`);
  });
  res.json({ ok: true });
});
application.use("/admin", async (req, res, next) => {
  const [user] = await query(sql`SELECT role FROM users WHERE id=${uid(res)}`);
  if (user?.role !== "admin") throw fail("Administration réservée", 403);
  next();
});
application.get("/admin", async (req, res) =>
  res.json({
    users: await query(
      sql`SELECT id,name,email,role,suspended,created_at FROM users ORDER BY created_at DESC`,
    ),
    settings: await query(sql`SELECT * FROM settings`),
    logs: await query(
      sql`SELECT event,created_at FROM audit_logs ORDER BY created_at DESC LIMIT 100`,
    ),
    health: {
      database: (await query(sql`SELECT 1 AS ok`))[0].ok,
      mail: !!process.env.SMTP_HOST,
    },
  }),
);
application.put("/admin/registration", async (req, res) => {
  const data = z
    .object({ enabled: z.boolean(), invitationOnly: z.boolean() })
    .parse(req.body);
  await query(
    sql`UPDATE settings SET data=${JSON.stringify(data)} WHERE id='registration'`,
  );
  await audit(uid(res), "admin:registration");
  res.json({ ok: true });
});
application.post("/admin/invitations", async (req, res) => {
  const { digest } = await import("./mail.js");
  const secret = token();
  await query(
    sql`INSERT INTO signup_invitations(token_hash,expires_at) VALUES(${digest(secret)},${Date.now() + 7 * 86400000})`,
  );
  res.json({ url: `${process.env.APP_ORIGIN}/connexion?signup=${secret}` });
});
application.put("/admin/users/:id", async (req, res) => {
  recent(res);
  const id = z.uuid().parse(req.params.id);
  if (id === uid(res))
    throw fail("Vous ne pouvez pas suspendre votre propre compte");
  const suspended = z.boolean().parse(req.body.suspended);
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`UPDATE users SET suspended=${suspended} WHERE id=${id}`,
    );
    if (suspended)
      await tx.execute(sql`DELETE FROM sessions WHERE user_id=${id}`);
    await audit(uid(res), "admin:suspension", tx);
  });
  res.json({ ok: true });
});
application.put("/admin/sources", async (req, res) => {
  const sources = z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        url: z.url().optional(),
        note: z.string().max(1000),
      }),
    )
    .max(100)
    .parse(req.body.sources);
  await query(
    sql`UPDATE settings SET data=${JSON.stringify(sources)} WHERE id='sources'`,
  );
  res.json({ ok: true });
});
application.post("/admin/catalogue/publish", async (req, res) => {
  const allowed = ["foods", "recipes", "stores", "products", "prices"];
  const records = (await list(uid(res))).filter((r) =>
    allowed.includes(r.kind),
  );
  await query(
    sql`UPDATE settings SET data=${JSON.stringify(records)} WHERE id='catalogue'`,
  );
  const profile = (await list(uid(res))).find((r) => r.kind === "profiles");
  await query(
    sql`UPDATE settings SET data=${JSON.stringify(profile?.data.currency || "EUR")} WHERE id='catalogueCurrency'`,
  );
  await audit(uid(res), "admin:publish-catalogue");
  res.json({ count: records.length });
});
// Les routes publiques du catalogue restent authentifiées mais ne sont pas réservées à l’admin.
application.get("/catalogue", async (req, res) => {
  const [row] = await query(
    sql`SELECT data FROM settings WHERE id='catalogue'`,
  );
  res.json(json(row.data));
});
application.post("/catalogue/import", async (req, res) => {
  const [row] = await query(
    sql`SELECT data FROM settings WHERE id='catalogue'`,
  );
  const templates = json(row.data);
  const house = scope(req);
  if (templates.some((t: any) => t.kind === "prices")) {
    const [currencyRow] = await query(
      sql`SELECT data FROM settings WHERE id='catalogueCurrency'`,
    );
    const currency = house
      ? (await membership(uid(res), house)).currency
      : (await list(uid(res))).find((r) => r.kind === "profiles")?.data
          .currency || "EUR";
    if (json(currencyRow.data) !== currency)
      throw fail(
        "La devise du catalogue diffère de celle de ce périmètre. Aucune conversion automatique n’est effectuée.",
      );
  }
  const ids = new Map<string, string>();
  await db.transaction(async (tx) => {
    for (const kind of [
      "foods",
      "stores",
      "recipes",
      "products",
      "prices",
    ] as Kind[]) {
      for (const item of templates.filter((r: any) => r.kind === kind)) {
        const data = structuredClone(item.data);
        for (const field of ["foodId", "storeId", "productId"])
          if (data[field]) {
            data[field] = ids.get(data[field]);
            if (!data[field]) throw fail("Catalogue incomplet");
          }
        if (data.ingredients)
          data.ingredients = data.ingredients.map((i: any) => ({
            ...i,
            foodId: ids.get(i.foodId),
          }));
        const id = await save(
          uid(res),
          kind,
          data,
          house,
          undefined,
          undefined,
          tx,
        );
        ids.set(item.id, id);
      }
    }
  });
  res.json({ count: ids.size });
});

application.post("/recipes/portions", async (req, res) => {
  const p = z
    .object({ recipeId: z.uuid(), servings: z.number().positive() })
    .parse(req.body);
  const records = await list(uid(res), scope(req));
  const recipe = records.find(
    (r) => r.id === p.recipeId && r.kind === "recipes",
  );
  if (!recipe) throw fail("Recette inaccessible", 404);
  res.json({
    ingredients: recipe.data.ingredients.map((i: any) => ({
      ...i,
      name: records.find((r) => r.id === i.foodId)?.data.name,
      quantity: decimal(portion(i.quantity, p.servings, recipe.data.portions)),
    })),
    nutrition: recipeNutrition(records, recipe.data, p.servings),
  });
});
application.post("/meals/alternatives", async (req, res) => {
  const p = z
    .object({
      date: z.iso.date(),
      servings: amount,
      mode: z.enum(["rapide", "stock", "prix", "similaire"]),
      recipeId: z.uuid().optional(),
    })
    .parse(req.body);
  const records = await list(uid(res), scope(req));
  const personal = await list(uid(res));
  const excluded =
    personal.find((r) => r.kind === "profiles")?.data.excludedAllergens || [];
  const base = records.find((r) => r.id === p.recipeId)?.data;
  const candidates = recipeCandidates(
    [...records, ...personal.filter((r) => r.kind === "preferences")],
    excluded,
    p.servings,
    p.date,
  ).filter((c) => c.id !== p.recipeId);
  candidates.sort((a, b) =>
    p.mode === "rapide"
      ? a.prep - b.prep
      : p.mode === "stock"
        ? b.stock - a.stock
        : p.mode === "prix"
          ? Number(a.cost.missing > 0) - Number(b.cost.missing > 0) ||
            a.cost.cents - b.cost.cents
          : Number(
              records.find((r) => r.id === b.id)?.data.category ===
                base?.category,
            ) -
            Number(
              records.find((r) => r.id === a.id)?.data.category ===
                base?.category,
            ),
  );
  res.json(candidates.slice(0, 10));
});
application.post("/workouts/expand", async (req, res) => {
  const p = z
    .object({ workoutId: z.uuid(), until: z.iso.date() })
    .parse(req.body);
  const userId = uid(res);
  let count = 0;
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM users WHERE id=${userId} FOR UPDATE`);
    const rows = await list(userId, null, tx);
    const source = rows.find(
      (r) => r.id === p.workoutId && r.kind === "workouts",
    );
    if (!source || source.data.recurrence !== "hebdomadaire")
      throw fail("Séance hebdomadaire introuvable");
    if (
      p.until < source.data.date ||
      Date.parse(p.until) - Date.parse(source.data.date) > 366 * 86400000
    )
      throw fail(
        "Choisissez une période de récurrence comprise dans l’année suivant la séance",
      );
    for (const day = new Date(source.data.date + "T12:00:00Z"); ;) {
      day.setUTCDate(day.getUTCDate() + 7);
      const date = day.toISOString().slice(0, 10);
      if (date > p.until) break;
      if (
        rows.some(
          (r) =>
            r.kind === "workouts" &&
            r.data.recurrenceSource === source.id &&
            r.data.date === date,
        )
      )
        continue;
      await save(
        userId,
        "workouts",
        {
          ...source.data,
          date,
          status: source.data.status === "repos" ? "repos" : "prévue",
          recurrence: "aucune",
          recurrenceSource: source.id,
        },
        null,
        undefined,
        undefined,
        tx,
      );
      count++;
    }
  });
  res.json({ count });
});
application.post("/prices/import", async (req, res) => {
  const items = z.array(z.unknown()).min(1).max(500).parse(req.body.items);
  const userId = uid(res),
    house = scope(req);
  await db.transaction(async (tx) => {
    for (const item of items)
      await save(userId, "prices", item, house, undefined, undefined, tx);
  });
  res.json({ count: items.length });
});
