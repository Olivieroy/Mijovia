import { app } from "./app.js";
import { pool } from "./db.js";
const server = app.listen(Number(process.env.PORT || 3000));
process.on("SIGTERM", () =>
  server.close(() => pool.end().then(() => process.exit(0))),
);
