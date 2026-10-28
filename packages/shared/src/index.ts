import { z } from "zod";
z.config(z.locales.fr());
const text = z.string().trim().min(1).max(200);
const note = z.string().max(10000).default("");
const id = z.uuid();
export const date = z.iso.date();
export const quantity = z
  .string()
  .regex(/^\d{1,12}(\.\d{1,6})?$/)
  .refine((v) => Number(v) > 0, "Quantité positive requise");
export const money = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER);
export const amount = z
  .number()
  .finite()
  .min(0.000001)
  .max(999999999999)
  .refine((v) => /^\d+(\.\d{1,6})?$/.test(String(v)), "Six décimales maximum");
export const modules = [
  "poids",
  "sport",
  "repas",
  "courses",
  "budget",
  "statistiques",
] as const;
export const units = ["g", "kg", "ml", "l", "pièce"] as const;
const unit = z.enum(units);
export const ingredient = z.object({ foodId: id, quantity, unit });
export const schemas = {
  profiles: z.object({
    name: text,
    height: z.number().positive().optional(),
    country: z.string().max(80).default(""),
    timezone: z.string().max(80).default("Europe/Paris"),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .default("EUR"),
    units: z.enum(["metric", "imperial"]).default("metric"),
    theme: z.enum(["system", "light", "dark"]).default("system"),
    modules: z.array(z.enum(modules)).default([...modules]),
    slots: z.array(text).min(1).max(12).default(["Déjeuner", "Dîner"]),
    servings: amount.default(1),
    maxPrep: z.number().nonnegative().optional(),
    healthConsent: z.boolean().default(false),
    shareDietaryConstraints: z.boolean().default(false),
    onboarded: z.boolean().default(false),
    widgets: z.array(text).default([...modules]),
    excludedAllergens: z.array(text).default([]),
  }),
  goals: z.object({
    name: text,
    type: z.enum([
      "perte",
      "prise",
      "maintien",
      "muscle",
      "forme",
      "organisation",
      "budget",
      "personnalisé",
    ]),
    target: amount.optional(),
    initial: amount.optional(),
    deadline: date.optional(),
    note,
  }),
  weights: z.object({ date, value: amount, note }),
  measurements: z.object({
    date,
    name: text,
    value: amount,
    unit: text.default("cm"),
    note,
  }),
  sports: z.object({ name: text, category: text.default("Autres") }),
  exercises: z.object({ name: text, muscle: text, note }),
  workouts: z.object({
    name: text,
    sportId: id.optional(),
    date,
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    recurrenceSource: z.uuid().optional(),
    duration: z.number().nonnegative(),
    distance: z.number().nonnegative().optional(),
    intensity: z.number().min(0).max(10).optional(),
    status: z
      .enum(["prévue", "effectuée", "annulée", "repos"])
      .default("prévue"),
    recurrence: z.enum(["aucune", "hebdomadaire"]).default("aucune"),
    sets: z
      .array(
        z.object({
          exerciseId: id,
          reps: z.number().int().positive(),
          weight: z.number().nonnegative(),
          rest: z.number().nonnegative().default(0),
        }),
      )
      .default([]),
    note,
  }),
  foods: z.object({
    name: text,
    category: text,
    unit,
    allergens: z.array(text).nullable().default(null),
    nutrition: z
      .object({
        energy: z.number().nonnegative().optional(),
        protein: z.number().nonnegative().optional(),
        carbs: z.number().nonnegative().optional(),
        fat: z.number().nonnegative().optional(),
      })
      .optional(),
    note,
  }),
  preferences: z.object({
    foodId: id,
    kind: z.enum([
      "aime",
      "déteste",
      "refuse",
      "allergie",
      "intolérance",
      "favori",
    ]),
    note,
  }),
  recipes: z.object({
    name: text,
    description: note,
    category: text,
    portions: amount,
    ingredients: z.array(ingredient).min(1).max(100),
    steps: z.string().trim().min(1).max(20000),
    prep: z.number().nonnegative(),
    cook: z.number().nonnegative(),
    favorite: z.boolean().default(false),
    photo: z
      .url()
      .refine((v) => v.startsWith("https://"))
      .optional(),
  }),
  meals: z.object({
    date,
    slot: text,
    recipeId: id,
    servings: amount,
    members: z.array(id).default([]),
    guests: z.number().int().nonnegative().default(0),
    locked: z.boolean().default(false),
    consumed: z.boolean().default(false),
    favorite: z.boolean().default(false),
  }),
  stores: z.object({
    name: text,
    city: text,
    postcode: z.string().max(20),
    favorite: z.boolean().default(false),
  }),
  products: z.object({
    name: text,
    brand: z.string().max(100).default(""),
    category: text,
    storeId: id,
    foodId: id,
    packQuantity: quantity,
    unit,
  }),
  prices: z.object({
    productId: id,
    cents: money,
    date,
    source: text,
    reliability: z
      .enum(["saisie", "estimée", "importée", "vérifiée"])
      .default("saisie"),
  }),
  inventory: z.object({ foodId: id, quantity, unit, expiry: date.optional() }),
  shoppingLists: z.object({ name: text, start: date, end: date }),
  shoppingItems: z.object({
    listId: id,
    foodId: id.optional(),
    productId: id.optional(),
    name: text,
    category: text,
    quantity,
    unit,
    checked: z.boolean().default(false),
    available: z.boolean().default(false),
    cents: money.nullable().default(null),
    consumed: quantity.optional(),
    packs: z.number().int().nonnegative().optional(),
    priceDate: date.optional(),
    source: z.string().max(200).optional(),
  }),
  budgets: z.object({
    name: text,
    start: date,
    end: date,
    period: z.enum(["semaine", "mois", "personnalisée"]),
    cents: money,
  }),
  expenses: z.object({ name: text, date, cents: money, category: text }),
  notifications: z.object({
    name: text,
    note,
    read: z.boolean().default(false),
  }),
};
export type Kind = keyof typeof schemas;
export type RecordData = {
  id: string;
  kind: Kind;
  data: any;
  revision: number;
  householdId: string | null;
  updatedAt: string;
};
export const kinds = Object.keys(schemas) as Kind[];
export const privateKinds: Kind[] = [
  "profiles",
  "goals",
  "weights",
  "measurements",
  "sports",
  "exercises",
  "workouts",
  "preferences",
  "notifications",
];
export const shareableKinds = kinds.filter((k) => !privateKinds.includes(k));
export const referenceKinds: Partial<Record<Kind, Record<string, Kind>>> = {
  workouts: { sportId: "sports", recurrenceSource: "workouts" },
  preferences: { foodId: "foods" },
  meals: { recipeId: "recipes" },
  products: { foodId: "foods", storeId: "stores" },
  prices: { productId: "products" },
  inventory: { foodId: "foods" },
  shoppingItems: {
    listId: "shoppingLists",
    foodId: "foods",
    productId: "products",
  },
};
export function references(
  kind: Kind,
  data: any,
): { id: string; kind: Kind }[] {
  const refs = Object.entries(referenceKinds[kind] || {})
    .filter(([field]) => data[field])
    .map(([field, target]) => ({ id: data[field], kind: target }));
  if (kind === "recipes")
    refs.push(
      ...data.ingredients.map((i: any) => ({ id: i.foodId, kind: "foods" })),
    );
  if (kind === "workouts")
    refs.push(
      ...data.sets.map((i: any) => ({ id: i.exerciseId, kind: "exercises" })),
    );
  return refs;
}
export function parseRecord(kind: Kind, data: unknown) {
  const parsed = schemas[kind].parse(data) as any;
  if (["budgets", "shoppingLists"].includes(kind) && parsed.end < parsed.start)
    throw new Error("La fin doit suivre le début");
  return parsed;
}
