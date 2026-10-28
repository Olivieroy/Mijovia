import { useState } from "react";
import type { Workspace } from "./Records";
export function RecurringWorkouts({ w }: { w: Workspace }) {
  const [message, setMessage] = useState("");
  return (
    <form
      className="panel"
      onSubmit={async (e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        try {
          const result = await w.act("/workouts/expand", {
            workoutId: d.get("workoutId"),
            until: d.get("until"),
          });
          setMessage(
            `${result.count} séances créées. Les occurrences déjà présentes ont été conservées.`,
          );
        } catch (e) {
          setMessage((e as Error).message);
        }
      }}
    >
      <h2>Planifier les séances récurrentes</h2>
      <p>
        Choisissez une séance marquée « hebdomadaire » puis la date de fin de
        répétition. Les séances sont enregistrées et restent modifiables
        indépendamment.
      </p>
      <div className="form-grid">
        <label>
          Séance de référence
          <select name="workoutId" required>
            <option value="">Choisir</option>
            {w.records
              .filter(
                (r) =>
                  r.kind === "workouts" && r.data.recurrence === "hebdomadaire",
              )
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.data.name} · {r.data.date}
                </option>
              ))}
          </select>
        </label>
        <label>
          Répéter chaque semaine jusqu’au
          <input name="until" type="date" required />
        </label>
      </div>
      <button>Créer les occurrences</button>
      {message && (
        <p role="status" className="message">
          {message}
        </p>
      )}
    </form>
  );
}
