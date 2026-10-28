import type { RecordData } from "@mijovia/shared";
const SCALE = 1000000n;
export function fixed(value: string | number) {
  const [whole, decimal = ""] = String(value).split(".");
  return BigInt(whole) * SCALE + BigInt(decimal.padEnd(6, "0").slice(0, 6));
}
export function decimal(value: bigint) {
  return (
    `${value / SCALE}.${(value % SCALE).toString().padStart(6, "0")}`.replace(
      /\.?0+$/,
      "",
    ) || "0"
  );
}
const factors: Record<string, { family: string; factor: bigint }> = {
  g: { family: "mass", factor: 1n },
  kg: { family: "mass", factor: 1000n },
  ml: { family: "volume", factor: 1n },
  l: { family: "volume", factor: 1000n },
  pièce: { family: "count", factor: 1n },
};
export function convert(value: string, from: string, to: string) {
  if (
    !factors[from] ||
    !factors[to] ||
    factors[from].family !== factors[to].family
  )
    throw Error("Unités incompatibles");
  return (fixed(value) * factors[from].factor) / factors[to].factor;
}
export function safeMoney(value: bigint) {
  const n = Number(value);
  if (!Number.isSafeInteger(n)) throw Error("Montant trop important");
  return n;
}
export function portion(value: string, servings: number, base: number) {
  const denominator = fixed(base);
  return (fixed(value) * fixed(servings) + denominator - 1n) / denominator;
}
export type Grocery = {
  foodId: string;
  name: string;
  category: string;
  quantity: string;
  unit: string;
  consumed: string;
  productId?: string;
  packs?: number;
  cents: number | null;
  priceDate?: string;
  source?: string;
};
export function groceries(
  records: RecordData[],
  start: string,
  end: string,
  storeId?: string,
): Grocery[] {
  const find = (kind: string, id: string) =>
    records.find((r) => r.kind === kind && r.id === id)?.data;
  const totals = new Map<
    string,
    { food: any; need: bigint; demands: { date: string; need: bigint }[] }
  >();
  for (const meal of records.filter(
    (r) => r.kind === "meals" && r.data.date >= start && r.data.date <= end,
  )) {
    const recipe = find("recipes", meal.data.recipeId);
    if (!recipe) throw Error("Recette introuvable");
    for (const ingredient of recipe.ingredients) {
      const food = find("foods", ingredient.foodId);
      if (!food) throw Error("Aliment introuvable");
      const n = convert(
        decimal(
          portion(ingredient.quantity, meal.data.servings, recipe.portions),
        ),
        ingredient.unit,
        food.unit,
      );
      const current = totals.get(ingredient.foodId);
      totals.set(ingredient.foodId, {
        food,
        need: (current?.need || 0n) + n,
        demands: [
          ...(current?.demands || []),
          { date: meal.data.date, need: n },
        ],
      });
    }
  }
  return [...totals].map(([foodId, { food, need, demands }]) => {
    const stocks = records
      .filter((r) => r.kind === "inventory" && r.data.foodId === foodId)
      .map((r) => ({
        expiry: r.data.expiry || "9999-12-31",
        quantity: convert(r.data.quantity, r.data.unit, food.unit),
      }))
      .sort((a, b) => a.expiry.localeCompare(b.expiry));
    let remaining = 0n;
    for (const demand of demands.sort((a, b) => a.date.localeCompare(b.date))) {
      let needed = demand.need;
      for (const stock of stocks) {
        if (stock.expiry < demand.date || stock.quantity === 0n) continue;
        const taken = stock.quantity > needed ? needed : stock.quantity;
        stock.quantity -= taken;
        needed -= taken;
        if (needed === 0n) break;
      }
      remaining += needed;
    }
    const offers = records
      .filter(
        (r) =>
          r.kind === "products" &&
          r.data.foodId === foodId &&
          (!storeId || r.data.storeId === storeId),
      )
      .flatMap((product) => {
        let pack: bigint;
        try {
          pack = convert(
            product.data.packQuantity,
            product.data.unit,
            food.unit,
          );
        } catch {
          return [];
        }
        if (pack <= 0n) return [];
        const price = records
          .filter((r) => r.kind === "prices" && r.data.productId === product.id)
          .sort(
            (a, b) =>
              b.data.date.localeCompare(a.data.date) ||
              b.updatedAt.localeCompare(a.updatedAt),
          )[0];
        if (!price) return [];
        const count = (remaining + pack - 1n) / pack;
        return [
          { product, price, count, cost: count * BigInt(price.data.cents) },
        ];
      })
      .sort((a, b) => (a.cost < b.cost ? -1 : a.cost > b.cost ? 1 : 0));
    const best = offers[0];
    return {
      foodId,
      name: food.name,
      category: food.category,
      quantity: decimal(remaining),
      unit: food.unit,
      consumed: decimal(need),
      cents: remaining === 0n ? 0 : best ? safeMoney(best.cost) : null,
      ...(best
        ? {
            productId: best.product.id,
            packs: Number(best.count),
            priceDate: best.price.data.date,
            source: best.price.data.source,
          }
        : {}),
    };
  });
}
export function totalCost(items: { cents: number | null }[]) {
  return {
    cents: safeMoney(items.reduce((sum, i) => sum + BigInt(i.cents ?? 0), 0n)),
    missing: items.filter((i) => i.cents === null).length,
  };
}
export function allowedRecipes(
  records: RecordData[],
  excluded: string[],
  maxPrep?: number,
) {
  const blocked = new Set(
    records
      .filter(
        (r) =>
          r.kind === "preferences" &&
          ["refuse", "allergie", "intolérance", "déteste"].includes(
            r.data.kind,
          ),
      )
      .map((r) => r.data.foodId),
  );
  const foods = new Map(
    records.filter((r) => r.kind === "foods").map((r) => [r.id, r.data]),
  );
  return records
    .filter(
      (r) =>
        r.kind === "recipes" &&
        (!maxPrep || r.data.prep + r.data.cook <= maxPrep) &&
        r.data.ingredients.every((i: any) => {
          const food = foods.get(i.foodId);
          if (!food || blocked.has(i.foodId)) return false;
          if (
            excluded.length &&
            (food.allergens === null ||
              food.allergens.some((a: string) =>
                excluded.map((e) => e.toLowerCase()).includes(a.toLowerCase()),
              ))
          )
            return false;
          return true;
        }),
    )
    .sort(
      (a, b) =>
        Number(b.data.favorite) - Number(a.data.favorite) ||
        a.data.name.localeCompare(b.data.name),
    );
}
export function movingAverage(
  entries: { date: string; value: number }[],
  window = 7,
) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((entry, i) => ({
    ...entry,
    average:
      sorted
        .slice(Math.max(0, i - window + 1), i + 1)
        .reduce((sum, x) => sum + x.value, 0) / Math.min(window, i + 1),
  }));
}
export function budgetSummary(
  budget: { cents: number; start: string; end: string },
  expenses: RecordData[],
) {
  const spent = safeMoney(
    expenses
      .filter((r) => r.data.date >= budget.start && r.data.date <= budget.end)
      .reduce((n, r) => n + BigInt(r.data.cents), 0n),
  );
  return {
    planned: budget.cents,
    spent,
    remaining: budget.cents - spent,
    over: Math.max(0, spent - budget.cents),
  };
}
export function recipeNutrition(
  records: RecordData[],
  recipe: any,
  servings: number,
) {
  const total = { energy: 0, protein: 0, carbs: 0, fat: 0 };
  let missing = 0;
  for (const i of recipe.ingredients) {
    const food = records.find(
      (r) => r.id === i.foodId && r.kind === "foods",
    )?.data;
    if (!food?.nutrition || !["g", "kg", "ml", "l"].includes(i.unit)) {
      missing++;
      continue;
    }
    const base = ["g", "kg"].includes(i.unit) ? "g" : "ml";
    const qty =
      Number(
        convert(
          decimal(portion(i.quantity, servings, recipe.portions)),
          i.unit,
          base,
        ),
      ) / 1000000;
    for (const key of Object.keys(total) as (keyof typeof total)[]) {
      if (food.nutrition[key] === undefined) missing++;
      else total[key] += (qty / 100) * food.nutrition[key];
    }
  }
  return { ...total, missing, servings };
}
export function recipeCandidates(
  records: RecordData[],
  excluded: string[],
  servings: number,
  day: string,
  storeId?: string,
  maxPrep?: number,
) {
  return allowedRecipes(records, excluded, maxPrep).map((recipe) => {
    const synthetic = {
      id: "preview",
      kind: "meals" as const,
      revision: 1,
      householdId: null,
      updatedAt: "",
      data: { date: day, recipeId: recipe.id, servings },
    };
    const cost = totalCost(
      groceries(
        [...records.filter((r) => r.kind !== "meals"), synthetic],
        day,
        day,
        storeId,
      ),
    );
    const stock = recipe.data.ingredients.filter((i: any) =>
      records.some(
        (r) =>
          r.kind === "inventory" &&
          r.data.foodId === i.foodId &&
          (!r.data.expiry || r.data.expiry >= day),
      ),
    ).length;
    return {
      id: recipe.id,
      name: recipe.data.name,
      prep: recipe.data.prep + recipe.data.cook,
      favorite: recipe.data.favorite,
      cost,
      stock,
    };
  });
}
