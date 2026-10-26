const accountNavigation = document.querySelector(".nav-links");
const sessionStatus = document.querySelector("#session-status");

if (accountNavigation && window.location.protocol !== "file:") {
    fetch("/api/auth/me", { credentials: "same-origin" })
        .then(async (response) => {
            if (response.status === 401) {
                return;
            }

            if (!response.ok) {
                throw new Error(`A verificação da sessão falhou (HTTP ${response.status}).`);
            }

            const user = await response.json();
            const loginLink = accountNavigation.querySelector('a[href="/login.html"]');
            const registerLink = accountNavigation.querySelector('a[href="/cadastro.html"]');
            const studyLink = accountNavigation.querySelector(".study-link");

            loginLink?.remove();
            registerLink?.remove();
            accountNavigation.classList.add("session-active");

            if (studyLink) {
                studyLink.textContent = user.gradeBand ? "Minhas matérias" : "Escolher meu plano";
            }

            for (const journeyLink of document.querySelectorAll('a[href="/cadastro.html"]')) {
                journeyLink.href = "/inicio";
                journeyLink.innerHTML = 'Continuar minha jornada <span aria-hidden="true">→</span>';
            }

            const greeting = document.createElement("span");
            greeting.className = "nav-greeting";
            greeting.textContent = `Olá, ${user.displayName}`;

            const logoutButton = document.createElement("button");
            logoutButton.className = "button button-small logout-button";
            logoutButton.type = "button";
            logoutButton.textContent = "Sair";
            logoutButton.addEventListener("click", async () => {
                logoutButton.disabled = true;

                try {
                    const logoutResponse = await fetch("/api/auth/logout", {
                        method: "POST",
                        credentials: "same-origin"
                    });

                    if (!logoutResponse.ok) {
                        throw new Error(`Não foi possível encerrar a sessão (HTTP ${logoutResponse.status}).`);
                    }

                    window.location.assign("/");
                } catch (error) {
                    console.error("Não foi possível encerrar a sessão.", error);
                    sessionStatus.textContent = "Não foi possível sair. Tente novamente.";
                    logoutButton.disabled = false;
                }
            });

            accountNavigation.insertBefore(greeting, sessionStatus);
            accountNavigation.insertBefore(logoutButton, sessionStatus);
        })
        .catch((error) => {
            console.error("Não foi possível carregar a sessão atual.", error);
        });
}