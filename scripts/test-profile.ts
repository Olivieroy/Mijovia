// Initialisation explicite de données de recette, exclusivement dans une base dédiée.
if (
  !process.env.TEST_DATABASE_URL ||
  !process.env.TEST_PROFILE_EMAIL ||
  !process.env.TEST_PROFILE_PASSWORD
)
  throw Error(
    "TEST_DATABASE_URL, TEST_PROFILE_EMAIL et TEST_PROFILE_PASSWORD requis",
  );
if (process.env.TEST_DATABASE_URL === process.env.DATABASE_URL)
  throw Error("Utilisez une base de test distincte de DATABASE_URL");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const { query, sql, pool } = await import("../apps/api/src/db.js");
const { save } = await import("../apps/api/src/modules/data.js");
const { hashPassword } = await import("../apps/api/src/security.js");
const { randomUUID } = await import("node:crypto");
const id = randomUUID();
await query(
  sql`INSERT INTO users(id,email,name,password_hash,legal_version,legal_accepted_at) VALUES(${id},${process.env.TEST_PROFILE_EMAIL},'Profil de recette',${await hashPassword(process.env.TEST_PROFILE_PASSWORD)},'test',NOW())`,
);
await save(
  id,
  "profiles",
  {
    name: "Profil de recette",
    height: 175,
    healthConsent: true,
    excludedAllergens: ["lactose"],
    slots: ["Déjeuner", "Dîner"],
    onboarded: true,
  },
  null,
);
await save(
  id,
  "goals",
  {
    name: "Objectif de recette fourni",
    type: "perte",
    initial: 100,
    target: 78,
    deadline: "2027-05-31",
    note: "Mai 2027 ; le dernier jour du mois sert uniquement de date technique de test.",
  },
  null,
);
await save(
  id,
  "weights",
  { date: "2026-10-28", value: 100, note: "Donnée de test fournie" },
  null,
);
for (const [name, date] of [
  ["Kin-Ball", "2026-10-26"],
  ["Musculation bas du corps", "2026-10-27"],
  ["Musculation haut du corps", "2026-10-28"],
  ["Kin-Ball", "2026-10-29"],
  ["Repos", "2026-10-30"],
  ["Musculation Full Body", "2026-10-31"],
  ["Repos", "2026-11-01"],
])
  await save(
    id,
    "workouts",
    {
      name,
      date,
      duration: 0,
      status: name === "Repos" ? "repos" : "prévue",
      recurrence: "hebdomadaire",
      note: "Durée non fournie : à renseigner.",
    },
    null,
  );
await save(
  id,
  "stores",
  {
    name: "Hyper U Avrillé (exemple de test)",
    city: "Avrillé",
    postcode: "49240",
  },
  null,
);
await pool.end();
console.log("Profil de test créé. Aucun autre compte n’a reçu ces valeurs.");
