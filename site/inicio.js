import { redirectToJourney } from "./account.js";

try {
    await redirectToJourney();
} catch (error) {
    console.error("Não foi possível abrir sua jornada.", error);
    document.querySelector("main").textContent =
        "Não foi possível abrir sua jornada. Atualize a página ou entre novamente.";
}
