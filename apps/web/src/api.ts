let csrf = "";
export async function api(
  path: string,
  body?: unknown,
  method = body ? "POST" : "GET",
) {
  if (method !== "GET" && !csrf) await api("/auth/config");
  const response = await fetch("/api/v1" + path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => {
    throw Error(
      "Connexion indisponible. Réessayez lorsque vous êtes en ligne.",
    );
  });
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw Error("L’API est indisponible. Vérifiez que le serveur a démarré.");
  const data = await response.json();
  if (!response.ok)
    throw Object.assign(Error(data.error || "Opération impossible"), {
      status: response.status,
    });
  if (path === "/auth/config") csrf = data.csrf;
  return data;
}
export const authApi = (path: string, body?: unknown, method?: string) =>
  api("/auth" + path, body, method);
export async function currentUser() {
  await api("/auth/config");
  return api("/auth/me");
}
