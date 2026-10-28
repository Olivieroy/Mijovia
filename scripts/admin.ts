import mysql from "mysql2/promise";
const email = process.argv[2];
if (!email) throw Error("Usage : npm run account:admin -- adresse@example.fr");
const db = await mysql.createConnection(process.env.DATABASE_URL!);
const [result]: any = await db.execute(
  "UPDATE users SET role='admin' WHERE email=?",
  [email.toLowerCase()],
);
if (result.affectedRows !== 1)
  throw Error("Créez ce compte avant de lui attribuer le rôle administrateur.");
console.log("Rôle administrateur attribué au compte demandé.");
await db.end();
