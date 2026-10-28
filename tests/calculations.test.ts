import { test } from "node:test";
import assert from "node:assert/strict";
import {
  convert,
  decimal,
  fixed,
  portion,
  groceries,
  totalCost,
  allowedRecipes,
  budgetSummary,
  movingAverage,
} from "../apps/api/src/modules/calculations.js";
import { schemas, parseRecord } from "@mijovia/shared";
const r = (kind: any, id: string, data: any) => ({
  id,
  kind,
  data,
  revision: 1,
  householdId: null,
  updatedAt: "2026-01-01",
});
test("conversions exactes et unités incompatibles", () => {
  assert.equal(convert("1.250", "kg", "g"), 1250000000n);
  assert.equal(decimal(convert("250", "ml", "l")), "0.25");
  assert.throws(() => convert("1", "kg", "l"));
  assert.equal(decimal(10n * 1000000n), "10");
});
test("portions : arrondir sans manquer de quantité", () => {
  assert.equal(decimal(portion("250", 2, 4)), "125");
  assert.equal(portion("1", 1, 3), 333334n);
});
const records = [
  r("foods", "food", {
    name: "Riz",
    category: "Féculents",
    unit: "g",
    allergens: [],
  }),
  r("recipes", "recipe", {
    name: "Riz nature",
    portions: 4,
    ingredients: [{ foodId: "food", quantity: "250", unit: "g" }],
    prep: 5,
    cook: 10,
  }),
  r("meals", "meal", { date: "2026-10-28", recipeId: "recipe", servings: 2 }),
  r("inventory", "stock", { foodId: "food", quantity: "25", unit: "g" }),
  r("products", "product", {
    foodId: "food",
    storeId: "store",
    packQuantity: "500",
    unit: "g",
  }),
  r("prices", "price", {
    productId: "product",
    date: "2026-10-01",
    cents: 210,
    source: "Ticket",
  }),
];
test("courses : regrouper, déduire le stock, arrondir les conditionnements", () => {
  const items = groceries(records, "2026-10-26", "2026-11-01");
  assert.equal(items[0].quantity, "100");
  assert.equal(items[0].consumed, "125");
  assert.equal(items[0].packs, 1);
  assert.equal(items[0].cents, 210);
});
test("un prix manquant ne vaut jamais zéro", () => {
  const items = groceries(
    records.filter((r) => r.kind !== "prices"),
    "2026-10-26",
    "2026-11-01",
  );
  assert.equal(items[0].cents, null);
  assert.equal(totalCost(items).missing, 1);
});
test("inventaire périmé non déduit", () => {
  const items = groceries(
    records.map((r) =>
      r.kind === "inventory"
        ? { ...r, data: { ...r.data, expiry: "2026-10-01" } }
        : r,
    ),
    "2026-10-26",
    "2026-11-01",
  );
  assert.equal(items[0].quantity, "125");
});
test("budgets et sommes monétaires exactes", () => {
  const expenses = [
    r("expenses", "1", { date: "2026-10-28", cents: 10 }),
    r("expenses", "2", { date: "2026-10-28", cents: 20 }),
  ];
  assert.equal(
    budgetSummary(
      { cents: 100, start: "2026-10-01", end: "2026-10-31" },
      expenses,
    ).remaining,
    70,
  );
  assert.equal(totalCost([{ cents: 10 }, { cents: 20 }]).cents, 30);
});
test("allergènes inconnus : exclure si une allergie doit être évitée", () => {
  assert.equal(allowedRecipes(records, ["lactose"]).length, 1);
  assert.equal(
    allowedRecipes(
      records.map((r) =>
        r.kind === "foods" ? { ...r, data: { ...r.data, allergens: null } } : r,
      ),
      ["lactose"],
    ).length,
    0,
  );
  assert.equal(
    allowedRecipes(
      [
        ...records,
        r("preferences", "pref", { foodId: "food", kind: "refuse" }),
      ],
      [],
    ).length,
    0,
  );
});
test("statistiques et moyenne mobile", () => {
  assert.deepEqual(
    movingAverage([
      { date: "2026-01-01", value: 100 },
      { date: "2026-01-02", value: 98 },
    ]).map((r) => r.average),
    [100, 99],
  );
});
test("validations et périodes", () => {
  assert.equal(
    schemas.weights.safeParse({ date: "2026-02-31", value: 100 }).success,
    false,
  );
  assert.equal(
    schemas.expenses.safeParse({
      name: "A",
      date: "2026-01-01",
      cents: 1.2,
      category: "A",
    }).success,
    false,
  );
  assert.throws(() =>
    parseRecord("budgets", {
      name: "A",
      start: "2026-02-01",
      end: "2026-01-01",
      period: "mois",
      cents: 100,
    }),
  );
});

test("le stock n’est pas utilisé après sa péremption au cours de la semaine", () => {
  const modified = records.map((r) =>
    r.kind === "inventory"
      ? { ...r, data: { ...r.data, expiry: "2026-10-27" } }
      : r,
  );
  assert.equal(
    groceries(modified, "2026-10-26", "2026-11-01")[0].quantity,
    "125",
  );
});
test("refuser les montants au-delà de la précision entière", () => {
  assert.throws(() =>
    totalCost([{ cents: Number.MAX_SAFE_INTEGER }, { cents: 1 }]),
  );
});
