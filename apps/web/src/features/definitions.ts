import type { Kind } from "@mijovia/shared";
export type Field = {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  ref?: Kind;
  optional?: boolean;
};
const f = (
  key: string,
  label: string,
  type = "text",
  optional = false,
): Field => ({ key, label, type, optional });
const ref = (
  key: string,
  label: string,
  kind: Kind,
  optional = false,
): Field => ({ key, label, ref: kind, optional });
const select = (key: string, label: string, options: string[]): Field => ({
  key,
  label,
  options,
});
const unit = () => select("unit", "Unité", ["g", "kg", "ml", "l", "pièce"]);
const note = () => f("note", "Notes", "textarea", true);
export const definitions: Record<
  Kind,
  { title: string; singular: string; fields: Field[] }
> = {
  profiles: { title: "Profil", singular: "profil", fields: [] },
  goals: {
    title: "Objectifs",
    singular: "objectif",
    fields: [
      f("name", "Intitulé"),
      select("type", "Objectif", [
        "perte",
        "prise",
        "maintien",
        "muscle",
        "forme",
        "organisation",
        "budget",
        "personnalisé",
      ]),
      f("initial", "Valeur initiale", "number", true),
      f("target", "Cible", "number", true),
      f("deadline", "Date cible", "date", true),
      note(),
    ],
  },
  weights: {
    title: "Pesées",
    singular: "pesée",
    fields: [
      f("date", "Date", "date"),
      f("value", "Poids (kg)", "number"),
      note(),
    ],
  },
  measurements: {
    title: "Mensurations",
    singular: "mensuration",
    fields: [
      f("date", "Date", "date"),
      f("name", "Mesure (taille, hanches, bras…)"),
      f("value", "Valeur", "number"),
      f("unit", "Unité"),
      note(),
    ],
  },
  sports: {
    title: "Mes sports",
    singular: "sport",
    fields: [f("name", "Nom"), f("category", "Catégorie")],
  },
  exercises: {
    title: "Exercices",
    singular: "exercice",
    fields: [f("name", "Nom"), f("muscle", "Groupe musculaire"), note()],
  },
  workouts: {
    title: "Séances",
    singular: "séance",
    fields: [
      f("name", "Nom"),
      ref("sportId", "Sport", "sports", true),
      f("date", "Date", "date"),
      f("time", "Horaire", "time", true),
      f("duration", "Durée (minutes)", "number"),
      f("distance", "Distance (km)", "number", true),
      f("intensity", "Intensité ressentie (0–10)", "number", true),
      select("status", "Statut", ["prévue", "effectuée", "annulée", "repos"]),
      select("recurrence", "Récurrence", ["aucune", "hebdomadaire"]),
      f("sets", "Séries", "sets"),
      note(),
    ],
  },
  foods: {
    title: "Aliments",
    singular: "aliment",
    fields: [
      f("name", "Nom"),
      f("category", "Catégorie"),
      unit(),
      f(
        "allergens",
        "Allergènes connus (virgules) ; vide = inconnus",
        "allergens",
      ),
      f("nutrition", "Nutrition pour 100 g / 100 ml", "nutrition"),
      note(),
    ],
  },
  preferences: {
    title: "Préférences alimentaires",
    singular: "préférence",
    fields: [
      ref("foodId", "Aliment", "foods"),
      select("kind", "Préférence", [
        "aime",
        "déteste",
        "refuse",
        "allergie",
        "intolérance",
        "favori",
      ]),
      note(),
    ],
  },
  recipes: {
    title: "Recettes",
    singular: "recette",
    fields: [
      f("name", "Titre"),
      f("description", "Description", "textarea", true),
      f("category", "Catégorie"),
      f("portions", "Portions de la recette", "number"),
      f("ingredients", "Ingrédients", "ingredients"),
      f("steps", "Étapes (une par ligne)", "textarea"),
      f("prep", "Préparation (min)", "number"),
      f("cook", "Cuisson (min)", "number"),
      f("favorite", "Favori", "checkbox"),
      f("photo", "URL HTTPS de la photo", "url", true),
    ],
  },
  meals: {
    title: "Repas",
    singular: "repas",
    fields: [
      f("date", "Date", "date"),
      f("slot", "Repas (déjeuner, dîner…)"),
      ref("recipeId", "Recette", "recipes"),
      f("servings", "Nombre de portions / convives", "number"),
      f("members", "Membres du foyer", "members"),
      f("guests", "Invités supplémentaires", "number"),
      f("locked", "Verrouillé", "checkbox"),
      f("consumed", "Consommé", "checkbox"),
      f("favorite", "Semaine favorite", "checkbox"),
    ],
  },
  stores: {
    title: "Magasins",
    singular: "magasin",
    fields: [
      f("name", "Nom"),
      f("city", "Ville"),
      f("postcode", "Code postal"),
      f("favorite", "Favori", "checkbox"),
    ],
  },
  products: {
    title: "Produits",
    singular: "produit",
    fields: [
      f("name", "Nom"),
      f("brand", "Marque", "text", true),
      f("category", "Catégorie"),
      ref("storeId", "Magasin", "stores"),
      ref("foodId", "Aliment", "foods"),
      f("packQuantity", "Quantité du conditionnement", "quantity"),
      unit(),
    ],
  },
  prices: {
    title: "Historique des prix",
    singular: "prix",
    fields: [
      ref("productId", "Produit", "products"),
      f("cents", "Prix du conditionnement", "money"),
      f("date", "Date de vérification", "date"),
      f("source", "Source (ticket, saisie…)"),
      select("reliability", "Fiabilité", [
        "saisie",
        "estimée",
        "importée",
        "vérifiée",
      ]),
    ],
  },
  inventory: {
    title: "Inventaire",
    singular: "stock",
    fields: [
      ref("foodId", "Aliment", "foods"),
      f("quantity", "Quantité disponible", "quantity"),
      unit(),
      f("expiry", "Date de péremption", "date", true),
    ],
  },
  shoppingLists: {
    title: "Listes de courses",
    singular: "liste",
    fields: [
      f("name", "Nom"),
      f("start", "Du", "date"),
      f("end", "Au", "date"),
    ],
  },
  shoppingItems: {
    title: "Articles à acheter",
    singular: "article",
    fields: [
      ref("listId", "Liste", "shoppingLists"),
      f("name", "Article"),
      f("category", "Rayon"),
      ref("foodId", "Aliment", "foods", true),
      ref("productId", "Produit", "products", true),
      f("quantity", "Quantité à acheter", "quantity"),
      unit(),
      f("cents", "Coût total (vide = inconnu)", "money", true),
      f("checked", "Acheté", "checkbox"),
      f("available", "Déjà disponible", "checkbox"),
    ],
  },
  budgets: {
    title: "Budgets",
    singular: "budget",
    fields: [
      f("name", "Intitulé"),
      f("start", "Du", "date"),
      f("end", "Au", "date"),
      select("period", "Période", ["semaine", "mois", "personnalisée"]),
      f("cents", "Montant", "money"),
    ],
  },
  expenses: {
    title: "Dépenses",
    singular: "dépense",
    fields: [
      f("name", "Libellé"),
      f("date", "Date", "date"),
      f("cents", "Montant", "money"),
      f("category", "Catégorie"),
    ],
  },
  notifications: {
    title: "Notifications",
    singular: "notification",
    fields: [f("name", "Titre"), note(), f("read", "Lue", "checkbox")],
  },
};
export const today = () => new Date().toLocaleDateString("en-CA");
export function week(start = today()) {
  const d = new Date(start + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(d);
    date.setUTCDate(date.getUTCDate() + i);
    return date.toISOString().slice(0, 10);
  });
}
export const euro = (cents: number, currency = "EUR") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
    cents / 100,
  );
export function parseMoney(value: string) {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value))
    throw Error("Montant invalide (deux décimales maximum)");
  const [whole, fraction = ""] = value.replace(",", ".").split(".");
  const n = Number(BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0")));
  if (!Number.isSafeInteger(n)) throw Error("Montant trop important");
  return n;
}
