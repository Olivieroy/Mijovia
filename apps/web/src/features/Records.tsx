import styles from "./Status.module.css";
import { confirmAction, promptAction } from "../confirm";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { schemas, type Kind, type RecordData } from "@mijovia/shared";
import { definitions, today, euro, parseMoney } from "./definitions";
export type Workspace = {
  userId?: string;
  records: RecordData[];
  personal: RecordData[];
  householdId: string | null;
  members: { id: string; name: string }[];
  currency: string;
  save: (kind: Kind, data: any, existing?: RecordData) => Promise<void>;
  remove: (r: RecordData) => Promise<void>;
  act: (path: string, body?: unknown, method?: string) => Promise<any>;
};
function ArrayFields({
  type,
  form,
  records,
  members,
}: {
  type: string;
  form: any;
  records: RecordData[];
  members: Workspace["members"];
}) {
  const key = type === "ingredients" ? "ingredients" : "sets";
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: key,
  });
  const choices = records.filter(
    (r) => r.kind === (type === "ingredients" ? "foods" : "exercises"),
  );
  return (
    <fieldset className="array">
      <legend>
        {type === "ingredients" ? "Ingrédients" : "Séries de musculation"}
      </legend>
      {fields.map((item, i) => (
        <div className="array-row" key={item.id}>
          <label>
            {type === "ingredients" ? "Aliment" : "Exercice"}
            <select
              {...form.register(
                `${key}.${i}.${type === "ingredients" ? "foodId" : "exerciseId"}`,
              )}
              required
            >
              <option value="">Choisir</option>
              {choices.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.data.name}
                </option>
              ))}
            </select>
          </label>
          {type === "ingredients" ? (
            <>
              <label>
                Quantité
                <input
                  {...form.register(`${key}.${i}.quantity`)}
                  inputMode="decimal"
                  required
                />
              </label>
              <label>
                Unité
                <select {...form.register(`${key}.${i}.unit`)}>
                  {["g", "kg", "ml", "l", "pièce"].map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            ["reps", "weight", "rest"].map((k, j) => (
              <label key={k}>
                {["Répétitions", "Charge (kg)", "Repos (secondes)"][j]}
                <input
                  type="number"
                  step="any"
                  min={0}
                  {...form.register(`${key}.${i}.${k}`, {
                    valueAsNumber: true,
                  })}
                  required
                />
              </label>
            ))
          )}
          <button type="button" className="secondary" onClick={() => remove(i)}>
            Retirer
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          append(
            type === "ingredients"
              ? { foodId: "", quantity: "1", unit: "g" }
              : { exerciseId: "", reps: 1, weight: 0, rest: 0 },
          )
        }
      >
        Ajouter {type === "ingredients" ? "un ingrédient" : "une série"}
      </button>
    </fieldset>
  );
}
export function Editor({
  kind,
  workspace,
  existing,
  onClose,
}: {
  kind: Kind;
  workspace: Workspace;
  existing?: RecordData;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const imperial =
    workspace.personal.find((r) => r.kind === "profiles")?.data.units ===
    "imperial";
  const def = definitions[kind];
  const initial: any = {
    date: today(),
    start: today(),
    end: today(),
    members: [],
    ingredients: [],
    sets: [],
    guests: 0,
    unit: "g",
    duration: 0,
    prep: 0,
    cook: 0,
    ...existing?.data,
  };
  if (kind === "weights" && imperial && existing)
    initial.value = Number((initial.value * 2.2046226218).toFixed(2));
  for (const field of def.fields) {
    if (field.type === "money")
      initial[field.key] =
        existing?.data[field.key] === undefined ||
        existing?.data[field.key] === null
          ? ""
          : (existing.data[field.key] / 100).toFixed(2);
    if (field.type === "allergens")
      initial[field.key] = existing?.data[field.key]?.join(", ") || "";
  }
  const form = useForm<any>({ defaultValues: initial });
  async function submit(raw: any) {
    setError("");
    try {
      const data = { ...raw };
      for (const field of def.fields) {
        if (field.type === "money") {
          data[field.key] =
            raw[field.key] === "" || raw[field.key] === undefined
              ? null
              : parseMoney(String(raw[field.key]));
        }
        if (field.type === "allergens") {
          data.allergens = raw.allergens?.trim()
            ? raw.allergens
                .split(",")
                .map((a: string) => a.trim())
                .filter(Boolean)
            : null;
        }
        if (
          field.optional &&
          (data[field.key] === "" || Number.isNaN(data[field.key]))
        )
          delete data[field.key];
      }
      if (kind === "weights" && imperial)
        data.value = data.value / 2.2046226218;
      const parsed = schemas[kind].safeParse(data);
      if (!parsed.success) {
        setError(
          parsed.error.issues
            .map((i) => `${i.path.join(".")} : ${i.message}`)
            .join(" — "),
        );
        return;
      }
      await workspace.save(kind, parsed.data, existing);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section
      className="editor"
      aria-label={`${existing ? "Modifier" : "Ajouter"} ${def.singular}`}
    >
      <h3>
        {existing ? "Modifier" : "Ajouter"} {def.singular}
      </h3>
      <form onSubmit={form.handleSubmit(submit)}>
        {def.fields.map((field) => {
          const key = field.key;
          const label =
            kind === "weights" && field.key === "value" && imperial
              ? "Poids (lb)"
              : field.label;
          const common = {
            ...form.register(key, {
              setValueAs:
                field.type === "number"
                  ? (v: any) => (v === "" ? undefined : Number(v))
                  : undefined,
            }),
          };
          if (["ingredients", "sets"].includes(field.type || ""))
            return (
              <ArrayFields
                key={key}
                type={field.type!}
                form={form}
                records={workspace.records}
                members={workspace.members}
              />
            );
          if (field.type === "members")
            return (
              <fieldset key={key}>
                <legend>Convives du foyer (facultatif)</legend>
                {workspace.members.map((member) => (
                  <label className="check" key={member.id}>
                    <input
                      type="checkbox"
                      value={member.id}
                      {...form.register("members")}
                    />
                    {member.name}
                  </label>
                ))}
              </fieldset>
            );
          if (field.type === "nutrition")
            return (
              <fieldset key={key}>
                <legend>
                  Valeurs nutritionnelles facultatives pour 100 g/ml
                </legend>
                {["energy", "protein", "carbs", "fat"].map((n, i) => (
                  <label key={n}>
                    {
                      [
                        "Énergie (kcal)",
                        "Protéines (g)",
                        "Glucides (g)",
                        "Lipides (g)",
                      ][i]
                    }
                    <input
                      type="number"
                      min={0}
                      step="any"
                      {...form.register("nutrition." + n, {
                        setValueAs: (v) => (v === "" ? undefined : Number(v)),
                      })}
                    />
                  </label>
                ))}
              </fieldset>
            );
          if (field.type === "checkbox")
            return (
              <label className="check" key={key}>
                <input type="checkbox" {...common} />
                {label}
              </label>
            );
          return (
            <label key={key}>
              {label}
              {field.ref ? (
                <select {...common} required={!field.optional}>
                  <option value="">Choisir</option>
                  {workspace.records
                    .filter((r) => r.kind === field.ref)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.data.name || r.data.date}
                      </option>
                    ))}
                </select>
              ) : field.options ? (
                <select {...common}>
                  {field.options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea {...common} rows={4} required={!field.optional} />
              ) : field.type === "money" ? (
                <input
                  {...form.register(key)}
                  defaultValue={
                    existing?.data[key] === null
                      ? ""
                      : existing?.data[key] !== undefined
                        ? (existing.data[key] / 100).toFixed(2)
                        : ""
                  }
                  inputMode="decimal"
                  required={!field.optional}
                />
              ) : field.type === "allergens" ? (
                <input
                  {...form.register(key)}
                  defaultValue={existing?.data[key]?.join(", ") || ""}
                />
              ) : (
                <input
                  {...common}
                  type={
                    ["quantity", "number"].includes(field.type || "")
                      ? "number"
                      : field.type || "text"
                  }
                  step="any"
                  min={
                    ["quantity", "number"].includes(field.type || "")
                      ? 0
                      : undefined
                  }
                  required={!field.optional}
                />
              )}
            </label>
          );
        })}
        {error && (
          <p role="alert" className="message">
            {error}
          </p>
        )}
        <div className="actions">
          <button disabled={form.formState.isSubmitting}>Enregistrer</button>
          <button className="secondary" type="button" onClick={onClose}>
            Annuler
          </button>
        </div>
      </form>
    </section>
  );
}
export function Collection({
  kind,
  workspace,
  title,
}: {
  kind: Kind;
  workspace: Workspace;
  title?: string;
}) {
  const [editing, setEditing] = useState<RecordData | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const rows = workspace.records.filter(
    (r) =>
      r.kind === kind &&
      JSON.stringify(r.data).toLowerCase().includes(search.toLowerCase()),
  );
  const def = definitions[kind];
  const action = async (fn: () => Promise<unknown>) => {
    try {
      setError("");
      await fn();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <section>
      <div className="section-head">
        <h2>{title || def.title}</h2>
        <button onClick={() => setEditing("new")}>
          Ajouter {def.singular}
        </button>
      </div>
      <label className="search">
        Rechercher
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="message">
          {error}
        </p>
      )}
      {editing && (
        <Editor
          key={editing === "new" ? "new" : editing.id}
          kind={kind}
          workspace={workspace}
          existing={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {!rows.length && (
        <p className="empty">
          Aucun élément pour le moment. Ajoutez {def.singular} pour commencer.
        </p>
      )}
      <div className="cards">
        {rows.map((row) => (
          <article className="card" key={row.id}>
            <h3>
              {row.data.name ||
                row.data.date ||
                workspace.records.find(
                  (r) => r.id === (row.data.foodId || row.data.productId),
                )?.data.name ||
                def.singular}
            </h3>
            {kind === "recipes" && row.data.photo && (
              <img
                className="recipe-photo"
                src={row.data.photo}
                alt={row.data.name}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            )}
            {row.data.status && (
              <span className={styles.badge}>{row.data.status}</span>
            )}
            {row.data.date && (
              <p>
                {new Date(row.data.date + "T12:00:00").toLocaleDateString(
                  "fr-FR",
                )}
              </p>
            )}
            {Object.entries(row.data)
              .filter(
                ([k, v]) =>
                  ![
                    "name",
                    "date",
                    "ingredients",
                    "sets",
                    "nutrition",
                    "members",
                    "description",
                    "steps",
                    "photo",
                  ].includes(k) &&
                  !k.endsWith("Id") &&
                  v !== "" &&
                  v !== undefined,
              )
              .map(([key, value]) => (
                <p className="detail" key={key}>
                  <span>
                    {def.fields.find((f) => f.key === key)?.label || key}
                  </span>{" "}
                  {key === "cents"
                    ? value === null
                      ? "Prix inconnu"
                      : euro(value as number, workspace.currency)
                    : typeof value === "boolean"
                      ? value
                        ? "Oui"
                        : "Non"
                      : Array.isArray(value)
                        ? value.join(", ")
                        : value === null
                          ? "Information inconnue"
                          : String(value)}
                </p>
              ))}
            {kind === "recipes" && (
              <>
                <p>{row.data.description}</p>
                <ul>
                  {row.data.ingredients.map((i: any, j: number) => (
                    <li key={j}>
                      {i.quantity} {i.unit} —{" "}
                      {workspace.records.find((r) => r.id === i.foodId)?.data
                        .name || "Aliment indisponible"}
                    </li>
                  ))}
                </ul>
                <p className="preserve">{row.data.steps}</p>
                <p className="hint">
                  Allergènes : vérifiez chaque ingrédient ; une information
                  inconnue ne garantit aucune compatibilité.
                </p>
              </>
            )}
            {kind === "workouts" && row.data.sets.length > 0 && (
              <ul>
                {row.data.sets.map((s: any, i: number) => (
                  <li key={i}>
                    {
                      workspace.records.find((r) => r.id === s.exerciseId)?.data
                        .name
                    }{" "}
                    : {s.reps} répétitions à {s.weight} kg
                  </li>
                ))}
              </ul>
            )}
            <div className="actions">
              <button className="secondary" onClick={() => setEditing(row)}>
                Modifier
              </button>
              {["recipes", "workouts"].includes(kind) && (
                <button
                  className="secondary"
                  onClick={() =>
                    action(() =>
                      workspace.save(kind, {
                        ...row.data,
                        name: row.data.name + " (copie)",
                      }),
                    )
                  }
                >
                  Dupliquer
                </button>
              )}
              {kind === "workouts" && (
                <>
                  <button
                    className="secondary"
                    onClick={() =>
                      action(() =>
                        workspace.save(
                          kind,
                          { ...row.data, status: "effectuée" },
                          row,
                        ),
                      )
                    }
                  >
                    Effectuée
                  </button>
                  {row.data.recurrence === "hebdomadaire" && (
                    <button
                      className="secondary"
                      onClick={() =>
                        action(() => {
                          const d = new Date(row.data.date + "T12:00:00Z");
                          d.setUTCDate(d.getUTCDate() + 7);
                          return workspace.save(kind, {
                            ...row.data,
                            date: d.toISOString().slice(0, 10),
                            status: "prévue",
                          });
                        })
                      }
                    >
                      Créer la semaine suivante
                    </button>
                  )}
                </>
              )}
              {kind === "recipes" && (
                <button
                  className="secondary"
                  onClick={() =>
                    action(() =>
                      workspace.save(
                        kind,
                        { ...row.data, favorite: !row.data.favorite },
                        row,
                      ),
                    )
                  }
                >
                  {row.data.favorite ? "Retirer des favoris" : "Favori"}
                </button>
              )}
              {kind === "shoppingItems" && (
                <button
                  onClick={() =>
                    action(() =>
                      workspace.save(
                        kind,
                        { ...row.data, checked: !row.data.checked },
                        row,
                      ),
                    )
                  }
                >
                  {row.data.checked ? "Décocher" : "Cocher"}
                </button>
              )}
              <button
                className="danger"
                onClick={async () => {
                  if (await confirmAction("Supprimer cet élément ?"))
                    action(() => workspace.remove(row));
                }}
              >
                Supprimer
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
