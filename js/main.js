// Main Game Logic

let app;
let currentPlanet = null;
let nextPlanetIndex = 0;
let score = 0;
let planets = []; // Array of { body, visual }
let isDropping = false;
let bgm = null;
let lastMouseX = null; // Track last mouse X position
let isGameOver = false;
let gameOverLine = null; // Visual indicator

// BGM Shuffle System
const BGM_FILES = [
    'bgm/Dub_Reggae_Echo.mp3',
    'bgm/Jazz_Noir_Smoky_Slow.mp3'
];
let bgmPlaylist = [];
let bgmCurrentIndex = 0;
const GAME_OVER_LINE = 100; // Y position for game over check
const GAME_OVER_GRACE_TIME = 3000; // 3 seconds grace period
const VELOCITY_THRESHOLD = 0.5; // Only check settled planets (low velocity)

// Initialize PIXI Application (async)
async function initPIXI() {
    app = new PIXI.Application();
    await app.init({
        width: CONSTANTS.SCREEN_WIDTH,
        height: CONSTANTS.SCREEN_HEIGHT,
        background: 0x050510,
        resolution: 1
    });

    // Use app.canvas if available, otherwise fallback to app.view
    const canvas = app.canvas || app.view;
    document.getElementById('game-container').appendChild(canvas);

    // Initialize Physics
    Physics.init();
    Physics.createWalls();
    Physics.setupCollisionHandler(handleMerge);

    // Load Assets - preload all planet images
    for (const planet of CONSTANTS.PLANETS) {
        await PIXI.Assets.load(planet.img);
    }

    // Start Game
    await initGame();
}

// Start PIXI Application
initPIXI();

async function initGame() {
    // Preload assets if needed, or just let them load on demand since they are local.
    // For simplicity, we'll just start.

    // Setup Input - use document level for all events (can click anywhere to drop)
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('click', onPointerUp);

    // Keyboard support (spacebar to drop)
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            if (!isDropping && currentPlanet) {
                dropPlanet();
            }
        }
    });

    // Setup BGM
    // Note: Audio needs user interaction to start usually.
    document.addEventListener('click', startBGM, { once: true });

    // Spawn first planet
    spawnNextPlanet();

    // Draw game over line indicator
    gameOverLine = new PIXI.Graphics();
    gameOverLine.rect(0, GAME_OVER_LINE - 2, CONSTANTS.SCREEN_WIDTH, 4);
    gameOverLine.fill({ color: 0xff0000, alpha: 0.3 });
    app.stage.addChild(gameOverLine);

    // Game Loop
    app.ticker.add((delta) => {
        if (isGameOver) return;

        Matter.Engine.update(Physics.engine, 1000 / 60); // Fixed step for consistency

        // Update all planets
        let dangerPlanetExists = false;
        for (let i = planets.length - 1; i >= 0; i--) {
            const planet = planets[i];
            planet.visual.update(delta);

            // Only check settled planets (low velocity)
            const velocity = Math.abs(planet.body.velocity.y);
            const isSettled = velocity < VELOCITY_THRESHOLD;

            // Game Over check: settled planet above the line
            if (isSettled && planet.body.position.y < GAME_OVER_LINE) {
                dangerPlanetExists = true;
                if (!planet.aboveLineTime) {
                    planet.aboveLineTime = Date.now();
                } else if (Date.now() - planet.aboveLineTime > GAME_OVER_GRACE_TIME) {
                    triggerGameOver();
                    return;
                }
            } else {
                planet.aboveLineTime = null;
            }
        }

        // Visual feedback: flash line when danger
        if (gameOverLine) {
            gameOverLine.alpha = dangerPlanetExists ? 0.5 + Math.sin(Date.now() / 100) * 0.3 : 0.3;
        }
    });

    setupEvolutionGuide();
}

// Fisher-Yates shuffle algorithm
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function initBgmPlaylist() {
    bgmPlaylist = shuffleArray(BGM_FILES);
    bgmCurrentIndex = 0;
}

function playNextBgm() {
    if (isGameOver) return;
    
    // If we've played all songs, reshuffle
    if (bgmCurrentIndex >= bgmPlaylist.length) {
        // Get the last played song to avoid repeating it first
        const lastSong = bgmPlaylist[bgmPlaylist.length - 1];
        
        // Reshuffle
        bgmPlaylist = shuffleArray(BGM_FILES);
        
        // If the first song of new shuffle is same as last played, swap with another
        if (bgmPlaylist.length > 1 && bgmPlaylist[0] === lastSong) {
            const swapIndex = 1 + Math.floor(Math.random() * (bgmPlaylist.length - 1));
            [bgmPlaylist[0], bgmPlaylist[swapIndex]] = [bgmPlaylist[swapIndex], bgmPlaylist[0]];
        }
        
        bgmCurrentIndex = 0;
    }
    
    const nextTrack = bgmPlaylist[bgmCurrentIndex];
    bgmCurrentIndex++;
    
    bgm = new Audio(nextTrack);
    bgm.volume = 0.5;
    bgm.addEventListener('ended', playNextBgm);
    bgm.play().catch(e => console.log("Audio play failed:", e));
}

function startBGM() {
    initBgmPlaylist();
    playNextBgm();
}

