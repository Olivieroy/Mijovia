// Passenger doit charger la configuration avant les imports qui initialisent MySQL.
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
require("dotenv").config({ path: path.join(root, ".env") });
process.chdir(root);
import("./dist/server.js").catch((error) => {
  console.error("Mijovia startup failed:", error.name);
  process.exit(1);
});
