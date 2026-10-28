import { useState } from "react";
import type { Workspace } from "./Records";
import { today, euro } from "./definitions";
export function RecipeTools({ w }: { w: Workspace }) {
  const [result, setResult] = useState<any>();
  const [alternatives, setAlternatives] = useState<any[]>();
  const [message, setMessage] = useState("");
  return (
    <section className="panel">
      <h2>Adapter ou trouver une recette</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          try {
            const mode = (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
              "value",
            );
            const payload = {
              recipeId: d.get("recipeId"),
              servings: Number(d.get("servings")),
            };
            if (mode === "portions") {
              setResult(await w.act("/recipes/portions", payload));
              setAlternatives(undefined);
            } else {
              setAlternatives(
                await w.act("/meals/alternatives", {
                  ...payload,
                  date: today(),
                  mode,
                }),
              );
              setResult(undefined);
            }
            setMessage("");
          } catch (e) {
            setMessage((e as Error).message);
          }
        }}
      >
        <div className="form-grid">
          <label>
            Recette
            <select name="recipeId" required>
              <option value="">Choisir une recette</option>
              {w.records
                .filter((r) => r.kind === "recipes")
                .map((r) => (
                  <option value={r.id} key={r.id}>
                    {r.data.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Portions souhaitées
            <input
              name="servings"
              type="number"
              min={0.1}
              step="any"
              required
              defaultValue={1}
            />
          </label>
        </div>
        <button value="portions">Recalculer les quantités</button>
        <button value="similaire" className="secondary">
          Recettes similaires
        </button>
        <button value="prix" className="secondary">
          Moins chères
        </button>
        <button value="stock" className="secondary">
          Utiliser mes stocks
        </button>
        <button value="rapide" className="secondary">
          Plus rapides
        </button>
      </form>
      {message && (
        <p role="alert" className="message">
          {message}
        </p>
      )}
      {result && (
        <>
          <ul>
            {result.ingredients.map((i: any, n: number) => (
              <li key={n}>
                {i.name} : {i.quantity} {i.unit}
              </li>
            ))}
          </ul>
          <p>
            Estimation nutritionnelle pour {result.nutrition.servings}{" "}
            portion(s) : {result.nutrition.energy.toFixed(0)} kcal, protéines{" "}
            {result.nutrition.protein.toFixed(1)} g, glucides{" "}
            {result.nutrition.carbs.toFixed(1)} g, lipides{" "}
            {result.nutrition.fat.toFixed(1)} g.{" "}
            {result.nutrition.missing > 0
              ? "Données incomplètes : les valeurs ci-dessus sont partielles."
              : "Calcul d’après les valeurs saisies."}
          </p>
        </>
      )}
      {alternatives && (
        <ul>
          {alternatives.map((a) => (
            <li key={a.id}>
              {a.name} — {a.prep} min —{" "}
              {a.cost.missing
                ? "Prix incomplet"
                : euro(a.cost.cents, w.currency)}{" "}
              — {a.stock} ingrédient(s) en stock
            </li>
          ))}
          {!alternatives.length && <li>Aucune alternative compatible.</li>}
        </ul>
      )}
    </section>
  );
}
