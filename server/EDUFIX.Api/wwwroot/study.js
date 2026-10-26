const subjectsGrid = document.querySelector("#subjects-grid");

if (subjectsGrid) {
    const userLabel = document.querySelector("#study-user");
    const planLabel = document.querySelector("#plan-label");
    const subjectCount = document.querySelector("#subject-count");
    const statusMessage = document.querySelector("#subjects-message");
    const logoutButton = document.querySelector("#logout-button");

    const displayError = (message) => {
        statusMessage.textContent = message;
        statusMessage.hidden = false;
    };

    const createSubjectCard = (subject) => {
        const card = document.createElement("article");
        card.className = "subject-card";

        const top = document.createElement("div");
        top.className = "subject-card-top";

        const icon = document.createElement("span");
        icon.className = "subject-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = subject.icon;

        const title = document.createElement("h3");
        title.textContent = subject.name;
        top.append(icon, title);

        const description = document.createElement("p");
        description.className = "subject-description";
        description.textContent = subject.description;

        const topics = document.createElement("details");
        topics.className = "subject-topics";
        const summary = document.createElement("summary");
        summary.textContent = "Explorar conceitos";
        const list = document.createElement("ul");
        for (const topic of subject.topics) {
            const item = document.createElement("li");
            item.textContent = topic;
            list.append(item);
        }
        topics.append(summary, list);

        const status = document.createElement("p");
        status.className = "subject-status";
        status.textContent = "Trilhas e exercícios interativos em preparação";

        card.append(top, description, topics, status);
        return card;
    };

    const loadSubjects = async () => {
        try {
            const sessionResponse = await fetch("/api/auth/me", { credentials: "same-origin" });
            if (sessionResponse.status === 401) {
                window.location.replace("/login.html");
                return;
            }
            if (!sessionResponse.ok) {
                throw new Error(`Não foi possível carregar sua conta (HTTP ${sessionResponse.status}).`);
            }

            const user = await sessionResponse.json();
            userLabel.textContent = `Olá, ${user.displayName}`;
            document.querySelectorAll("[data-ad-slot]").forEach((slot) => {
                slot.hidden = user.hasStudyPass === true;
            });
            if (!user.gradeBand) {
                window.location.replace("/plano.html");
                return;
            }

            const coursesResponse = await fetch("/api/study/courses", { credentials: "same-origin" });
            if (coursesResponse.status === 401) {
                window.location.replace("/login.html");
                return;
            }
            if (coursesResponse.status === 409) {
                window.location.replace("/plano.html");
                return;
            }
            if (!coursesResponse.ok) {
                throw new Error(`Não foi possível carregar suas matérias (HTTP ${coursesResponse.status}).`);
            }

            const coursePlan = await coursesResponse.json();
            planLabel.textContent = `${coursePlan.name} · ${coursePlan.gradeRange} · Explore suas matérias e conceitos.`;
            subjectCount.textContent = `${coursePlan.subjects.length} matérias`;
            subjectsGrid.replaceChildren(...coursePlan.subjects.map(createSubjectCard));
        } catch (error) {
            console.error("Não foi possível carregar as matérias da conta.", error);
            displayError("Não foi possível carregar suas matérias. Atualize a página e tente novamente.");
        }
    };

    logoutButton.addEventListener("click", async () => {
        logoutButton.disabled = true;

        try {
            const response = await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "same-origin"
            });
            if (!response.ok) {
                throw new Error(`Não foi possível encerrar sua sessão (HTTP ${response.status}).`);
            }

            window.location.assign("/");
        } catch (error) {
            console.error("Não foi possível encerrar a sessão.", error);
            displayError("Não foi possível sair. Tente novamente.");
            logoutButton.disabled = false;
        }
    });

    loadSubjects();
}
