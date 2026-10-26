const planForm = document.querySelector("#plan-form");

if (planForm) {
    const message = document.querySelector("[data-study-message]");
    const submitButton = document.querySelector("[data-submit-button]");

    const showMessage = (text) => {
        message.textContent = text;
        message.hidden = false;
    };

    const loadCurrentPlan = async () => {
        try {
            const response = await fetch("/api/auth/me", { credentials: "same-origin" });
            if (response.status === 401) {
                window.location.replace("/login.html");
                return;
            }
            if (!response.ok) {
                throw new Error(`Não foi possível carregar sua conta (HTTP ${response.status}).`);
            }

            const user = await response.json();
            const selection = planForm.querySelector(`input[name="gradeBand"][value="${user.gradeBand}"]`);
            if (selection) {
                selection.checked = true;
                submitButton.textContent = "Atualizar meu plano";
            }
        } catch (error) {
            console.error("Não foi possível carregar seu plano atual.", error);
            showMessage("Não foi possível carregar sua conta. Atualize a página e tente novamente.");
        }
    };

    planForm.addEventListener("change", () => {
        message.hidden = true;
    });

    planForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        message.hidden = true;

        if (!planForm.reportValidity()) {
            return;
        }

        const gradeBand = new FormData(planForm).get("gradeBand");
        submitButton.disabled = true;
        submitButton.textContent = "Salvando seu plano...";

        try {
            const response = await fetch("/api/study/plan", {
                method: "PUT",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ gradeBand })
            });
            const body = await response.json();

            if (response.status === 401) {
                window.location.replace("/login.html");
                return;
            }
            if (!response.ok) {
                const details = Object.values(body.errors ?? {}).flat().join(" ");
                throw new Error(body.detail || details || body.title || "Não foi possível salvar seu plano.");
            }

            window.location.assign("/materias.html");
        } catch (error) {
            console.error("Não foi possível salvar o plano escolar.", error);
            showMessage(error.message || "Não foi possível salvar seu plano. Tente novamente.");
            submitButton.disabled = false;
            submitButton.textContent = "Tentar novamente";
        }
    });

    loadCurrentPlan();
}
