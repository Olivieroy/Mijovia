// Point d’entrée CommonJS pour les versions de Passenger qui chargent via require().
// Définir Application root à la racine du monorepo et startup file à apps/api/passenger.cjs.
import("./dist/server.js").catch((error) => {
  console.error("Mijovia startup failed:", error.name);
  process.exit(1);
});
