import { confirmAction, promptAction } from "../confirm";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
export function Household({ user }: { user: any }) {
  const q = useQuery({
    queryKey: ["households", user.id],
    queryFn: () => api("/households"),
  });
  const client = useQueryClient();
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const action = async (fn: () => Promise<any>) => {
    setBusy(true);
    try {
      const result = await fn();
      if (result.url) setLink(result.url);
      setMessage("Opération effectuée.");
      await client.invalidateQueries({ queryKey: ["households"] });
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <h1>Mon foyer</h1>
      <p>
        Partagez vos repas, vos courses et votre budget. Vos données de santé et
        de sport restent personnelles.
      </p>
      {message && (
        <p role="status" className="message">
          {message}
        </p>
      )}
      {link && (
        <label>
          Lien d’invitation (valable sept jours)
          <input readOnly value={link} onFocus={(e) => e.target.select()} />
        </label>
      )}
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          action(() =>
            api("/households", {
              name: d.get("name"),
              currency: d.get("currency"),
            }),
          );
        }}
      >
        <h2>Créer un foyer</h2>
        <label>
          Nom du foyer
          <input name="name" maxLength={200} required />
        </label>
        <label>
          Devise des données partagées
          <input
            name="currency"
            pattern="[A-Z]{3}"
            maxLength={3}
            defaultValue="EUR"
            required
          />
        </label>
        <button disabled={busy}>Créer le foyer</button>
      </form>
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          const text = String(d.get("token"));
          let token = text;
          try {
            token = new URL(text).searchParams.get("invitation") || text;
          } catch {}
          action(() => api("/households/join", { token }));
        }}
      >
        <h2>Rejoindre un foyer</h2>
        <label>
          Lien ou code d’invitation
          <input
            name="token"
            defaultValue={
              new URLSearchParams(location.search).get("invitation") || ""
            }
            required
          />
        </label>
        <button disabled={busy}>Accepter l’invitation</button>
      </form>
      {q.data?.map((house: any) => (
        <section className="panel" key={house.id}>
          <h2>{house.name}</h2>
          <ul>
            {house.members.map((m: any) => (
              <li key={m.id}>
                {m.name} {house.owner_id === m.id ? "(propriétaire)" : ""}
                {m.id !== house.owner_id &&
                  (house.owner_id === user.id || m.id === user.id) && (
                    <button
                      className="danger"
                      onClick={async () => {
                        if (
                          await confirmAction(
                            m.id === user.id
                              ? "Quitter ce foyer ?"
                              : "Retirer ce membre ?",
                          )
                        )
                          action(() =>
                            api(
                              `/households/${house.id}/members/${m.id}`,
                              {},
                              "DELETE",
                            ),
                          );
                      }}
                    >
                      {m.id === user.id ? "Quitter" : "Retirer"}
                    </button>
                  )}
                {house.owner_id === user.id && m.id !== user.id && (
                  <button
                    className="secondary"
                    onClick={async () => {
                      if (
                        await confirmAction(
                          "Transférer la propriété du foyer à " + m.name + " ?",
                        )
                      )
                        action(() =>
                          api(`/households/${house.id}/transfer`, {
                            userId: m.id,
                          }),
                        );
                    }}
                  >
                    Transférer la propriété
                  </button>
                )}
              </li>
            ))}
          </ul>
          {house.owner_id === user.id && (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const d = new FormData(e.currentTarget);
                  action(() =>
                    api(`/households/${house.id}/invitations`, {
                      email: d.get("email") || undefined,
                    }),
                  );
                }}
              >
                <label>
                  E-mail du destinataire (facultatif)
                  <input name="email" type="email" />
                </label>
                <p className="hint">
                  Une invitation liée à un e-mail exige que le destinataire ait
                  vérifié cette adresse.
                </p>
                <button disabled={busy}>Créer un lien d’invitation</button>
              </form>
              <h3>Invitations</h3>
              <ul>
                {house.invitations.map((i: any) => (
                  <li key={i.id}>
                    {i.email || "Lien sans destinataire"} —{" "}
                    {i.used_at
                      ? "utilisée"
                      : new Date(Number(i.expires_at)).toLocaleDateString(
                          "fr-FR",
                        )}
                    <button
                      className="secondary"
                      onClick={() =>
                        action(() =>
                          api(
                            `/households/${house.id}/invitations/${i.id}`,
                            {},
                            "DELETE",
                          ),
                        )
                      }
                    >
                      Révoquer
                    </button>
                  </li>
                ))}
              </ul>
              <button
                className="danger"
                onClick={async () => {
                  if (
                    (await promptAction(
                      "Le foyer et ses données partagées seront supprimés. Saisissez SUPPRIMER.",
                    )) === "SUPPRIMER"
                  )
                    action(() => api("/households/" + house.id, {}, "DELETE"));
                }}
              >
                Supprimer le foyer
              </button>
            </>
          )}
        </section>
      ))}
    </>
  );
}
export function Admin({ user }: { user: any }) {
  const client = useQueryClient();
  const [message, setMessage] = useState("");
  const q = useQuery({
    queryKey: ["admin", user.id],
    queryFn: () => api("/admin"),
    enabled: user.role === "admin",
  });
  async function action(path: string, body: any, method = "POST") {
    try {
      const result = await api(path, body, method);
      setMessage(result.url || "Modification enregistrée.");
      await client.invalidateQueries({ queryKey: ["admin"] });
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  if (user.role !== "admin")
    return (
      <p role="alert">
        Cette interface est réservée au propriétaire de l’application.
      </p>
    );
  if (!q.data) return <p>{q.error?.message || "Chargement…"}</p>;
  const data = q.data;
  const registration =
    typeof data.settings.find((s: any) => s.id === "registration").data ===
    "string"
      ? JSON.parse(data.settings.find((s: any) => s.id === "registration").data)
      : data.settings.find((s: any) => s.id === "registration").data;
  return (
    <>
      <h1>Administration</h1>
      <p>Aucune donnée privée de santé n’est présentée ici.</p>
      {message && (
        <p role="status" className="message preserve">
          {message}
        </p>
      )}
      <section className="panel">
        <h2>État de l’application</h2>
        <p>
          {data.users.length} comptes · Base :{" "}
          {data.health.database ? "accessible" : "indisponible"} · SMTP :{" "}
          {data.health.mail ? "configuré" : "absent"}
        </p>
        <label className="check">
          <input
            type="checkbox"
            checked={registration.enabled}
            onChange={(e) =>
              action(
                "/admin/registration",
                { ...registration, enabled: e.target.checked },
                "PUT",
              )
            }
          />
          Inscriptions ouvertes
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={registration.invitationOnly}
            onChange={(e) =>
              action(
                "/admin/registration",
                { ...registration, invitationOnly: e.target.checked },
                "PUT",
              )
            }
          />
          Uniquement sur invitation
        </label>
        <button onClick={() => action("/admin/invitations", {})}>
          Créer une invitation d’inscription
        </button>
      </section>
      <section className="panel">
        <h2>Catalogue commun</h2>
        <p>
          Gérez vos aliments, recettes, magasins, produits et prix personnels,
          puis publiez leur copie ici. Les utilisateurs pourront l’importer
          explicitement dans leur espace.
        </p>
        <button
          onClick={async () => {
            if (
              await confirmAction(
                "Remplacer le catalogue commun par vos éléments personnels ?",
              )
            )
              action("/admin/catalogue/publish", {});
          }}
        >
          Publier mon catalogue personnel
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            action(
              "/admin/sources",
              {
                sources: [
                  {
                    name: d.get("name"),
                    url: d.get("url") || undefined,
                    note: d.get("note"),
                  },
                ],
              },
              "PUT",
            );
          }}
        >
          <h3>Source tarifaire autorisée</h3>
          <label>
            Nom
            <input name="name" required />
          </label>
          <label>
            Adresse officielle (facultative)
            <input name="url" type="url" />
          </label>
          <label>
            Conditions d’utilisation / notes
            <textarea name="note" />
          </label>
          <button>Enregistrer la source de référence</button>
        </form>
      </section>
      <section className="panel">
        <h2>Utilisateurs</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Rôle</th>
                <th>Accès</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u: any) => (
                <tr key={u.id}>
                  <td>
                    {u.name}
                    <br />
                    {u.email}
                  </td>
                  <td>{u.role}</td>
                  <td>
                    {u.id !== user.id && (
                      <button
                        className="secondary"
                        onClick={() =>
                          action(
                            "/admin/users/" + u.id,
                            { suspended: !u.suspended },
                            "PUT",
                          )
                        }
                      >
                        {u.suspended ? "Réactiver" : "Suspendre"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <h2>Journal technique</h2>
        <ul>
          {data.logs.map((l: any, i: number) => (
            <li key={i}>
              {new Date(l.created_at).toLocaleString("fr-FR")} — {l.event}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
