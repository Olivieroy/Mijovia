import React, { useEffect, useState, useRef } from "react";

import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";
import "./style.css";
declare global {
  interface Window {
    google: any;
  }
}
import { authApi as api } from "./api";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
export default function Auth() {
  const client = useQueryClient();
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [config, setConfig] = useState<any>();
  const [user, setUser] = useState<any>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [register, setRegister] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleButton = useRef<HTMLDivElement>(null);
  async function refresh() {
    const c = await api("/config");

    setConfig(c);
    setUser(await api("/me"));
    await client.invalidateQueries({ queryKey: ["user"] });
  }
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setMessage("");
    try {
      const result: any = await action();
      await refresh();
      setMessage(result?.message || "Opération effectuée.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Opération impossible");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    refresh().catch((e) => setMessage(e.message));
  }, []);
  useEffect(() => {
    if (!config?.google) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => setGoogleReady(true);
    script.onerror = () =>
      setMessage(
        "Google est temporairement indisponible. Utilisez une autre méthode.",
      );
    document.head.append(script);
    return () => {
      script.remove();
    };
  }, [config?.google?.clientId]);
  async function prepareGoogle() {
    const mode = user ? "link" : "login";
    const { nonce } = await api("/google/options", { mode });
    window.google.accounts.id.initialize({
      client_id: config.google.clientId,
      nonce,
      auto_select: false,
      callback: ({ credential }: { credential: string }) =>
        run(() =>
          api("/google", {
            credential,
            mode,
            legalAccepted,
            invitation:
              new URLSearchParams(location.search).get("signup") || undefined,
          }),
        ),
    });
    window.google.accounts.id.renderButton(googleButton.current, {
      theme: "outline",
      size: "large",
      text: user ? "continue_with" : "signin_with",
    });
  }
  async function passkeyLogin() {
    const optionsJSON = await api("/passkeys/options", {});
    const response = await startAuthentication({ optionsJSON });
    await api("/passkeys/authenticate", response);
  }
  return (
    <main>
      <p className="brand">Mijovia</p>
      <Link to="/dashboard">Aller à mon espace</Link>
      {new URLSearchParams(location.search).get("verify") && (
        <button
          onClick={() =>
            run(() =>
              api("/verify", {
                token: new URLSearchParams(location.search).get("verify"),
              }),
            )
          }
        >
          Confirmer mon adresse e-mail
        </button>
      )}
      {new URLSearchParams(location.search).get("reset") && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            run(() =>
              api("/reset", {
                token: new URLSearchParams(location.search).get("reset"),
                password: d.get("password"),
                confirmation: d.get("confirmation"),
              }),
            );
          }}
        >
          <label>
            Nouveau mot de passe
            <input
              name="password"
              type="password"
              minLength={12}
              maxLength={128}
              required
              autoComplete="new-password"
            />
          </label>
          <label>
            Confirmation
            <input
              name="confirmation"
              type="password"
              required
              autoComplete="new-password"
            />
          </label>
          <button>Réinitialiser</button>
        </form>
      )}

      {!user && (
        <label className="check">
          <input
            type="checkbox"
            checked={legalAccepted}
            onChange={(e) => setLegalAccepted(e.target.checked)}
          />{" "}
          J’accepte les{" "}
          <Link to="/confidentialite">
            informations légales et la confidentialité
          </Link>{" "}
          pour créer un compte.
        </label>
      )}
      <h1>{user ? "Sécurité de votre compte" : "Bienvenue"}</h1>
      <p>Mangez mieux. Bougez à votre rythme. Maîtrisez votre budget.</p>
      {message && (
        <p role="alert" className="message">
          {message}
        </p>
      )}
      {!config && <p>Chargement de la connexion…</p>}
      {config && (
        <>
          <fieldset disabled={busy}>
            {user && (
              <>
                <p>
                  Connecté : {user.name} — {user.email}
                </p>
                <h2>Méthodes associées</h2>
                <ul>
                  {!!user.password && (
                    <li>
                      Mot de passe{" "}
                      <button
                        onClick={() =>
                          run(() =>
                            api(
                              "/methods/password/password",
                              undefined,
                              "DELETE",
                            ),
                          )
                        }
                      >
                        Retirer le mot de passe
                      </button>
                    </li>
                  )}
                  {user.identities.map((m: any) => (
                    <li key={m.id}>
                      {m.provider}{" "}
                      <button
                        onClick={() =>
                          run(() =>
                            api("/methods/google/" + m.id, undefined, "DELETE"),
                          )
                        }
                      >
                        Dissocier Google
                      </button>
                    </li>
                  ))}
                  {user.passkeys.map((m: any) => (
                    <li key={m.id}>
                      {m.name}{" "}
                      <button
                        onClick={() =>
                          run(() =>
                            api(
                              "/methods/passkey/" + encodeURIComponent(m.id),
                              undefined,
                              "DELETE",
                            ),
                          )
                        }
                      >
                        Supprimer cette clé
                      </button>
                    </li>
                  ))}
                </ul>
                <p>
                  Pour ajouter ou retirer une méthode, vérifiez votre identité
                  avec votre mot de passe ou une clé d’accès ci-dessous. Une
                  connexion récente de moins de cinq minutes convient également.
                </p>
              </>
            )}
            {(!user || !!user.password) && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const d = new FormData(e.currentTarget);
                  run(() =>
                    api(register && !user ? "/register" : "/password", {
                      email: d.get("email"),
                      password: d.get("password"),
                      name: d.get("name"),
                      confirmation: d.get("confirmation"),
                      legalAccepted,
                      website: d.get("website") || "",
                      invitation:
                        new URLSearchParams(location.search).get("signup") ||
                        undefined,
                    }),
                  );
                }}
              >
                <h2>
                  {user
                    ? "Vérifier mon identité"
                    : register
                      ? "Créer un compte"
                      : "Connexion par e-mail"}
                </h2>
                {register && !user && (
                  <label>
                    Prénom ou pseudonyme
                    <input
                      name="name"
                      required
                      maxLength={100}
                      autoComplete="nickname"
                    />
                  </label>
                )}
                <label>
                  Adresse e-mail
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="username"
                    defaultValue={user?.email}
                  />
                </label>
                <label>
                  Mot de passe
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={12}
                    maxLength={128}
                    autoComplete={
                      register ? "new-password" : "current-password"
                    }
                  />
                </label>
                {register && !user && (
                  <>
                    <label>
                      Confirmer le mot de passe
                      <input
                        name="confirmation"
                        type="password"
                        required
                        autoComplete="new-password"
                      />
                    </label>
                    <input
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                      className="honeypot"
                    />
                  </>
                )}
                <button type="submit">
                  {user
                    ? "Vérifier"
                    : register
                      ? "Créer mon compte"
                      : "Se connecter"}
                </button>
              </form>
            )}
            {user && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const d = new FormData(e.currentTarget);
                  run(() =>
                    api("/password/set", { password: d.get("newPassword") }),
                  );
                }}
              >
                <label>
                  {user.password
                    ? "Changer le mot de passe"
                    : "Ajouter un mot de passe de secours"}
                  <input
                    name="newPassword"
                    type="password"
                    minLength={12}
                    maxLength={128}
                    required
                    autoComplete="new-password"
                  />
                </label>
                <button>Enregistrer le mot de passe</button>
              </form>
            )}
            {!user && (
              <button
                className="secondary"
                onClick={() => setRegister(!register)}
              >
                {register
                  ? "J’ai déjà un compte"
                  : "Créer un compte par e-mail"}
              </button>
            )}
            {config.google && googleReady && (
              <section>
                <button onClick={() => run(prepareGoogle)}>
                  {user
                    ? "Associer Google / vérifier avec Google"
                    : "Continuer avec Google"}
                </button>
                <div ref={googleButton} />
              </section>
            )}
            {config.passkeys && browserSupportsWebAuthn() && (
              <section>
                <button onClick={() => run(passkeyLogin)}>
                  {user
                    ? "Vérifier avec une clé d’accès"
                    : "Se connecter avec une clé d’accès"}
                </button>
                {user && (
                  <button
                    onClick={() =>
                      run(async () => {
                        const optionsJSON = await api(
                          "/passkeys/register/options",
                          {},
                        );
                        const response = await startRegistration({
                          optionsJSON,
                        });
                        await api("/passkeys/register", {
                          response,
                          name: "Clé d’accès",
                        });
                      })
                    }
                  >
                    Ajouter une clé d’accès
                  </button>
                )}
              </section>
            )}
            {user && (
              <button
                className="secondary"
                onClick={() => run(() => api("/logout", {}))}
              >
                Se déconnecter
              </button>
            )}
          </fieldset>
          {!user && (
            <form
              className="panel"
              onSubmit={(e) => {
                e.preventDefault();
                const d = new FormData(e.currentTarget);
                run(() => api("/forgot", { email: d.get("email") }));
              }}
            >
              <h2>Mot de passe oublié</h2>
              <label>
                Votre adresse e-mail
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </label>
              <button disabled={busy}>
                Recevoir un lien de réinitialisation
              </button>
            </form>
          )}
          <p className="hint">
            Les clés d’accès utilisent la protection de votre appareil ou de
            votre gestionnaire : Face ID, Touch ID, code ou clé de sécurité.
          </p>
        </>
      )}
    </main>
  );
}
