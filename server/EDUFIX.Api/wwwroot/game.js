const canvas = document.querySelector("#adventure-canvas");

if (canvas) {
    const context = canvas.getContext("2d");
    const title = document.querySelector("#game-title");
    const subtitle = document.querySelector("#game-subtitle");
    const gameStatus = document.querySelector("#game-status");
    const introCard = document.querySelector("#intro-card");
    const introTitle = document.querySelector("#intro-title");
    const introCopy = document.querySelector("#intro-copy");
    const openCageButton = document.querySelector("#open-cage-button");
    const toast = document.querySelector("#game-toast");
    const params = new URLSearchParams(window.location.search);
    const subjectId = params.get("materia");
    const keys = new Set();
    const worldWidth = 2500;
    const groundY = 420;
    const platforms = [
        { x: 510, y: 340, width: 150 },
        { x: 790, y: 285, width: 145 },
        { x: 1120, y: 345, width: 180 },
        { x: 1490, y: 290, width: 150 },
        { x: 1830, y: 340, width: 190 },
        { x: 2180, y: 285, width: 150 }
    ];
    const player = { x: 330, y: groundY - 54, width: 38, height: 54, velocityY: 0, grounded: true };
    const mascot = { x: 134, y: groundY - 88 };
    const cage = { x: 112, openAt: 0 };
    let active = false;
    let cutsceneStartedAt = 0;
    let cutsceneFinishing = false;
    let lastFrame = 0;
    let toastTimer = 0;
    let jumpReady = true;

    const subjectNames = new Map([
        ["matematica", "Matemática"],
        ["portugues", "Língua Portuguesa"],
        ["ciencias", "Ciências"],
        ["historia", "História"],
        ["geografia", "Geografia"],
        ["ingles", "Língua Inglesa"],
        ["linguagens", "Linguagens e Redação"],
        ["biologia", "Biologia"],
        ["fisica", "Física"],
        ["quimica", "Química"],
        ["filosofia", "Filosofia e Sociologia"]
    ]);

    const subjectName = subjectNames.get(subjectId);
    if (!subjectName) {
        window.location.replace("/materias.html");
    } else {
        title.textContent = subjectName;
        subtitle.textContent = `Explore o mundo de ${subjectName} ao lado do seu mascote.`;
        document.title = `${subjectName} — EDUFIX`;
    }

    const roundRect = (x, y, width, height, radius) => {
        context.beginPath();
        context.roundRect(x, y, width, height, radius);
    };

    const drawCloud = (x, y, scale = 1) => {
        context.fillStyle = "rgba(255, 255, 255, .78)";
        context.beginPath();
        context.ellipse(x, y, 34 * scale, 14 * scale, 0, 0, Math.PI * 2);
        context.ellipse(x - 20 * scale, y + 3 * scale, 20 * scale, 11 * scale, 0, 0, Math.PI * 2);
        context.ellipse(x + 19 * scale, y + 4 * scale, 23 * scale, 12 * scale, 0, 0, Math.PI * 2);
        context.fill();
    };

    const drawPlayer = (x, y, time) => {
        const bob = player.grounded && (keys.has("a") || keys.has("d")) ? Math.sin(time / 75) * 2 : 0;
        context.save();
        context.translate(x, y + bob);
        context.fillStyle = "#e66f4c";
        roundRect(4, 14, 31, 31, 9);
        context.fill();
        context.fillStyle = "#293d50";
        roundRect(5, 39, 12, 14, 5);
        context.fill();
        roundRect(23, 39, 12, 14, 5);
        context.fill();
        context.fillStyle = "#ffd7b1";
        context.beginPath();
        context.arc(20, 13, 14, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#5b382b";
        context.beginPath();
        context.arc(20, 9, 14, Math.PI, Math.PI * 2);
        context.fill();
        context.fillStyle = "#25394a";
        context.beginPath();
        context.arc(25, 15, 2, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#fffefa";
        roundRect(5, 2, 30, 7, 4);
        context.fill();
        context.fillStyle = "#4d8c64";
        roundRect(8, -3, 24, 8, 4);
        context.fill();
        context.restore();
    };

    const drawMascot = (x, y, time) => {
        const flap = Math.sin(time / 180) * 2;
        context.save();
        context.translate(x, y);
        context.fillStyle = "rgba(37, 57, 48, .16)";
        context.beginPath();
        context.ellipse(20, 38, 21, 5, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#9c77bd";
        context.beginPath();
        context.ellipse(20, 21, 18, 19, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#8562a7";
        context.beginPath();
        context.ellipse(5, 23, 8, 10 + flap, -.25, 0, Math.PI * 2);
        context.ellipse(35, 23, 8, 10 - flap, .25, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#fffefa";
        context.beginPath();
        context.arc(14, 19, 6, 0, Math.PI * 2);
        context.arc(26, 19, 6, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#2a3837";
        context.beginPath();
        context.arc(15, 20, 2, 0, Math.PI * 2);
        context.arc(25, 20, 2, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#e8ac55";
        context.beginPath();
        context.moveTo(20, 23);
        context.lineTo(16, 28);
        context.lineTo(24, 28);
        context.closePath();
        context.fill();
        context.restore();
    };

    const drawCage = (x, time) => {
        const opening = cage.openAt ? Math.min(1, (time - cage.openAt) / 950) : 0;
        context.save();
        context.translate(x, 0);
        context.fillStyle = "#8b6744";
        roundRect(-13, groundY - 17, 114, 18, 5);
        context.fill();
        context.fillStyle = "#8a7151";
        roundRect(0, groundY - 112, 82, 95, 10);
        context.fill();
        context.fillStyle = "#b99768";
        roundRect(7, groundY - 105, 68, 80, 5);
        context.fill();
        if (opening < 1) drawMascot(22, groundY - 88, time);
        context.strokeStyle = "#654d39";
        context.lineWidth = 5;
        context.beginPath();
        context.moveTo(10, groundY - 104);
        context.lineTo(10, groundY - 26);
        context.moveTo(29, groundY - 104);
        context.lineTo(29, groundY - 26);
        context.moveTo(48, groundY - 104);
        context.lineTo(48, groundY - 26);
        context.moveTo(67, groundY - 104);
        context.lineTo(67, groundY - 26);
        context.stroke();
        context.save();
        context.translate(82, groundY - 105);
        context.rotate(-opening * 1.15);
        context.fillStyle = "#d1b27f";
        context.fillRect(-2, 0, 8, 80);
        context.strokeStyle = "#654d39";
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(0, 3);
        context.lineTo(0, 77);
        context.stroke();
        context.restore();
        context.restore();
    };

    const drawScene = (time) => {
        const width = canvas.width;
        const height = canvas.height;
        const cameraX = Math.max(0, Math.min(worldWidth - width, player.x - width * .38));
        context.clearRect(0, 0, width, height);

        const sky = context.createLinearGradient(0, 0, 0, height);
        sky.addColorStop(0, "#9edbf1");
        sky.addColorStop(1, "#e5f5d9");
        context.fillStyle = sky;
        context.fillRect(0, 0, width, height);

        context.fillStyle = "#f9d879";
        context.beginPath();
        context.arc(790 - cameraX * .08, 88, 39, 0, Math.PI * 2);
        context.fill();
        for (let cloud = 0; cloud < 5; cloud += 1) {
            drawCloud(((cloud * 250 + 70 - cameraX * .16) % (width + 120)) - 40, 78 + (cloud % 3) * 48, .75 + (cloud % 2) * .2);
        }

        context.fillStyle = "#b8dcaa";
        for (let hill = 0; hill < 8; hill += 1) {
            const hillX = hill * 190 - (cameraX * .28 % 190);
            context.beginPath();
            context.ellipse(hillX + 80, 355, 130, 105, 0, 0, Math.PI * 2);
            context.fill();
        }
        context.fillStyle = "#8fc78b";
        for (let hill = 0; hill < 8; hill += 1) {
            const hillX = hill * 230 - (cameraX * .46 % 230);
            context.beginPath();
            context.ellipse(hillX + 100, 390, 125, 78, 0, 0, Math.PI * 2);
            context.fill();
        }

        context.fillStyle = "#75b96b";
        context.fillRect(0, groundY, width, height - groundY);
        context.fillStyle = "#5c9e5b";
        context.fillRect(0, groundY, width, 13);
        for (let grass = 0; grass < width + 30; grass += 35) {
            const grassX = grass - (cameraX % 35);
            context.fillStyle = grass % 2 ? "#91cf75" : "#6eaf60";
            context.fillRect(grassX, groundY + 28 + (grass % 3) * 15, 13, 5);
        }

        for (const platform of platforms) {
            const x = platform.x - cameraX;
            if (x + platform.width < -20 || x > width + 20) continue;
            context.fillStyle = "#b98356";
            roundRect(x, platform.y, platform.width, 22, 7);
            context.fill();
            context.fillStyle = "#e6b778";
            roundRect(x, platform.y, platform.width, 8, 7);
            context.fill();
            context.fillStyle = "#5e9d55";
            for (let block = 10; block < platform.width; block += 29) {
                context.fillRect(x + block, platform.y + 13, 7, 4);
            }
        }

        for (let tree = 0; tree < 10; tree += 1) {
            const treeX = 270 + tree * 260 - cameraX;
            if (treeX < -50 || treeX > width + 50) continue;
            context.fillStyle = "#8b6744";
            context.fillRect(treeX, groundY - 65, 18, 65);
            context.fillStyle = tree % 2 ? "#498d5a" : "#5c9d5b";
            context.beginPath();
            context.arc(treeX + 9, groundY - 77, 34, 0, Math.PI * 2);
            context.fill();
            context.fillStyle = "#79b866";
            context.beginPath();
            context.arc(treeX - 10, groundY - 66, 22, 0, Math.PI * 2);
            context.fill();
        }

        drawCage(cage.x - cameraX, time);
        drawPlayer(player.x - cameraX, player.y, time);
        if (cage.openAt && time - cage.openAt >= 950) {
            drawMascot(mascot.x - cameraX, mascot.y, time);
        }
        return cameraX;
    };

    const update = (delta, time) => {
        if (!active) {
            if (!cutsceneStartedAt) return;
            const elapsed = time - cutsceneStartedAt;
            const approach = Math.min(1, elapsed / 850);
            player.x = 330 - 112 * approach;

            if (elapsed >= 850 && !cage.openAt) {
                cage.openAt = time;
                introTitle.textContent = "Você conseguiu!";
                introCopy.textContent = "A portinha se abriu. Seu novo amigo está livre!";
                openCageButton.textContent = "A gaiola está abrindo...";
            }

            const releaseProgress = Math.min(1, Math.max(0, (elapsed - 1800) / 420));
            if (releaseProgress > 0) {
                mascot.x = cage.x + 82 + (player.x - 58 - (cage.x + 82)) * releaseProgress;
                mascot.y = groundY - 40;
            }

            if (elapsed >= 2450 && !cutsceneFinishing) {
                cutsceneFinishing = true;
                introCard.classList.add("is-opening");
                window.setTimeout(() => {
                    introCard.hidden = true;
                    active = true;
                    gameStatus.textContent = "Use W, A, S e D para explorar. Seu mascote está seguindo você!";
                    showToast("A aventura começou! Seu mascote está com você.", 2600);
                }, 380);
            }
            return;
        }

        const step = Math.min(delta / 16.67, 2);
        const speed = 4.1 * step;
        const previousY = player.y;
        const movingLeft = keys.has("a");
        const movingRight = keys.has("d");

        if (movingLeft !== movingRight) {
            player.x += movingRight ? speed : -speed;
        }
        player.x = Math.max(0, Math.min(worldWidth - player.width, player.x));

        if (keys.has("w") && player.grounded && jumpReady) {
            player.velocityY = -12.8;
            player.grounded = false;
            jumpReady = false;
        }
        if (!keys.has("w")) jumpReady = true;

        const dropping = keys.has("s");
        if (dropping && player.grounded && player.y < groundY - player.height) {
            player.y += 4;
            player.grounded = false;
        }
        player.velocityY += .55 * step;
        player.y += player.velocityY * step;
        player.grounded = false;

        if (player.y + player.height >= groundY) {
            player.y = groundY - player.height;
            player.velocityY = 0;
            player.grounded = true;
        }
        if (!dropping && player.velocityY >= 0) {
            for (const platform of platforms) {
                const overlapping = player.x + player.width > platform.x && player.x < platform.x + platform.width;
                const crossedTop = previousY + player.height <= platform.y && player.y + player.height >= platform.y;
                if (overlapping && crossedTop) {
                    player.y = platform.y - player.height;
                    player.velocityY = 0;
                    player.grounded = true;
                    break;
                }
            }
        }

        const followX = player.x - 58;
        const followY = player.y + player.height - 40;
        mascot.x += (followX - mascot.x) * Math.min(.13 * step, .8);
        mascot.y += (followY - mascot.y) * Math.min(.13 * step, .8);
        mascot.x = Math.max(0, mascot.x);

        if (mascot.x > cage.x + 82 && !toast.hidden) {
            toast.hidden = true;
        }
        if (toastTimer && time > toastTimer) {
            toast.hidden = true;
            toastTimer = 0;
        }
    };

    const frame = (time) => {
        const delta = lastFrame ? time - lastFrame : 16.67;
        lastFrame = time;
        update(delta, time);
        drawScene(time);
        window.requestAnimationFrame(frame);
    };

    const openCage = () => {
        if (cutsceneStartedAt) return;
        cutsceneStartedAt = performance.now();
        openCageButton.disabled = true;
        introTitle.textContent = "Vamos libertar seu amigo!";
        introCopy.textContent = "Seu personagem está abrindo caminho até a gaiola...";
        openCageButton.textContent = "Abrindo...";
    };

    const showToast = (message, duration) => {
        toast.textContent = message;
        toast.hidden = false;
        toastTimer = performance.now() + duration;
    };

    const setKey = (key, isDown) => {
        const normalizedKey = key.toLowerCase();
        if (!["w", "a", "s", "d"].includes(normalizedKey)) return;
        if (isDown) keys.add(normalizedKey);
        else keys.delete(normalizedKey);
    };

    openCageButton.addEventListener("click", openCage);
    document.addEventListener("keydown", (event) => {
        const key = event.key.toLowerCase();
        if (!["w", "a", "s", "d"].includes(key)) return;
        event.preventDefault();
        setKey(key, true);
    });
    document.addEventListener("keyup", (event) => setKey(event.key, false));
    window.addEventListener("blur", () => keys.clear());
    document.querySelectorAll("[data-game-key]").forEach((button) => {
        const key = button.dataset.gameKey;
        button.addEventListener("pointerdown", (event) => {
            event.preventDefault();
            button.setPointerCapture(event.pointerId);
            setKey(key, true);
        });
        for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
            button.addEventListener(eventName, () => setKey(key, false));
        }
    });

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) keys.clear();
    });

    drawScene(performance.now());
    window.requestAnimationFrame(frame);
}
