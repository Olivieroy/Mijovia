import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./style.css";
const update = registerSW({
  onNeedRefresh() {
    const banner = document.createElement("div");
    banner.className = "update-banner";
    banner.setAttribute("role", "status");
    banner.textContent = "Une nouvelle version de Mijovia est disponible. ";
    const button = document.createElement("button");
    button.textContent = "Mettre à jour";
    button.onclick = () => update(true);
    banner.append(button);
    document.body.append(banner);
  },
});
createRoot(document.getElementById("root")!).render(<App />);
