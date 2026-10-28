import { PriceImport } from "./features/PriceImport";
import { RecipeTools } from "./features/RecipeTools";
import { confirmAction, promptAction } from "./confirm";
import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Link,
  Navigate,
  useLocation,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Kind, RecordData } from "@mijovia/shared";
import { api, currentUser } from "./api";
import Auth from "./Auth";
import { Collection, type Workspace } from "./features/Records";
import {
  Dashboard,
  Profile,
  Weight,
  Sport,
  Meals,
  Shopping,
  Budget,
  Statistics,
} from "./features/Pages";
import { Household, Admin } from "./features/Household";
const client = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 10000 },
  },
});
const navigation = [
  ["dashboard", "Vue d’ensemble", "⌂"],
  ["poids", "Poids et objectifs", "↗"],
  ["sport", "Activités", "◈"],
  ["repas", "Repas", "▦"],
  ["recettes", "Recettes", "♧"],
  ["aliments", "Aliments", "◌"],
  ["courses", "Courses", "✓"],
  ["magasins", "Magasins et prix", "⌑"],
  ["budget", "Budget", "€"],
  ["statistiques", "Statistiques", "▥"],
  ["foyer", "Foyer", "⌂"],
  ["profil", "Profil", "○"],
  ["securite", "Sécurité", "◇"],
];
function Legal() {
  return (
    <article className="panel legal">
      <h1>Confidentialité et informations légales</h1>
      <p className="message">
        Version de travail 1 : l’identité et les coordonnées de l’éditeur,
        l’hébergeur, la base juridique et les durées de conservation doivent
        être complétés et validés avant ouverture publique.
      </p>
      <h2>À quoi servent vos données ?</h2>
      <p>
        Mijovia conserve les informations nécessaires à votre compte et les
        données que vous choisissez de saisir pour organiser vos repas, vos
        activités et votre budget. Le poids et les mensurations sont facultatifs
        et nécessitent un consentement explicite dans votre profil.
      </p>
      <h2>Partage et confidentialité</h2>
      <p>
        Les informations de santé et de sport restent personnelles. Les
        recettes, menus, courses et budgets enregistrés dans un foyer sont
        accessibles à ses membres. Choisissez le périmètre avant chaque saisie.
        Les services de connexion Google ou Apple, lorsqu’ils sont activés,
        appliquent aussi leurs propres règles de confidentialité.
      </p>
      <h2>Vos droits</h2>
      <p>
        Vous pouvez exporter vos données personnelles, supprimer vos éléments et
        demander la suppression de votre compte depuis le profil. Quittez ou
        transférez vos foyers avant suppression. Les données partagées restent
        au foyer. Les cookies de session sont nécessaires à la connexion ; aucun
        suivi publicitaire n’est installé.
      </p>
      <h2>Conservation et sécurité</h2>
      <p>
        Les sessions expirent après 30 jours, les liens de réinitialisation
        après une heure et les invitations après sept jours. Les autres données
        sont conservées jusqu’à leur suppression ou celle du compte. L’éditeur
        doit définir et appliquer la durée de conservation des sauvegardes et
        journaux avant ouverture publique.
      </p>
      <h2>Limites de l’application</h2>
      <p>
        Mijovia ne fournit aucun diagnostic médical. Une information
        nutritionnelle ou allergène inconnue n’est pas une garantie de
        compatibilité. Les prix renseignés peuvent être incomplets ou anciens.
      </p>
      <Link to="/">Retour à l’accueil</Link>
    </article>
  );
}
function Public() {
  return (
    <div className="public">
      <header>
        <Link className="brand" to="/">
          mijovia<span>•</span>
        </Link>
        <Link className="button secondary" to="/connexion">
          Se connecter
        </Link>
      </header>
      <main className="landing">
        <p className="eyebrow">Votre équilibre, simplement.</p>
        <h1>
          Mangez mieux.
          <br />
          Bougez à votre rythme.
          <br />
          <em>Gardez le cap.</em>
        </h1>
        <p>
          Vos repas, vos activités et votre budget réunis dans un espace
          personnel. À votre mesure, seul ou avec votre foyer.
        </p>
        <Link className="button" to="/connexion">
          Créer mon espace
        </Link>
        <div className="tiles">
          <article className="tile">
            <span>01 / Organiser</span>
            <h2>Des semaines plus légères.</h2>
            <p>
              Planifiez vos repas, adaptez les portions et préparez vos courses.
            </p>
          </article>
          <article className="tile">
            <span>02 / Avancer</span>
            <h2>Votre rythme compte.</h2>
            <p>
              Suivez vos objectifs, vos mesures et les activités que vous aimez.
            </p>
          </article>
          <article className="tile">
            <span>03 / Partager</span>
            <h2>Le quotidien, ensemble.</h2>
            <p>
              Un panier et des repas communs, des données personnelles qui
              restent privées.
            </p>
          </article>
        </div>
        <p>
          Gratuit, sans programme imposé. Les intégrations de connexion sont
          facultatives.
        </p>
        <Link to="/confidentialite">
          Confidentialité et informations légales
        </Link>
      </main>
    </div>
  );
}
function ScrollFocus() {
  const location = useLocation();
  useEffect(() => {
    document.getElementById("page-title-focus")?.focus();
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return null;
}
function OfflineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online ? null : (
    <div className="offline" role="status">
      Hors connexion : les modifications nécessitent une connexion au serveur.{" "}
      <a href="/offline.html">Informations hors ligne</a>
    </div>
  );
}
function Shell() {
  const location = useLocation();
  const userQuery = useQuery({ queryKey: ["user"], queryFn: currentUser });
  const cache = useQueryClient();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const user = userQuery.data;
  useEffect(() => setError(""), [location.pathname]);
  const personal = useQuery({
    queryKey: ["data", "personal", user?.id],
    queryFn: () => api("/data"),
    enabled: !!user,
    refetchInterval: 30000,
  });
  const houses = useQuery({
    queryKey: ["households", user?.id],
    queryFn: () => api("/households"),
    enabled: !!user,
  });
  const shared = useQuery({
    queryKey: ["data", householdId, user?.id],
    queryFn: () => api("/data?householdId=" + householdId),
    enabled: !!user && !!householdId,
    refetchInterval: 15000,
  });
  useEffect(() => {
    if (
      householdId &&
      houses.data &&
      !houses.data.some((h: any) => h.id === householdId)
    )
      setHouseholdId(null);
  }, [houses.data, householdId]);
  useEffect(() => {
    if ((shared.error as any)?.status === 403)
      cache.invalidateQueries({ queryKey: ["households"] });
  }, [shared.error]);
  const profile = personal.data?.find(
    (r: RecordData) => r.kind === "profiles",
  )?.data;
  useEffect(() => {
    document.documentElement.dataset.theme = profile?.theme || "system";
  }, [profile?.theme]);
  async function refresh() {
    await cache.invalidateQueries({ queryKey: ["data"] });
    await cache.invalidateQueries({ queryKey: ["statistics"] });
  }
  const scope = householdId ? "?householdId=" + householdId : "";
  const w: Workspace = {
    userId: user?.id,
    records:
      (householdId ? (shared.error ? [] : shared.data) : personal.data) || [],
    personal: personal.data || [],
    householdId,
    members: houses.data?.find((h: any) => h.id === householdId)?.members || [],
    currency: householdId
      ? houses.data?.find((h: any) => h.id === householdId)?.currency || "EUR"
      : profile?.currency || "EUR",
    save: async (kind, data, existing) => {
      await api(
        "/data/" +
          kind +
          (existing ? "/" + existing.id : "") +
          (kind === "profiles" ||
          [
            "goals",
            "weights",
            "measurements",
            "workouts",
            "sports",
            "exercises",
            "preferences",
            "notifications",
          ].includes(kind)
            ? ""
            : scope),
        { data, revision: existing?.revision },
        existing ? "PUT" : "POST",
      );
      await refresh();
      if (kind === "profiles")
        await cache.invalidateQueries({ queryKey: ["user"] });
    },
    remove: async (r) => {
      await api(
        "/data/" +
          r.kind +
          "/" +
          r.id +
          (r.householdId ? "?householdId=" + r.householdId : ""),
        { revision: r.revision },
        "DELETE",
      );
      await refresh();
    },
    act: async (path, body, method) => {
      const result = await api(path + scope, body, method);
      await refresh();
      return result;
    },
  };
  const privateW = {
    ...w,
    records: w.personal,
    householdId: null,
    act: async (path: string, body?: unknown, method?: string) => {
      const result = await api(path, body, method);
      await refresh();
      return result;
    },
  };
  const catalogue = (
    <section className="panel">
      <h2>Recettes et aliments de départ</h2>
      <p>
        Importez explicitement le catalogue commun dans le périmètre
        sélectionné. Vos données existantes restent conservées.
      </p>
      <button
        onClick={async () => {
          try {
            if (
              await confirmAction("Importer une copie du catalogue commun ?")
            ) {
              await w.act("/catalogue/import", {});
              setError(
                "Catalogue importé. Vous pouvez adapter chaque recette.",
              );
            }
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        Importer le catalogue commun
      </button>
    </section>
  );
  if (userQuery.isPending)
    return (
      <main>
        <p>Chargement de Mijovia…</p>
      </main>
    );
  return (
    <Routes>
      <Route path="/" element={<Public />} />
      <Route path="/confidentialite" element={<Legal />} />
      <Route path="/connexion" element={<Auth />} />
      <Route
        path="/*"
        element={
          !user ? (
            <main>
              <p>
                {userQuery.error?.message ||
                  "Connectez-vous pour retrouver votre espace."}
              </p>
              <Link to="/connexion">Se connecter</Link>
            </main>
          ) : (
            <div className="app-layout">
              <a href="#page-title-focus" className="skip">
                Aller au contenu
              </a>
              <aside>
                <Link to="/dashboard" className="brand">
                  mijovia<span>•</span>
                </Link>
                <p className="sidebar-caption">
                  Votre quotidien, à votre rythme
                </p>
                <nav aria-label="Navigation principale">
                  {navigation
                    .filter(
                      ([path]) =>
                        ![
                          "poids",
                          "sport",
                          "repas",
                          "courses",
                          "budget",
                          "statistiques",
                        ].includes(path) ||
                        !profile ||
                        profile.modules.includes(path),
                    )
                    .map(([path, label, icon]) => (
                      <NavLink key={path} to={"/" + path}>
                        <span aria-hidden="true">{icon}</span>
                        {label}
                      </NavLink>
                    ))}
                  {user.role === "admin" && (
                    <NavLink to="/administration">Administration</NavLink>
                  )}
                </nav>
                <button
                  className="secondary"
                  onClick={async () => {
                    await api("/auth/logout", {});
                    cache.clear();
                    await userQuery.refetch();
                  }}
                >
                  Se déconnecter
                </button>
                <Link to="/confidentialite">Confidentialité</Link>
              </aside>
              <div className="app-content">
                <header className="app-header">
                  <span>
                    Mon espace / <strong>{user.name}</strong>
                  </span>
                  <label className="scope">
                    Périmètre de partage
                    <select
                      value={householdId || ""}
                      onChange={(e) => setHouseholdId(e.target.value || null)}
                    >
                      <option value="">Personnel</option>
                      {houses.data?.map((h: any) => (
                        <option key={h.id} value={h.id}>
                          {h.name} · partagé
                        </option>
                      ))}
                    </select>
                  </label>
                </header>
                <main
                  key={householdId || "personal"}
                  id="page-title-focus"
                  tabIndex={-1}
                >
                  <ScrollFocus />
                  {householdId && (
                    <p className="scope-notice">
                      Vous travaillez dans le foyer «{" "}
                      {
                        houses.data?.find((h: any) => h.id === householdId)
                          ?.name
                      }{" "}
                      ». Le poids, le sport et le profil restent personnels.
                    </p>
                  )}
                  {(error || personal.error || shared.error) && (
                    <p role="status" className="message">
                      {error ||
                        personal.error?.message ||
                        shared.error?.message}
                    </p>
                  )}
                  {personal.isPending || (householdId && shared.isPending) ? (
                    <p>Chargement de vos données…</p>
                  ) : (
                    <Routes>
                      <Route path="dashboard" element={<Dashboard w={w} />} />
                      <Route
                        path="profil"
                        element={
                          <Profile
                            key={
                              personal.data?.find(
                                (r: RecordData) => r.kind === "profiles",
                              )?.revision || "new"
                            }
                            w={w}
                            user={user}
                            refresh={() => userQuery.refetch()}
                          />
                        }
                      />
                      <Route path="poids" element={<Weight w={privateW} />} />
                      <Route path="sport" element={<Sport w={privateW} />} />
                      <Route path="repas" element={<Meals w={w} />} />
                      <Route
                        path="recettes"
                        element={
                          <>
                            {catalogue}
                            <RecipeTools w={w} />
                            <Collection kind="recipes" workspace={w} />
                          </>
                        }
                      />
                      <Route
                        path="aliments"
                        element={
                          <>
                            {catalogue}
                            <Collection kind="foods" workspace={w} />
                            <Collection
                              kind="preferences"
                              workspace={privateW}
                            />
                          </>
                        }
                      />
                      <Route path="courses" element={<Shopping w={w} />} />
                      <Route
                        path="magasins"
                        element={
                          <>
                            <h1>Magasins et prix</h1>
                            <p>
                              Renseignez vos magasins et tarifs. Aucune
                              récupération automatique des prix n’est activée.
                            </p>
                            <Collection kind="stores" workspace={w} />
                            <Collection kind="products" workspace={w} />
                            <PriceImport w={w} />
                            <Collection kind="prices" workspace={w} />
                          </>
                        }
                      />
                      <Route path="budget" element={<Budget w={w} />} />
                      <Route
                        path="statistiques"
                        element={<Statistics w={w} />}
                      />
                      <Route path="foyer" element={<Household user={user} />} />
                      <Route path="securite" element={<Auth />} />
                      <Route
                        path="administration"
                        element={<Admin user={user} />}
                      />
                      <Route
                        path="*"
                        element={<Navigate to="/dashboard" replace />}
                      />
                    </Routes>
                  )}
                </main>
                <footer>Mijovia · Votre équilibre au quotidien</footer>
              </div>
              <nav className="mobile-nav" aria-label="Raccourcis mobiles">
                {[
                  ["dashboard", "Accueil"],
                  ["repas", "Repas"],
                  ["courses", "Courses"],
                  ["sport", "Sport"],
                  ["profil", "Profil"],
                ].map(([p, l]) => (
                  <NavLink to={"/" + p} key={p}>
                    {l}
                  </NavLink>
                ))}
              </nav>
            </div>
          )
        }
      />
    </Routes>
  );
}
export default function App() {
  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <OfflineStatus />
        <Shell />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
