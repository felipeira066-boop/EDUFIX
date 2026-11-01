import { requireProfile, signOut } from "./account.js";
import { supabase } from "./supabase-client.js";

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
            const account = await requireProfile();
            if (!account) return;

            const selection = planForm.querySelector(
                `input[name="gradeBand"][value="${account.profile.grade_band}"]`);
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
            const account = await requireProfile();
            if (!account) return;

            const { error } = await supabase
                .from("profiles")
                .update({ grade_band: gradeBand })
                .eq("user_id", account.user.id);
            if (error) {
                throw error;
            }

            window.location.assign("/materias.html");
        } catch (error) {
            console.error("Não foi possível salvar o plano escolar.", error);
            showMessage("Não foi possível salvar seu plano. Confira sua conexão e tente novamente.");
            submitButton.disabled = false;
            submitButton.textContent = "Tentar novamente";
        }
    });

    loadCurrentPlan();

    document.querySelector("#logout-button")?.addEventListener("click", async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        try {
            await signOut();
        } catch (error) {
            console.error("Não foi possível encerrar a sessão.", error);
            showMessage("Não foi possível sair. Tente novamente.");
            button.disabled = false;
        }
    });
}
