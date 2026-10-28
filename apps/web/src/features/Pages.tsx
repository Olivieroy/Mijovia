import { RecurringWorkouts } from "./RecurringWorkouts";
import { confirmAction, promptAction } from "../confirm";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { schemas, modules, type RecordData } from "@mijovia/shared";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { api } from "../api";
import { Collection, type Workspace } from "./Records";
import { euro, today, week, parseMoney } from "./definitions";
const value = (r: RecordData) => r.data.name || r.data.date;
export function Dashboard({ w }: { w: Workspace }) {
  const profile = w.personal.find((r) => r.kind === "profiles")?.data;
  const enabled = (profile?.modules || modules).filter(
    (m: string) => !profile?.widgets || profile.widgets.includes(m),
  );
  const activeBudget = w.records.filter(
    (r) =>
      r.kind === "budgets" && r.data.start <= today() && r.data.end >= today(),
  )[0];
  const spent = activeBudget
    ? w.records
        .filter(
          (r) =>
            r.kind === "expenses" &&
            r.data.date >= activeBudget.data.start &&
            r.data.date <= activeBudget.data.end,
        )
        .reduce((n, r) => n + r.data.cents, 0)
    : 0;
  const weights = w.personal
    .filter((r) => r.kind === "weights")
    .sort((a, b) => b.data.date.localeCompare(a.data.date));
  return (
    <>
      <div className="hero">
        <p className="eyebrow">Votre quotidien, à votre rythme</p>
        <h1>Bonjour {profile?.name || "et bienvenue"}.</h1>
        <p>Un espace pour prendre soin de vous et organiser vos semaines.</p>
        {!profile?.onboarded && (
          <Link className="button" to="/profil">
            Personnaliser mon espace
          </Link>
        )}
      </div>
      <div className="tiles">
        {enabled.includes("poids") && (
          <article className="tile">
            <span>Dernière pesée</span>
            <strong>
              {weights[0] ? weights[0].data.value + " kg" : "À votre rythme"}
            </strong>
            <Link to="/poids">Enregistrer une mesure</Link>
          </article>
        )}
        {enabled.includes("sport") && (
          <article className="tile">
            <span>Activité physique</span>
            <strong>
              {
                w.personal.filter(
                  (r) =>
                    r.kind === "workouts" &&
                    r.data.status === "effectuée" &&
                    week().includes(r.data.date),
                ).length
              }{" "}
              séance(s) cette semaine
            </strong>
            <Link to="/sport">Mon planning sportif</Link>
          </article>
        )}
        {enabled.includes("repas") && (
          <article className="tile">
            <span>Au menu aujourd’hui</span>
            <strong>
              {
                w.records.filter(
                  (r) => r.kind === "meals" && r.data.date === today(),
                ).length
              }{" "}
              repas planifié(s)
            </strong>
            <Link to="/repas">Organiser ma semaine</Link>
          </article>
        )}
        {enabled.includes("courses") && (
          <article className="tile">
            <span>Courses</span>
            <strong>
              {
                w.records.filter(
                  (r) =>
                    r.kind === "shoppingItems" &&
                    !r.data.checked &&
                    !r.data.available,
                ).length
              }{" "}
              article(s) à acheter
            </strong>
            <Link to="/courses">Ouvrir ma liste</Link>
          </article>
        )}
        {enabled.includes("budget") && (
          <article className="tile">
            <span>Budget de la période</span>
            <strong>
              {activeBudget
                ? euro(activeBudget.data.cents - spent, w.currency)
                : "À définir"}
            </strong>
            <Link to="/budget">Gérer mon budget</Link>
          </article>
        )}
        {enabled.includes("statistiques") && (
          <article className="tile">
            <span>Votre progression</span>
            <strong>Un regard sur vos habitudes</strong>
            <Link to="/statistiques">Voir mes statistiques</Link>
          </article>
        )}
      </div>
      <h2>Vos objectifs</h2>
      {w.personal
        .filter((r) => r.kind === "goals")
        .map((r) => (
          <article className="card" key={r.id}>
            <strong>{r.data.name}</strong>
            <p>
              {r.data.target && `Cible : ${r.data.target}`}{" "}
              {r.data.deadline && `pour le ${r.data.deadline}`}
            </p>
          </article>
        ))}
      {!w.personal.some((r) => r.kind === "goals") && (
        <p className="empty">
          Commencez par un objectif qui vous ressemble. Aucun objectif n’est
          imposé.
        </p>
      )}
      <Link to="/poids">Gérer mes objectifs</Link>
      <h2>Dernières modifications</h2>
      <ul>
        {[...w.personal, ...(w.householdId ? w.records : [])]
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .slice(0, 5)
          .map((r) => (
            <li key={r.id}>
              {value(r)} — {new Date(r.updatedAt).toLocaleDateString("fr-FR")}
            </li>
          ))}
      </ul>
    </>
  );
}
export function Profile({
  w,
  user,
  refresh,
}: {
  w: Workspace;
  user: any;
  refresh: () => Promise<unknown>;
}) {
  const existing = w.personal.find((r) => r.kind === "profiles");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const form = useForm<any>({
    defaultValues: {
      name: user.name,
      country: "",
      timezone: "Europe/Paris",
      currency: "EUR",
      units: "metric",
      theme: "system",
      modules: [...modules],
      healthConsent: false,
      slots: ["Déjeuner", "Dîner"],
      servings: 1,
      ...existing?.data,
    },
  });
  const personal = { ...w, records: w.personal, householdId: null };
  return (
    <>
      <h1>Profil et préférences</h1>
      <p>
        La configuration est facultative. Les données de santé restent privées,
        y compris au sein d’un foyer.
      </p>
      <form
        className="panel"
        onSubmit={form.handleSubmit(async (data) => {
          try {
            setError("");
            setSuccess("");
            const parsed = schemas.profiles.parse({
              ...data,
              height: data.height === "" ? undefined : Number(data.height),
              slots:
                typeof data.slotsText === "string"
                  ? data.slotsText
                      .split(",")
                      .map((x: string) => x.trim())
                      .filter(Boolean)
                  : data.slots,
              excludedAllergens:
                typeof data.allergensText === "string"
                  ? data.allergensText
                      .split(",")
                      .map((x: string) => x.trim())
                      .filter(Boolean)
                  : data.excludedAllergens,
              onboarded: true,
            });
            await personal.save("profiles", parsed, existing);
            setSuccess("Préférences enregistrées.");
          } catch (e) {
            setError((e as Error).message);
          }
        })}
      >
        <div className="form-grid">
          <label>
            Prénom ou pseudonyme
            <input {...form.register("name")} required />
          </label>
          <label>
            Taille en cm (facultative)
            <input
              type="number"
              min={0}
              step="any"
              {...form.register("height")}
            />
          </label>
          <label>
            Pays
            <input {...form.register("country")} />
          </label>
          <label>
            Fuseau horaire
            <input {...form.register("timezone")} />
          </label>
          <label>
            Devise (code ISO, par exemple EUR)
            <input
              {...form.register("currency")}
              pattern="[A-Z]{3}"
              maxLength={3}
            />
          </label>
          <label>
            Unités
            <select {...form.register("units")}>
              <option value="metric">Métriques</option>
              <option value="imperial">Impériales</option>
            </select>
          </label>
          <label>
            Apparence
            <select {...form.register("theme")}>
              <option value="system">Selon l’appareil</option>
              <option value="light">Clair</option>
              <option value="dark">Sombre</option>
            </select>
          </label>
          <label>
            Repas habituels, séparés par des virgules
            <input
              {...form.register("slotsText")}
              defaultValue={
                existing?.data.slots.join(", ") || "Déjeuner, Dîner"
              }
            />
          </label>
          <label>
            Portions habituelles
            <input
              type="number"
              min={0.01}
              step="any"
              {...form.register("servings", { valueAsNumber: true })}
            />
          </label>
          <label>
            Allergènes à exclure (virgules)
            <input
              {...form.register("allergensText")}
              defaultValue={existing?.data.excludedAllergens.join(", ") || ""}
            />
          </label>
        </div>
        <fieldset>
          <legend>Modules affichés</legend>
          {modules.map((m) => (
            <label className="check" key={m}>
              <input type="checkbox" value={m} {...form.register("modules")} />
              {m}
            </label>
          ))}
        </fieldset>
        <label className="check">
          <input
            type="checkbox"
            {...form.register("shareDietaryConstraints")}
          />
          J’autorise la prise en compte de mes allergènes à exclure lors de la
          génération des menus de mes foyers, sans afficher mon profil aux
          autres membres.
        </label>
        <fieldset>
          <legend>Widgets du tableau de bord</legend>
          {modules.map((m) => (
            <label className="check" key={m}>
              <input type="checkbox" value={m} {...form.register("widgets")} />
              {m}
            </label>
          ))}
        </fieldset>
        <label className="check">
          <input type="checkbox" {...form.register("healthConsent")} />
          Je consens explicitement à enregistrer mes données de poids et de
          mensurations pour mon suivi personnel. Je peux retirer ce
          consentement.
        </label>
        <p className="hint">
          Le retrait empêche les nouvelles saisies. Vous pouvez exporter et
          supprimer vos mesures existantes.
        </p>
        {error && (
          <p role="alert" className="message">
            {error}
          </p>
        )}
        {success && <p role="status">{success}</p>}
        <button disabled={form.formState.isSubmitting}>
          Enregistrer mes préférences
        </button>
        <Link to="/dashboard">Passer et revenir plus tard</Link>
      </form>
      <Collection kind="preferences" workspace={personal} />
      <section className="panel">
        <h2>Données et accès</h2>
        <p>
          Adresse : {user.email} —{" "}
          {user.email_verified ? "vérifiée" : "à vérifier"}
        </p>
        <button
          onClick={async () => {
            try {
              await api("/auth/verify/request", {});
              setSuccess("Lien envoyé.");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Recevoir un lien de vérification
        </button>
        <Link className="button secondary" to="/securite">
          Méthodes de connexion
        </Link>
        <button
          onClick={async () => {
            try {
              const data = await api("/account/export");
              const url = URL.createObjectURL(
                new Blob([JSON.stringify(data, null, 2)], {
                  type: "application/json",
                }),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = "mijovia-export.json";
              a.click();
              URL.revokeObjectURL(url);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Exporter mes données
        </button>
        <button
          onClick={async () => {
            try {
              await api("/account/sessions", {}, "DELETE");
              setSuccess("Les autres appareils ont été déconnectés.");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Déconnecter les autres appareils
        </button>
        <SessionList userId={user.id} />
        <button
          className="danger"
          onClick={async () => {
            const confirmation = await promptAction(
              "Cette suppression est définitive. Saisissez SUPPRIMER pour confirmer.",
            );
            if (confirmation !== "SUPPRIMER") return;
            try {
              await api("/account", { confirmation }, "DELETE");
              await refresh();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Supprimer mon compte
        </button>
      </section>
    </>
  );
}
function SessionList({ userId }: { userId: string }) {
  const query = useQuery({
    queryKey: ["sessions", userId],
    queryFn: () => api("/account/sessions"),
  });
  return (
    <details>
      <summary>Sessions actives ({query.data?.length || 0})</summary>
      <ul>
        {query.data?.map((s: any) => (
          <li key={s.id}>
            Connexion vérifiée le{" "}
            {new Date(Number(s.verified_at)).toLocaleString("fr-FR")},
            expiration le{" "}
            {new Date(Number(s.expires_at)).toLocaleDateString("fr-FR")}
          </li>
        ))}
      </ul>
    </details>
  );
}
export function Weight({ w }: { w: Workspace }) {
  const personal = { ...w, records: w.personal, householdId: null };
  const imperial =
    w.personal.find((r) => r.kind === "profiles")?.data.units === "imperial";
  const data = w.personal
    .filter((r) => r.kind === "weights")
    .map((r) => ({
      ...r.data,
      value: imperial
        ? Number((r.data.value * 2.2046226218).toFixed(2))
        : r.data.value,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return (
    <>
      <h1>Poids et objectifs</h1>
      <p>
        Suivez votre évolution sans programme imposé. Ces informations ne
        remplacent pas un avis médical.
      </p>
      <Chart
        data={data}
        dataKey="value"
        title={`Évolution du poids (${imperial ? "lb" : "kg"})`}
      />
      <Collection kind="weights" workspace={personal} />
      <Collection kind="goals" workspace={personal} />
      <Collection kind="measurements" workspace={personal} />
    </>
  );
}
export function Chart({
  data,
  dataKey,
  title,
  bar = false,
}: {
  data: any[];
  dataKey: string;
  title: string;
  bar?: boolean;
}) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {data.length ? (
        <>
          <div className="chart" aria-hidden="true">
            <ResponsiveContainer width="100%" height={240}>
              {bar ? (
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey={dataKey} fill="#54876c" />
                </BarChart>
              ) : (
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={["auto", "auto"]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey={dataKey}
                    stroke="#54876c"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
          <details>
            <summary>Données du graphique (alternative accessible)</summary>
            <div className="table-wrap">
              <table>
                <caption>{title}</caption>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Valeur</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((d, i) => (
                    <tr key={i}>
                      <td>{d.date}</td>
                      <td>{d[dataKey]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      ) : (
        <p className="empty">
          Vos données apparaîtront ici après les premières saisies.
        </p>
      )}
    </section>
  );
}
export function Sport({ w }: { w: Workspace }) {
  const personal = { ...w, records: w.personal, householdId: null };
  const [start, setStart] = useState(today());
  const [monthly, setMonthly] = useState(false);
  const days = monthly
    ? Array.from(
        {
          length: new Date(
            Number(start.slice(0, 4)),
            Number(start.slice(5, 7)),
            0,
          ).getDate(),
        },
        (_, i) => start.slice(0, 8) + String(i + 1).padStart(2, "0"),
      )
    : week(start);
  return (
    <>
      <h1>Activités et entraînements</h1>
      <div className="toolbar">
        <label>
          À partir du
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <button className="secondary" onClick={() => setMonthly(!monthly)}>
          {monthly ? "Vue semaine" : "Vue mois"}
        </button>
      </div>
      <div className="calendar">
        {days.map((d) => (
          <article className="day" key={d}>
            <h3>
              {new Date(d + "T12:00:00").toLocaleDateString("fr-FR", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </h3>
            {w.personal
              .filter((r) => r.kind === "workouts" && r.data.date === d)
              .map((r) => (
                <p key={r.id}>
                  {r.data.name}
                  <br />
                  <small>
                    {r.data.time || ""} {r.data.duration} min · {r.data.status}
                  </small>
                </p>
              ))}
          </article>
        ))}
      </div>
      <RecurringWorkouts w={personal} />
      <Collection kind="workouts" workspace={personal} />
      <Collection kind="sports" workspace={personal} />
      <Collection kind="exercises" workspace={personal} />
    </>
  );
}
export function Meals({ w }: { w: Workspace }) {
  const [start, setStart] = useState(week()[0]);
  const [message, setMessage] = useState("");
  const profile = w.personal.find((r) => r.kind === "profiles")?.data;
  const slots = profile?.slots || ["Déjeuner", "Dîner"];
  const days = week(start);
  const [busy, setBusy] = useState(false);
  const execute = async (path: string, body: any) => {
    setBusy(true);
    try {
      const result = await w.act(path, body);
      setMessage(
        result.count !== undefined
          ? `${result.count} repas enregistrés.`
          : "Opération effectuée.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <h1>Mes repas</h1>
      <p>
        Une semaine à votre goût. Les quantités dépendent des portions choisies
        pour chaque repas.
      </p>
      <label>
        Semaine du
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </label>
      <div className="calendar">
        {days.map((day) => (
          <article className="day" key={day}>
            <h3>
              {new Date(day + "T12:00:00").toLocaleDateString("fr-FR", {
                weekday: "short",
                day: "numeric",
              })}
            </h3>
            {slots.map((slot: string) => {
              const meals = w.records.filter(
                (r) =>
                  r.kind === "meals" &&
                  r.data.date === day &&
                  r.data.slot === slot,
              );
              return (
                <div className="meal" key={slot}>
                  <strong>{slot}</strong>
                  {!meals.length && <p className="hint">À planifier</p>}
                  {meals.map((meal) => (
                    <div key={meal.id}>
                      <p>
                        {
                          w.records.find((r) => r.id === meal.data.recipeId)
                            ?.data.name
                        }
                        <br />
                        <small>
                          {meal.data.servings} portion(s){" "}
                          {meal.data.locked ? "· Verrouillé" : ""}
                        </small>
                      </p>

                      <span>{meal.data.consumed ? "Consommé" : ""}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </article>
        ))}
      </div>
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          execute("/meals/generate", {
            start: days[0],
            end: days[6],
            slots,
            servings: Number(d.get("servings")),
            maxPrep: d.get("maxPrep") ? Number(d.get("maxPrep")) : undefined,
            budgetCents: d.get("budget")
              ? parseMoney(String(d.get("budget")))
              : undefined,
            storeId: d.get("storeId") || undefined,
          });
        }}
      >
        <h2>Générer ma semaine</h2>
        <p>
          Génération déterministe, sans IA. Les repas verrouillés sont
          conservés. Les exclusions et allergènes renseignés sont pris en compte
          ; une donnée inconnue empêche de garantir une compatibilité.
        </p>
        <div className="form-grid">
          <label>
            Portions par repas
            <input
              name="servings"
              type="number"
              min={0.1}
              step="any"
              defaultValue={profile?.servings || 1}
              required
            />
          </label>
          <label>
            Temps total maximum (min, facultatif)
            <input name="maxPrep" type="number" min={1} />
          </label>
          <label>
            Budget maximum (facultatif)
            <input name="budget" inputMode="decimal" />
          </label>
          <label>
            Magasin (facultatif)
            <select name="storeId">
              <option value="">Tous les magasins renseignés</option>
              {w.records
                .filter((r) => r.kind === "stores")
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.data.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <button disabled={busy}>Générer ma semaine</button>
      </form>
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          execute("/meals/copy", {
            start: d.get("sourceStart"),
            end: d.get("sourceEnd"),
            target: d.get("target"),
          });
        }}
      >
        <h2>Dupliquer une journée ou une semaine</h2>
        <div className="form-grid">
          <label>
            Premier jour source
            <input
              name="sourceStart"
              type="date"
              defaultValue={days[0]}
              required
            />
          </label>
          <label>
            Dernier jour source
            <input
              name="sourceEnd"
              type="date"
              defaultValue={days[6]}
              required
            />
          </label>
        </div>
        <label>
          Premier jour de destination
          <input type="date" name="target" required />
        </label>
        <button disabled={busy}>Dupliquer</button>
      </form>
      {message && (
        <p role="status" className="message">
          {message}
        </p>
      )}
      <Collection kind="meals" workspace={w} />
    </>
  );
}
export function Shopping({ w }: { w: Workspace }) {
  const [result, setResult] = useState<any>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <h1>Courses et inventaire</h1>
      <p>
        Les stocks sont déduits et les achats sont arrondis aux conditionnements
        disponibles. Un prix absent reste inconnu.
      </p>
      <form
        className="panel"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          try {
            const d = new FormData(e.currentTarget);
            const p = {
              start: d.get("start"),
              end: d.get("end"),
              storeId: d.get("storeId") || undefined,
            };
            const mode = (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
              "value",
            );
            if (mode === "generate") {
              await w.act("/shopping/generate", p);
              setMessage(
                "Liste enregistrée. Les listes précédentes sont conservées.",
              );
            } else
              setResult(
                await w.act(
                  mode === "optimize"
                    ? "/shopping/optimize"
                    : "/shopping/preview",
                  p,
                ),
              );
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <label>
            Du
            <input name="start" type="date" defaultValue={week()[0]} required />
          </label>
          <label>
            Au
            <input name="end" type="date" defaultValue={week()[6]} required />
          </label>
          <label>
            Magasin
            <select name="storeId">
              <option value="">Comparer les magasins saisis</option>
              {w.records
                .filter((r) => r.kind === "stores")
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.data.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <button value="preview" disabled={busy}>
          Estimer mon panier
        </button>
        <button value="generate" disabled={busy}>
          Générer les courses
        </button>
        <button value="optimize" disabled={busy}>
          Optimiser mon panier
        </button>
      </form>
      {message && (
        <p role="status" className="message">
          {message}
        </p>
      )}
      {result && (
        <section className="panel">
          <h2>Panier estimé</h2>
          {result.perMeal !== undefined && (
            <p>
              Coût d’achat moyen par repas :{" "}
              {result.perMeal === null
                ? "inconnu"
                : euro(result.perMeal, w.currency)}{" "}
              · par portion :{" "}
              {result.perPerson === null
                ? "inconnu"
                : euro(result.perPerson, w.currency)}
              {result.total.missing ? " (estimation incomplète)" : ""}
            </p>
          )}
          <p className="big-number">
            {euro(result.total.cents, w.currency)}{" "}
            {result.total.missing > 0 && (
              <small>
                + {result.total.missing} prix inconnu(s) : total incomplet
              </small>
            )}
          </p>
          <ul>
            {result.items.map((i: any) => (
              <li key={i.foodId}>
                {i.name} : {i.quantity} {i.unit}, besoin consommé {i.consumed}{" "}
                {i.unit} —{" "}
                {i.cents === null ? "Prix inconnu" : euro(i.cents, w.currency)}{" "}
                {i.packs !== undefined && `(${i.packs} conditionnement(s))`}{" "}
                {i.priceDate && `· tarif du ${i.priceDate} · ${i.source}`}
              </li>
            ))}
          </ul>
          {result.notes && (
            <ul>
              {result.notes.map((n: any, i: number) => (
                <li key={i}>
                  {n.food} : {n.detail}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <Collection kind="shoppingLists" workspace={w} />
      <Collection kind="shoppingItems" workspace={w} />
      <Collection kind="inventory" workspace={w} />
    </>
  );
}
export function Budget({ w }: { w: Workspace }) {
  return (
    <>
      <h1>Mon budget alimentaire</h1>
      <p>
        Définissez votre période et votre montant librement. Les tarifs saisis
        servent d’estimations ; vos dépenses réelles restent distinctes.
      </p>
      <div className="tiles">
        {w.records
          .filter((r) => r.kind === "budgets")
          .map((b) => {
            const spent = w.records
              .filter(
                (r) =>
                  r.kind === "expenses" &&
                  r.data.date >= b.data.start &&
                  r.data.date <= b.data.end,
              )
              .reduce((sum, r) => sum + r.data.cents, 0);
            return (
              <article className="tile" key={b.id}>
                <h2>{b.data.name}</h2>
                <strong>{euro(b.data.cents - spent, w.currency)}</strong>
                <span>
                  {spent > b.data.cents ? "Dépassement" : "Restant"} · prévu{" "}
                  {euro(b.data.cents, w.currency)}, dépensé{" "}
                  {euro(spent, w.currency)}
                </span>
              </article>
            );
          })}
      </div>
      <Collection kind="budgets" workspace={w} />
      <Collection kind="expenses" workspace={w} />
    </>
  );
}
export function Statistics({ w }: { w: Workspace }) {
  const [start, setStart] = useState(week()[0]);
  const [end, setEnd] = useState(today());
  const q = useQuery({
    queryKey: [
      "statistics",
      w.userId,
      start,
      end,
      w.householdId,
      w.records,
      w.personal,
    ],
    queryFn: () =>
      api(
        "/statistics?start=" +
          start +
          "&end=" +
          end +
          (w.householdId ? "&householdId=" + w.householdId : ""),
      ),
  });
  const data = q.data;
  return (
    <>
      <h1>Mes statistiques</h1>
      <div className="toolbar">
        <label>
          Du
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label>
          Au
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        <label>
          Période
          <select
            onChange={(e) => {
              const d = new Date();
              d.setMonth(d.getMonth() - Number(e.target.value));
              setStart(d.toLocaleDateString("en-CA"));
              setEnd(today());
            }}
          >
            <option value="0">Personnalisée</option>
            {[1, 3, 6, 12].map((n) => (
              <option key={n} value={n}>
                {n} mois
              </option>
            ))}
          </select>
        </label>
      </div>
      {q.error && <p role="alert">{q.error.message}</p>}
      {data && (
        <>
          <div className="tiles">
            <article className="tile">
              <span>Séances effectuées</span>
              <strong>{data.workouts.length}</strong>
            </article>
            <article className="tile">
              <span>Temps d’activité</span>
              <strong>{data.duration} min</strong>
            </article>
            <article className="tile">
              <span>Repas planifiés</span>
              <strong>{data.meals.length}</strong>
            </article>
          </div>
          <Chart data={data.weights} dataKey="value" title="Poids (kg)" />
          <Chart
            data={data.weights}
            dataKey="average"
            title="Moyenne mobile des sept dernières pesées"
          />
          <Chart
            data={data.workouts}
            dataKey="duration"
            title="Durée des séances (minutes)"
            bar
          />
          <Chart
            data={data.expenses.map((e: any) => ({
              ...e,
              euros: e.cents / 100,
            }))}
            dataKey="euros"
            title={`Dépenses (${w.currency})`}
            bar
          />
          <h2>Budgets et dépenses</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Budget</th>
                  <th>Prévu</th>
                  <th>Dépensé</th>
                  <th>Restant</th>
                </tr>
              </thead>
              <tbody>
                {data.budgets.map((b: any, i: number) => (
                  <tr key={i}>
                    <td>{b.name}</td>
                    <td>{euro(b.planned, w.currency)}</td>
                    <td>{euro(b.spent, w.currency)}</td>
                    <td>{euro(b.remaining, w.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h2>Dépenses par catégorie</h2>
          <ul>
            {[
              ...new Set<string>(data.expenses.map((e: any) => e.category)),
            ].map((c) => (
              <li key={c}>
                {c} :{" "}
                {euro(
                  data.expenses
                    .filter((e: any) => e.category === c)
                    .reduce((n: number, e: any) => n + e.cents, 0),
                  w.currency,
                )}
              </li>
            ))}
          </ul>
          <h2>Répartition des activités</h2>
          <ul>
            {[...new Set<string>(data.sports.map((s: any) => s.sport))].map(
              (s) => (
                <li key={s}>
                  {s} : {data.sports.filter((w: any) => w.sport === s).length}{" "}
                  séance(s),{" "}
                  {data.sports
                    .filter((w: any) => w.sport === s)
                    .reduce((n: number, w: any) => n + w.duration, 0)}{" "}
                  minutes
                </li>
              ),
            )}
          </ul>
          <h2>Progression des charges</h2>
          {[...new Set<string>(data.sets.map((s: any) => s.name))].map(
            (name) => (
              <Chart
                key={name}
                data={data.sets.filter((s: any) => s.name === name)}
                dataKey="weight"
                title={`${name} — charge (kg)`}
              />
            ),
          )}
          <h2>Historique des prix</h2>
          {[...new Set<string>(data.prices.map((p: any) => p.name))].map(
            (name) => (
              <Chart
                key={name}
                data={data.prices
                  .filter((p: any) => p.name === name)
                  .sort((a: any, b: any) => a.date.localeCompare(b.date))
                  .map((p: any) => ({ ...p, price: p.cents / 100 }))}
                dataKey="price"
                title={`${name} — prix (${w.currency})`}
              />
            ),
          )}
          <h2>Estimations nutritionnelles des repas</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Repas</th>
                  <th>Énergie (kcal)</th>
                  <th>Qualité des données</th>
                </tr>
              </thead>
              <tbody>
                {data.nutrition.map((n: any, i: number) => (
                  <tr key={i}>
                    <td>{n.date}</td>
                    <td>{n.name}</td>
                    <td>{n.energy?.toFixed(0) || "Inconnue"}</td>
                    <td>
                      {n.missing
                        ? "Partielles ou absentes"
                        : "D’après les valeurs saisies"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint">
            Les estimations nutritionnelles ne sont calculables que si les
            aliments disposent de données adaptées ; aucune valeur n’est
            inventée.
          </p>
        </>
      )}
    </>
  );
}
