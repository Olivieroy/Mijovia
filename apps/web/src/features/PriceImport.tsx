import { useState } from "react";
import type { Workspace } from "./Records";
import { parseMoney } from "./definitions";
export function PriceImport({ w }: { w: Workspace }) {
  const [message, setMessage] = useState("");
  return (
    <details className="panel">
      <summary>Importer un historique de prix CSV</summary>
      <p>
        Un produit à la fois, 500 lignes maximum. Format sans en-tête :{" "}
        <code>2026-10-28;2,10;Ticket de caisse</code>. Les montants représentent
        le conditionnement entier, dans la devise de votre profil.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          try {
            const file = d.get("csv") as File;
            if (!file || file.size > 64000)
              throw Error("Fichier manquant ou supérieur à 64 Ko");
            const lines = (await file.text())
              .trim()
              .split(/\r?\n/)
              .filter(Boolean);
            const items = lines.map((line) => {
              const [date, price, source] = line.split(";");
              return {
                productId: d.get("productId"),
                date,
                cents: parseMoney(price),
                source: source || file.name,
                reliability: "importée",
              };
            });
            const result = await w.act("/prices/import", { items });
            setMessage(
              `${result.count} prix importés. Aucun tarif n’est présenté comme officiel.`,
            );
          } catch (e) {
            setMessage((e as Error).message);
          }
        }}
      >
        <label>
          Produit
          <select name="productId" required>
            <option value="">Choisir</option>
            {w.records
              .filter((r) => r.kind === "products")
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.data.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Fichier CSV
          <input type="file" name="csv" accept=".csv,text/csv" required />
        </label>
        <button>Importer les prix</button>
      </form>
      {message && (
        <p role="status" className="message">
          {message}
        </p>
      )}
    </details>
  );
}
