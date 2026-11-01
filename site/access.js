import { getCurrentProfile } from "./account.js";
import { getCoursePlan } from "./course-catalog.js";

const page = window.location.pathname.toLowerCase();
const needsPlan = ["/materias.html", "/loja.html", "/jogo.html"].includes(page);

try {
    const account = await getCurrentProfile();
    if (!account) {
        window.location.replace("/login.html");
    } else if (needsPlan && !account.profile.grade_band) {
        window.location.replace("/plano.html");
    } else if (page === "/jogo.html") {
        const plan = getCoursePlan(account.profile.grade_band);
        const subjectId = new URLSearchParams(window.location.search).get("materia");
        if (!plan?.subjects.some((subject) => subject.id === subjectId)) {
            window.location.replace("/materias.html");
        }
    }
} catch (error) {
    console.error("Não foi possível verificar o acesso à página.", error);
    const main = document.querySelector("main");
    if (main) {
        const message = document.createElement("p");
        message.className = "study-message";
        message.setAttribute("role", "alert");
        message.textContent = "Não foi possível verificar seu acesso. Atualize a página e tente novamente.";
        main.replaceChildren(message);
    }
}