function spawnNextPlanet() {
    if (isDropping) return;

    // Randomize next planet (only small ones: asteroid to mercury)
    const maxSpawnIndex = 2;
    const planetData = CONSTANTS.PLANETS[nextPlanetIndex];

    // Create a visual-only preview at the top
    if (currentPlanet) {
        app.stage.removeChild(currentPlanet.container);
    }

    // Determine spawn X position (use last mouse position or center)
    let spawnX = CONSTANTS.SCREEN_WIDTH / 2;
    if (lastMouseX !== null) {
        const collisionRadius = planetData.radius * 0.65;
        spawnX = Math.max(collisionRadius, Math.min(lastMouseX, CONSTANTS.SCREEN_WIDTH - collisionRadius));
    }

    // We create a "dummy" planet for preview (no physics yet)
    currentPlanet = new Planet(planetData, spawnX, 50, null);

    // Random rotation
    currentPlanet.container.rotation = Math.random() * Math.PI * 2;

    app.stage.addChild(currentPlanet.container);

    // Prepare NEXT next planet
    nextPlanetIndex = Math.floor(Math.random() * (maxSpawnIndex + 1));
    document.getElementById('next-planet-img').src = CONSTANTS.PLANETS[nextPlanetIndex].img;
}

function onPointerMove(e) {
    const gameContainer = document.getElementById('game-container');
    const rect = gameContainer.getBoundingClientRect();
    let x = e.clientX - rect.left;

    // Track mouse X for spawning (before clamping)
    lastMouseX = x;

    if (isDropping || !currentPlanet) return;

    // Clamp to screen bounds using collision radius (0.65 of visual)
    const collisionRadius = currentPlanet.radius * 0.65;
    x = Math.max(collisionRadius, Math.min(x, CONSTANTS.SCREEN_WIDTH - collisionRadius));

    currentPlanet.container.x = x;
}

function onPointerUp(e) {
    if (isDropping || !currentPlanet) return;
    dropPlanet();
}

function playSE(src) {
    const se = new Audio(src);
    se.volume = 0.6;
    se.play().catch(e => console.log("SE play failed:", e));
}

function dropPlanet() {
    isDropping = true;
    const x = currentPlanet.container.x;
    const y = currentPlanet.container.y;
    const rotation = currentPlanet.container.rotation;
    const data = currentPlanet.data;

    // Remove preview
    app.stage.removeChild(currentPlanet.container);
    currentPlanet = null;

    // Play drop sound effect
    playSE('se/drop.wav');

    // Create real physical planet with rotation
    createPhysicalPlanet(data, x, y, rotation);

    // Cooldown before next spawn
    setTimeout(() => {
        isDropping = false;
        spawnNextPlanet();
    }, 1000);
}

function createPhysicalPlanet(data, x, y, rotation = 0) {
    const body = Physics.createPlanetBody(x, y, data.radius, data);

    // Apply initial rotation to physics body
    Matter.Body.setAngle(body, rotation);

    const visual = new Planet(data, x, y, body);
    visual.container.rotation = rotation;

    Matter.World.add(Physics.world, body);
    app.stage.addChild(visual.container);

    planets.push({ body, visual });
}

function handleMerge(bodyA, bodyB, nextPlanetData) {
    // Remove old bodies
    Matter.World.remove(Physics.world, [bodyA, bodyB]);

    // Find and remove visuals
    const planetA = planets.find(p => p.body === bodyA);
    const planetB = planets.find(p => p.body === bodyB);

    if (planetA) {
        planetA.visual.destroy();
        planets = planets.filter(p => p !== planetA);
    }
    if (planetB) {
        planetB.visual.destroy();
        planets = planets.filter(p => p !== planetB);
    }

    // Calculate midpoint for new planet
    const midX = (bodyA.position.x + bodyB.position.x) / 2;
    const midY = (bodyA.position.y + bodyB.position.y) / 2;

    // Create new planet
    createPhysicalPlanet(nextPlanetData, midX, midY);

    // Update Score
    score += nextPlanetData.score; // Or some logic based on merged planets
    document.getElementById('score').innerText = `Score: ${score}`;

    // Play merge sound effect
    playSE('se/remove.wav');
}

function triggerGameOver() {
    isGameOver = true;

    // Stop BGM
    if (bgm) {
        bgm.pause();
    }

    // Remove current planet preview
    if (currentPlanet) {
        app.stage.removeChild(currentPlanet.container);
        currentPlanet = null;
    }

    // Show game over UI
    const gameOverDiv = document.createElement('div');
    gameOverDiv.id = 'game-over';
    gameOverDiv.innerHTML = `
        <div class="game-over-content">
            <h1>GAME OVER</h1>
            <p>Score: ${score}</p>
            <button onclick="resetGame()">RETRY</button>
        </div>
    `;
    document.getElementById('game-container').appendChild(gameOverDiv);
}

function resetGame() {
    // Remove game over UI
    const gameOverDiv = document.getElementById('game-over');
    if (gameOverDiv) {
        gameOverDiv.remove();
    }

    // Clear all planets
    for (const planet of planets) {
        Matter.World.remove(Physics.world, planet.body);
        planet.visual.destroy();
    }
    planets = [];

    // Reset state
    score = 0;
    isGameOver = false;
    isDropping = false;
    nextPlanetIndex = Math.floor(Math.random() * 3);
    document.getElementById('score').innerText = `Score: ${score}`;

    // Restart BGM
    playNextBgm();

    // Spawn new planet
    spawnNextPlanet();
}

function setupEvolutionGuide() {
    const listContainer = document.getElementById('evolution-list');
    const planets = CONSTANTS.PLANETS;

    planets.forEach((planet) => {
        const el = document.createElement('div');
        el.className = 'evolution-item';

        el.innerHTML = `
            <img src="${planet.img}" alt="${planet.name}">
            <span>${planet.ja_name}</span>
        `;

        listContainer.appendChild(el);
    });
}
