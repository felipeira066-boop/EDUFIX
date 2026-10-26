const shopGrid = document.querySelector("#shop-grid");

if (shopGrid) {
    const balance = document.querySelector("#coin-balance");
    const message = document.querySelector("#shop-message");
    const inventoryList = document.querySelector("#inventory-list");
    const userLabel = document.querySelector("#shop-user");
    const logoutButton = document.querySelector("#logout-button");
    let shopState;

    const showMessage = (text, success = false) => {
        message.textContent = text;
        message.dataset.success = String(success);
        message.hidden = false;
    };

    const renderInventory = () => {
        const entries = shopState.inventory
            .map((item) => {
                const product = shopState.products.find((candidate) => candidate.id === item.productId);
                return product ? { ...product, quantity: item.quantity } : null;
            })
            .filter(Boolean);

        if (entries.length === 0) {
            const empty = document.createElement("p");
            empty.className = "inventory-empty";
            empty.textContent = "Seu inventário está vazio. Escolha um item para começar.";
            inventoryList.replaceChildren(empty);
            return;
        }

        inventoryList.replaceChildren(...entries.map((item) => {
            const row = document.createElement("div");
            row.className = "inventory-row";
            const icon = document.createElement("span");
            icon.setAttribute("aria-hidden", "true");
            icon.textContent = item.icon;
            const name = document.createElement("strong");
            name.textContent = item.name;
            const quantity = document.createElement("span");
            quantity.className = "inventory-quantity";
            quantity.textContent = `x${item.quantity}`;
            row.append(icon, name, quantity);
            return row;
        }));
    };

    const renderShop = () => {
        balance.textContent = shopState.coins.toLocaleString("pt-BR");
        shopGrid.replaceChildren(...shopState.products.map((product) => {
            const card = document.createElement("article");
            card.className = "shop-card";

            const icon = document.createElement("span");
            icon.className = "shop-item-icon";
            icon.setAttribute("aria-hidden", "true");
            icon.textContent = product.icon;

            const category = document.createElement("p");
            category.className = "shop-category";
            category.textContent = product.category;

            const title = document.createElement("h3");
            title.textContent = product.name;

            const description = document.createElement("p");
            description.className = "shop-description";
            description.textContent = product.description;

            const button = document.createElement("button");
            button.className = "shop-buy";
            button.type = "button";
            button.disabled = shopState.coins < product.price;
            const label = document.createElement("span");
            label.textContent = "Resgatar";
            const price = document.createElement("span");
            price.textContent = `🪙 ${product.price}`;
            button.append(label, price);
            button.addEventListener("click", () => purchase(product.id, button));
            card.append(icon, category, title, description, button);
            return card;
        }));
        renderInventory();

        const adSlot = document.querySelector("[data-ad-slot]");
        adSlot.hidden = shopState.hasStudyPass;
    };

    const purchase = async (productId, button) => {
        message.hidden = true;
        button.disabled = true;

        try {
            const response = await fetch("/api/shop/purchase", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId })
            });
            const result = await response.json().catch(() => null);
            if (response.status === 401) {
                window.location.assign("/login.html");
                return;
            }
            if (!response.ok) {
                showMessage(result?.message ?? result?.detail ?? "Não foi possível resgatar esse item.");
                return;
            }

            showMessage("Item adicionado ao inventário!", true);
            await loadShop();
        } catch (error) {
            console.error("Não foi possível concluir a compra do item.", error);
            showMessage("Não foi possível conectar ao servidor. Tente novamente.");
        } finally {
            button.disabled = false;
        }
    };

    const loadShop = async () => {
        try {
            const [sessionResponse, shopResponse] = await Promise.all([
                fetch("/api/auth/me", { credentials: "same-origin" }),
                fetch("/api/shop/", { credentials: "same-origin" })
            ]);
            if (sessionResponse.status === 401 || shopResponse.status === 401) {
                window.location.replace("/login.html");
                return;
            }
            if (!sessionResponse.ok || !shopResponse.ok) {
                throw new Error(`Não foi possível carregar a loja (HTTP ${shopResponse.status}).`);
            }

            const [user, state] = await Promise.all([
                sessionResponse.json(),
                shopResponse.json()
            ]);
            userLabel.textContent = `Olá, ${user.displayName}`;
            shopState = state;
            renderShop();
        } catch (error) {
            console.error("Não foi possível carregar a loja.", error);
            showMessage("Não foi possível carregar a loja. Confira sua conexão e atualize a página.");
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
            showMessage("Não foi possível sair. Tente novamente.");
            logoutButton.disabled = false;
        }
    });

    loadShop();
}
