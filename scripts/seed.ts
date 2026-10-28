import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
const db = await mysql.createConnection(process.env.DATABASE_URL!);
const foods = [
  "Pâtes",
  "Riz",
  "Pommes de terre",
  "Bœuf haché",
  "Poulet",
  "Cabillaud",
  "Œufs",
  "Tomates",
  "Salade",
  "Concombre",
  "Emmental",
  "Crème",
  "Lardons",
  "Haricots verts",
];
const rows: any[] = foods.map((name) => ({
  id: randomUUID(),
  kind: "foods",
  data: {
    name,
    category: ["Poulet", "Bœuf haché", "Cabillaud", "Lardons"].includes(name)
      ? "Viandes et poissons"
      : ["Pâtes", "Riz", "Pommes de terre"].includes(name)
        ? "Féculents"
        : "Autres",
    unit: name === "Œufs" ? "pièce" : "g",
    allergens: null,
    note: "Aliment du catalogue de départ. Vérifiez les informations allergènes sur le produit utilisé.",
  },
}));
const ingredient = (name: string, quantity: string) => ({
  foodId: rows.find((r) => r.kind === "foods" && r.data.name === name).id,
  quantity,
  unit: name === "Œufs" ? "pièce" : "g",
});
const recipes: [string, [string, string][], string][] = [
  [
    "Pâtes bolognaise",
    [
      ["Pâtes", "200"],
      ["Bœuf haché", "200"],
      ["Tomates", "300"],
    ],
    "Cuire les pâtes. Faire revenir le bœuf. Ajouter les tomates et laisser mijoter. Servir ensemble.",
  ],
  [
    "Pâtes carbonara",
    [
      ["Pâtes", "200"],
      ["Œufs", "2"],
      ["Lardons", "100"],
    ],
    "Cuire les pâtes. Dorer les lardons. Hors du feu, mélanger les pâtes chaudes avec les œufs battus et les lardons.",
  ],
  [
    "Gratin de pâtes",
    [
      ["Pâtes", "200"],
      ["Crème", "100"],
      ["Emmental", "80"],
    ],
    "Cuire les pâtes. Mélanger avec la crème. Ajouter le fromage et gratiner au four en surveillant la cuisson.",
  ],
  [
    "Poulet et riz",
    [
      ["Poulet", "250"],
      ["Riz", "150"],
    ],
    "Cuire le riz. Cuire le poulet à cœur à la poêle. Servir ensemble.",
  ],
  [
    "Cabillaud et légumes",
    [
      ["Cabillaud", "250"],
      ["Haricots verts", "300"],
    ],
    "Cuire le poisson à cœur et les légumes à la vapeur ou à la poêle. Assaisonner selon vos goûts.",
  ],
  [
    "Omelette",
    [["Œufs", "4"]],
    "Battre les œufs et cuire dans une poêle jusqu’à la cuisson souhaitée.",
  ],
  [
    "Salade composée",
    [
      ["Salade", "150"],
      ["Tomates", "200"],
      ["Concombre", "150"],
    ],
    "Laver les légumes. Couper les tomates et le concombre. Mélanger et assaisonner.",
  ],
  [
    "Bœuf et pommes de terre",
    [
      ["Bœuf haché", "250"],
      ["Pommes de terre", "400"],
    ],
    "Cuire les pommes de terre. Former deux steaks hachés et les cuire à cœur. Servir ensemble.",
  ],
];
for (const [name, ingredients, steps] of recipes)
  rows.push({
    id: randomUUID(),
    kind: "recipes",
    data: {
      name,
      description:
        "Recette de départ pour deux portions, librement adaptable. Durées indicatives.",
      category: "Plat",
      portions: 2,
      ingredients: ingredients.map(([n, q]) => ingredient(n, q)),
      steps,
      prep: 15,
      cook: 20,
      favorite: false,
    },
  });
const [settings]: any = await db.query(
  "SELECT data FROM settings WHERE id='catalogue'",
);
const existing =
  typeof settings[0]?.data === "string"
    ? JSON.parse(settings[0].data)
    : settings[0]?.data;
if (existing?.length) {
  console.log("Catalogue déjà présent : aucune modification.");
} else {
  await db.query("UPDATE settings SET data=? WHERE id='catalogue'", [
    JSON.stringify(rows),
  ]);
  console.log(
    "Catalogue de départ ajouté, sans compte utilisateur, prix ni données nutritionnelles inventés.",
  );
}
await db.end();
