import { getCurrentProfile, signOut } from "./account.js";

const accountNavigation = document.querySelector(".nav-links");
const accountActionsNavigation = document.querySelector("#account-navigation");
const accountActions = document.querySelector("#account-actions");
const accountActionsToggle = document.querySelector("#account-navigation-toggle");
const sessionStatus = document.querySelector("#session-status");

if (accountNavigation) {
    getCurrentProfile()
        .then((account) => {
            if (!account) return;

            const { profile } = account;
            const loginLink = accountNavigation.querySelector('a[href="login.html"]');
            const registerLink = accountNavigation.querySelector('a[href="cadastro.html"]');
            const studyLink = accountNavigation.querySelector(".study-link");
            const greeting = document.querySelector("#nav-greeting");
            const logoutButton = document.querySelector("#logout-button");

            loginLink?.remove();
            registerLink?.remove();
            accountNavigation.classList.add("session-active");
            accountActionsNavigation.hidden = false;

            if (studyLink) {
                const label = profile.grade_band ? "Minhas matérias" : "Escolher meu plano";
                studyLink.textContent = profile.grade_band ? "📚" : "🧭";
                studyLink.setAttribute("aria-label", label);
                studyLink.dataset.tooltip = label;
                studyLink.href = profile.grade_band ? "/materias.html" : "/plano.html";
            }

            for (const journeyLink of document.querySelectorAll('a[href="cadastro.html"]')) {
                journeyLink.href = "/inicio.html";
                journeyLink.innerHTML = 'Continuar minha jornada <span aria-hidden="true">→</span>';
            }

            greeting.textContent = `Olá, ${profile.display_name}`;
            greeting.hidden = false;
            logoutButton.addEventListener("click", async () => {
                logoutButton.disabled = true;
                try {
                    await signOut();
                } catch (error) {
                    console.error("Não foi possível encerrar a sessão.", error);
                    sessionStatus.textContent = "Não foi possível sair. Tente novamente.";
                    logoutButton.disabled = false;
                }
            });

            accountActionsToggle.addEventListener("click", () => {
                const isExpanded = accountActionsToggle.getAttribute("aria-expanded") === "true";
                accountActionsToggle.setAttribute("aria-expanded", String(!isExpanded));
                accountActionsToggle.setAttribute(
                    "aria-label",
                    isExpanded ? "Expandir atalhos" : "Recolher atalhos");
                accountActionsToggle.textContent = isExpanded ? ">" : "<";
                accountActions.hidden = isExpanded;
            });
        })
        .catch((error) => {
            console.error("Não foi possível carregar a sessão atual.", error);
            if (sessionStatus) {
                sessionStatus.textContent = "Não foi possível verificar sua sessão. Atualize a página.";
            }
        });
}
