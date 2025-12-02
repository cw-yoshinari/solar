/**
 * メインゲームロジック
 * 惑星マージゲームのコア機能を実装
 */

// ===== グローバル状態変数 =====
let app;                    // PIXIアプリケーションインスタンス
let currentPlanet = null;   // 現在操作中の惑星（ドロップ前）
let nextPlanetIndex = 0;    // 次に出現する惑星のインデックス
let score = 0;              // 現在のスコア
let planets = [];           // 画面上の全惑星 { body, visual }
let isDropping = false;     // 惑星ドロップ中フラグ
let bgm = null;             // BGMオーディオ要素
let lastMouseX = null;      // 最後のマウスX座標（惑星位置追従用）
let isGameOver = false;     // ゲームオーバーフラグ
let gameOverLine = null;    // ゲームオーバーライン（視覚的表示）

// ===== 画面揺さぶりシステム =====
let isShaking = false;              // 揺さぶり中フラグ
let lastScoreDeductTime = 0;        // 最後にスコアを減らした時刻
const SHAKE_SCORE_COST = 50;        // 0.1秒あたりのスコアコスト
const SHAKE_INTERVAL = 100;         // スコア減少間隔（ミリ秒）
const SHAKE_MIN_SCORE = 50;         // 揺さぶりに必要な最低スコア

// ===== BGMシャッフルシステム =====
const BGM_FILES = [
    { file: 'bgm/Bellhart.flac', name: 'Bellhart' },
    { file: 'bgm/Dark_Classical_Gothic_Orchestral.mp3', name: 'Dark Classical Gothic Orchestral' },
    { file: 'bgm/Deep_Funk_60s_Soul.mp3', name: 'Deep Funk 60s Soul' },
    { file: 'bgm/Dub_Reggae_Echo.mp3', name: 'Dub Reggae Echo' },
    { file: 'bgm/Gospel_Soulful_Orchestra.mp3', name: 'Gospel Soulful Orchestra' },
    { file: 'bgm/Jazz_Noir_Smoky_Slow.mp3', name: 'Jazz Noir Smoky Slow' },
    { file: 'bgm/New_Orleans_Funk_Swamp_Funk.mp3', name: 'New Orleans Funk Swamp Funk' },
    { file: 'bgm/Samba_Batucada_Rio_Carnival.mp3', name: 'Samba Batucada Rio Carnival' },
    { file: 'bgm/Symphonic_Jazz_Big_Band.mp3', name: 'Symphonic Jazz Big Band' }
];
let currentTrack = null;    // 現在再生中のトラック { file, name }
let bgmPlaylist = [];       // シャッフルされたプレイリスト
let bgmCurrentIndex = 0;    // 現在のプレイリスト位置

// ===== ゲームオーバー設定 =====
const GAME_OVER_LINE = 102;         // ゲームオーバーラインのY座標（床から758px）
const GAME_OVER_GRACE_TIME = 3000;  // 猶予時間（3秒）
const VELOCITY_THRESHOLD = 0.5;     // 静止判定の速度閾値

/**
 * PIXIアプリケーションを非同期で初期化
 * 物理エンジン、アセット読み込み、ゲーム開始を行う
 */
async function initPIXI() {
    app = new PIXI.Application();
    await app.init({
        width: CONSTANTS.SCREEN_WIDTH,
        height: CONSTANTS.SCREEN_HEIGHT,
        backgroundAlpha: 0,  // 透明背景（CSSで背景を設定）
        resolution: 1
    });

    // キャンバスをDOMに追加（PIXI v8互換対応）
    const canvas = app.canvas || app.view;
    document.getElementById('game-container').appendChild(canvas);

    // 物理エンジンを初期化
    Physics.init();
    Physics.createWalls();
    Physics.setupCollisionHandler(handleMerge);

    // 惑星画像を事前読み込み
    for (const planet of CONSTANTS.PLANETS) {
        await PIXI.Assets.load(planet.img);
    }

    // ゲーム開始
    await initGame();
}

// アプリケーション起動
initPIXI();

/**
 * ゲームを初期化
 * 入力イベント、BGM、ゲームループを設定
 */
async function initGame() {
    // ===== 入力イベント設定 =====
    // ドキュメント全体でイベントを監視（どこをクリックしてもドロップ可能）
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('click', onPointerUp);

    // キーボード入力（スペースキーでドロップ）
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            if (!isDropping && currentPlanet) {
                dropPlanet();
            }
        }
    });

    // ===== BGM設定 =====
    // ブラウザの自動再生ポリシー対策: ユーザー操作後に再生開始
    document.addEventListener('click', startBGM, { once: true });

    // 最初の惑星を生成
    spawnNextPlanet();

    // ゲームオーバーラインを描画（赤い半透明の線）
    gameOverLine = new PIXI.Graphics();
    gameOverLine.rect(0, GAME_OVER_LINE - 2, CONSTANTS.SCREEN_WIDTH, 4);
    gameOverLine.fill({ color: 0xff0000, alpha: 0.3 });
    app.stage.addChild(gameOverLine);

    // ===== ゲームループ =====
    app.ticker.add((delta) => {
        if (isGameOver) return;

        // 物理エンジンを更新（固定60FPS）
        Matter.Engine.update(Physics.engine, 1000 / 60);

        // 全惑星を更新
        let dangerPlanetExists = false;
        for (let i = planets.length - 1; i >= 0; i--) {
            const planet = planets[i];
            planet.visual.update(delta);

            // 静止している惑星のみゲームオーバー判定
            const velocity = Math.abs(planet.body.velocity.y);
            const isSettled = velocity < VELOCITY_THRESHOLD;

            // ゲームオーバー判定: 静止した惑星がラインより上にある
            if (isSettled && planet.body.position.y < GAME_OVER_LINE) {
                dangerPlanetExists = true;
                if (!planet.aboveLineTime) {
                    // 危険状態開始時刻を記録
                    planet.aboveLineTime = Date.now();
                } else if (Date.now() - planet.aboveLineTime > GAME_OVER_GRACE_TIME) {
                    // 猶予時間を超えたらゲームオーバー
                    triggerGameOver();
                    return;
                }
            } else {
                // ライン以下に戻ったら危険状態をリセット
                planet.aboveLineTime = null;
            }
        }

        // 危険状態時にラインを点滅させる視覚的フィードバック
        if (gameOverLine) {
            gameOverLine.alpha = dangerPlanetExists ? 0.5 + Math.sin(Date.now() / 100) * 0.3 : 0.3;
        }

        // 揺さぶり処理
        processShaking();
    });

    // 進化ガイドを設定
    setupEvolutionGuide();

    // 揺さぶりボタンを設定
    setupShakeButton();

    // デバッグ用: スコアCtrl+クリックで+100
    setupScoreDebug();
}

// ===== BGM関連関数 =====

/**
 * Fisher-Yatesシャッフルアルゴリズム
 * 配列をランダムに並び替える
 * @param {Array} array - シャッフルする配列
 * @returns {Array} シャッフルされた新しい配列
 */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * BGMプレイリストを初期化（シャッフル）
 */
function initBgmPlaylist() {
    bgmPlaylist = shuffleArray(BGM_FILES);
    bgmCurrentIndex = 0;
}

/**
 * 次のBGMを再生
 * プレイリスト終了時は再シャッフル（連続再生防止）
 */
function playNextBgm() {
    if (isGameOver) return;

    // プレイリストを全曲再生したら再シャッフル
    if (bgmCurrentIndex >= bgmPlaylist.length) {
        // 最後に再生した曲を記録（連続再生防止用）
        const lastSong = bgmPlaylist[bgmPlaylist.length - 1];

        // 再シャッフル
        bgmPlaylist = shuffleArray(BGM_FILES);

        // 新しいプレイリストの最初が前回最後と同じなら入れ替え
        if (bgmPlaylist.length > 1 && bgmPlaylist[0].file === lastSong.file) {
            const swapIndex = 1 + Math.floor(Math.random() * (bgmPlaylist.length - 1));
            [bgmPlaylist[0], bgmPlaylist[swapIndex]] = [bgmPlaylist[swapIndex], bgmPlaylist[0]];
        }

        bgmCurrentIndex = 0;
    }

    currentTrack = bgmPlaylist[bgmCurrentIndex];
    bgmCurrentIndex++;

    // 前のオーディオをクリーンアップ
    if (bgm) {
        bgm.removeEventListener('ended', playNextBgm);
        bgm.pause();
    }

    // 新しいオーディオを作成して再生
    bgm = new Audio(currentTrack.file);
    bgm.volume = document.getElementById('volume-slider')?.value / 100 || 0.5;
    bgm.addEventListener('ended', playNextBgm);  // 曲終了時に次を再生
    bgm.play().catch(e => console.log("Audio play failed:", e));

    updatePlayButton();
}

/**
 * 前のBGMを再生
 */
function playPreviousBgm() {
    if (bgmCurrentIndex > 1) {
        bgmCurrentIndex -= 2;  // 2つ戻る（次の曲で1つ進むため）
    } else {
        // プレイリストの最後にラップ
        bgmCurrentIndex = bgmPlaylist.length - 1;
    }
    playNextBgm();
}

/**
 * 再生/一時停止を切り替え
 */
function togglePlayPause() {
    if (!bgm) return;

    if (bgm.paused) {
        bgm.play().catch(e => console.log("Audio play failed:", e));
    } else {
        bgm.pause();
    }
    updatePlayButton();
}

/**
 * 再生ボタンのアイコンを更新
 */
function updatePlayButton() {
    const btn = document.getElementById('btn-play');
    if (btn && bgm) {
        btn.textContent = bgm.paused ? '▶' : '⏸';
    }
}

/**
 * 音量を設定
 * @param {number} value - 音量値（0-100）
 */
function setVolume(value) {
    if (bgm) {
        bgm.volume = value / 100;
    }
}

/**
 * ミュージックプレイヤーの表示/非表示を切り替え
 */
function togglePlayerVisibility() {
    const musicPlayer = document.getElementById('music-player');
    const toggleBtn = document.getElementById('btn-toggle-player');
    if (musicPlayer && toggleBtn) {
        musicPlayer.classList.toggle('collapsed');
        toggleBtn.textContent = musicPlayer.classList.contains('collapsed') ? '🎵' : '✕';
    }
}

/**
 * ミュージックプレイヤーのコントロールを設定
 */
function setupMusicPlayerControls() {
    const btnPlay = document.getElementById('btn-play');
    const btnNext = document.getElementById('btn-next');
    const btnPrev = document.getElementById('btn-prev');
    const btnToggle = document.getElementById('btn-toggle-player');
    const volumeSlider = document.getElementById('volume-slider');

    // 表示切替ボタン
    if (btnToggle) {
        btnToggle.addEventListener('click', (e) => {
            e.stopPropagation();  // ゲームへのイベント伝播を防止
            togglePlayerVisibility();
        });
    }

    // 再生/一時停止ボタン
    if (btnPlay) {
        btnPlay.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePlayPause();
        });
    }

    // 次の曲ボタン
    if (btnNext) {
        btnNext.addEventListener('click', (e) => {
            e.stopPropagation();
            playNextBgm();
        });
    }

    // 前の曲ボタン
    if (btnPrev) {
        btnPrev.addEventListener('click', (e) => {
            e.stopPropagation();
            playPreviousBgm();
        });
    }

    // 音量スライダー
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            e.stopPropagation();
            setVolume(parseFloat(e.target.value));
        });
        volumeSlider.addEventListener('click', (e) => e.stopPropagation());
    }

    // ミュージックプレイヤー全体のクリックがゲームに影響しないようにする
    const musicPlayer = document.getElementById('music-player');
    if (musicPlayer) {
        musicPlayer.addEventListener('click', (e) => e.stopPropagation());
        musicPlayer.addEventListener('pointerup', (e) => e.stopPropagation());
    }
}

/**
 * BGMを開始（初回クリック時に呼び出される）
 */
function startBGM() {
    setupMusicPlayerControls();
    initBgmPlaylist();
    playNextBgm();
}

// ===== 惑星操作関数 =====

/**
 * 次の惑星を生成してプレビュー表示
 */
function spawnNextPlanet() {
    if (isDropping) return;

    // 出現する惑星は小さいものだけ（小惑星〜水星）
    const maxSpawnIndex = 2;
    const planetData = CONSTANTS.PLANETS[nextPlanetIndex];

    // 現在のプレビューを削除
    if (currentPlanet) {
        app.stage.removeChild(currentPlanet.container);
    }

    // 出現X座標を決定（最後のマウス位置または中央）
    let spawnX = CONSTANTS.SCREEN_WIDTH / 2;
    if (lastMouseX !== null) {
        const collisionRadius = planetData.radius * CONSTANTS.COLLISION_RATIO;
        spawnX = Math.max(collisionRadius, Math.min(lastMouseX, CONSTANTS.SCREEN_WIDTH - collisionRadius));
    }

    // プレビュー用の惑星を作成（物理なし）
    currentPlanet = new Planet(planetData, spawnX, 50, null);

    // ランダムな初期回転
    currentPlanet.container.rotation = Math.random() * Math.PI * 2;

    app.stage.addChild(currentPlanet.container);

    // 次に出現する惑星を決定
    nextPlanetIndex = Math.floor(Math.random() * (maxSpawnIndex + 1));
    document.getElementById('next-planet-img').src = CONSTANTS.PLANETS[nextPlanetIndex].img;
}

/**
 * ポインター移動イベントハンドラ
 * 惑星をマウスに追従させる
 */
function onPointerMove(e) {
    const gameContainer = document.getElementById('game-container');
    const rect = gameContainer.getBoundingClientRect();

    // CSSのtransform scaleを考慮してスケール比率を計算
    const scale = CONSTANTS.SCREEN_WIDTH / rect.width;
    let x = (e.clientX - rect.left) * scale;

    // マウスX座標を記録（次の惑星出現位置用）
    lastMouseX = x;

    if (isDropping || !currentPlanet) return;

    // 画面境界にクランプ（当たり判定半径を考慮）
    const collisionRadius = currentPlanet.radius * CONSTANTS.COLLISION_RATIO;
    x = Math.max(collisionRadius, Math.min(x, CONSTANTS.SCREEN_WIDTH - collisionRadius));

    currentPlanet.container.x = x;
}

/**
 * ポインターアップイベントハンドラ
 * クリック/タップで惑星をドロップ
 */
function onPointerUp(e) {
    if (isDropping || !currentPlanet) return;
    dropPlanet();
}

/**
 * 効果音を再生
 * @param {string} src - 音声ファイルのパス
 */
function playSE(src) {
    const se = new Audio(src);
    se.volume = 0.6;
    se.play().catch(e => console.log("SE play failed:", e));
}

/**
 * 惑星をドロップ
 * プレビューを削除し、物理ボディを持つ実際の惑星を生成
 */
function dropPlanet() {
    isDropping = true;
    const x = currentPlanet.container.x;
    const y = currentPlanet.container.y;
    const rotation = currentPlanet.container.rotation;
    const data = currentPlanet.data;

    // プレビューを削除
    app.stage.removeChild(currentPlanet.container);
    currentPlanet = null;

    // ドロップ効果音を再生
    playSE('se/drop.wav');

    // 物理ボディ付きの惑星を生成
    createPhysicalPlanet(data, x, y, rotation);

    // クールダウン後に次の惑星を生成
    setTimeout(() => {
        isDropping = false;
        spawnNextPlanet();
    }, 1000);
}

/**
 * 物理ボディ付きの惑星を生成
 * @param {Object} data - 惑星データ
 * @param {number} x - X座標
 * @param {number} y - Y座標
 * @param {number} rotation - 初期回転角度
 */
function createPhysicalPlanet(data, x, y, rotation = 0) {
    // 物理ボディを作成
    const body = Physics.createPlanetBody(x, y, data.radius, data);

    // 初期回転を適用
    Matter.Body.setAngle(body, rotation);

    // 視覚オブジェクトを作成
    const visual = new Planet(data, x, y, body);
    visual.container.rotation = rotation;

    // 物理世界とステージに追加
    Matter.World.add(Physics.world, body);
    app.stage.addChild(visual.container);

    planets.push({ body, visual });
}

/**
 * 惑星のマージを処理
 * 同じ種類の惑星が衝突した時に呼び出される
 * @param {Matter.Body} bodyA - 衝突した惑星A
 * @param {Matter.Body} bodyB - 衝突した惑星B
 * @param {Object|null} nextPlanetData - 次の惑星データ（太陽の場合はnull）
 * @param {Object} currentPlanetData - 現在の惑星データ（スコア計算用）
 */
function handleMerge(bodyA, bodyB, nextPlanetData, currentPlanetData) {
    // 古い物理ボディを削除
    Matter.World.remove(Physics.world, [bodyA, bodyB]);

    // 視覚オブジェクトを検索して削除
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

    if (nextPlanetData) {
        // 通常のマージ: 次の惑星を生成
        const midX = (bodyA.position.x + bodyB.position.x) / 2;
        const midY = (bodyA.position.y + bodyB.position.y) / 2;
        createPhysicalPlanet(nextPlanetData, midX, midY);
    }

    // スコアを更新（マージした惑星のスコアを加算）
    score += currentPlanetData.score;
    document.getElementById('score').innerText = `Score: ${score}`;

    // 揺さぶりボタンの状態を更新
    updateShakeButtonState();

    // マージ効果音を再生
    playSE('se/remove.wav');
}

// ===== ゲームオーバー関連 =====

/**
 * ゲームオーバーを発動
 */
function triggerGameOver() {
    isGameOver = true;

    // 揺さぶりを停止
    stopShaking();

    // BGMを停止
    if (bgm) {
        bgm.pause();
        updatePlayButton();
    }

    // プレビュー惑星を削除
    if (currentPlanet) {
        app.stage.removeChild(currentPlanet.container);
        currentPlanet = null;
    }

    // ゲームオーバーUIを表示
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

/**
 * ゲームをリセット
 */
function resetGame() {
    // ゲームオーバーUIを削除
    const gameOverDiv = document.getElementById('game-over');
    if (gameOverDiv) {
        gameOverDiv.remove();
    }

    // 全惑星を削除
    for (const planet of planets) {
        Matter.World.remove(Physics.world, planet.body);
        planet.visual.destroy();
    }
    planets = [];

    // 状態をリセット
    score = 0;
    isGameOver = false;
    isDropping = false;
    isShaking = false;
    nextPlanetIndex = Math.floor(Math.random() * 3);
    document.getElementById('score').innerText = `Score: ${score}`;

    // 壁を元の位置にリセット
    Physics.resetWalls();

    // 揺さぶりボタンの状態を更新
    updateShakeButtonState();

    // BGMを再開
    playNextBgm();
    updatePlayButton();

    // 新しい惑星を生成
    spawnNextPlanet();
}

// ===== デバッグ関連関数 =====

/**
 * スコアデバッグ機能を設定
 * Ctrl + クリックでスコアを+100
 */
function setupScoreDebug() {
    const scoreEl = document.getElementById('score');
    if (!scoreEl) return;

    scoreEl.style.cursor = 'pointer';
    scoreEl.style.pointerEvents = 'auto';

    scoreEl.addEventListener('click', (e) => {
        if (!e.ctrlKey) return;  // Ctrlキー必須
        e.stopPropagation();

        score += 100;
        scoreEl.innerText = `Score: ${score}`;
        updateShakeButtonState();
        console.log(`[DEBUG] Score increased to: ${score}`);
    });
}

// ===== 画面揺さぶり関連関数 =====

/**
 * 揺さぶりボタンを設定
 */
function setupShakeButton() {
    const btnShake = document.getElementById('btn-shake');
    if (!btnShake) return;

    // 押下開始
    btnShake.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        startShaking();
    });

    // 押下終了
    btnShake.addEventListener('pointerup', (e) => {
        e.stopPropagation();
        stopShaking();
    });

    // ボタン領域から離れた場合も終了
    btnShake.addEventListener('pointerleave', (e) => {
        e.stopPropagation();
        stopShaking();
    });

    // ボタンのクリックがゲームに影響しないようにする
    btnShake.addEventListener('click', (e) => e.stopPropagation());

    // 初期状態を更新
    updateShakeButtonState();
}

/**
 * 揺さぶりを開始
 */
function startShaking() {
    // スコアが足りない場合は発動しない
    if (score <= SHAKE_MIN_SCORE || isGameOver) return;

    isShaking = true;
    lastScoreDeductTime = Date.now();

    const btnShake = document.getElementById('btn-shake');
    if (btnShake) {
        btnShake.classList.add('shaking');
    }
}

/**
 * 揺さぶりを停止
 */
function stopShaking() {
    if (!isShaking) return;

    isShaking = false;

    // 壁を元の位置にリセット
    Physics.resetWalls();

    const btnShake = document.getElementById('btn-shake');
    if (btnShake) {
        btnShake.classList.remove('shaking');
    }

    updateShakeButtonState();
}

/**
 * 揺さぶりボタンの状態を更新（有効/無効）
 */
function updateShakeButtonState() {
    const btnShake = document.getElementById('btn-shake');
    if (!btnShake) return;

    if (score <= SHAKE_MIN_SCORE || isGameOver) {
        btnShake.classList.add('disabled');
    } else {
        btnShake.classList.remove('disabled');
    }
}

/**
 * 揺さぶり処理（ゲームループから呼び出し）
 */
function processShaking() {
    if (!isShaking) return;

    const now = Date.now();

    // スコア減少処理（0.1秒ごと）
    if (now - lastScoreDeductTime >= SHAKE_INTERVAL) {
        score -= SHAKE_SCORE_COST;
        lastScoreDeductTime = now;

        // スコアが0以下にならないようにする
        if (score < 0) {
            score = 0;
        }

        document.getElementById('score').innerText = `Score: ${score}`;

        // スコアが足りなくなったら停止
        if (score <= SHAKE_MIN_SCORE) {
            stopShaking();
            return;
        }
    }

    // 壁揺さぶり効果（ランダムに±5px）
    const offsetX = Math.floor(Math.random() * 11) - 5; // -5 ~ 5
    const offsetY = Math.floor(Math.random() * 11) - 5; // -5 ~ 5

    Physics.shakeWalls(offsetX, offsetY);
}

// ===== 進化ガイド =====

/**
 * 進化ガイド（サイドバー）を設定
 * 惑星の進化順序を表示
 */
function setupEvolutionGuide() {
    const listContainer = document.getElementById('evolution-list');
    const planets = CONSTANTS.PLANETS;

    planets.forEach((planet, index) => {
        const el = document.createElement('div');
        el.className = 'evolution-item';

        el.innerHTML = `
            <img src="${planet.img}" alt="${planet.name}">
            <span>${planet.ja_name}</span>
        `;

        // デバッグ機能: Ctrl + クリックで次の惑星を変更
        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => {
            if (!e.ctrlKey) return;  // Ctrlキー必須
            e.stopPropagation();
            nextPlanetIndex = index;
            document.getElementById('next-planet-img').src = planet.img;
            console.log(`[DEBUG] Next planet set to: ${planet.ja_name}`);
        });

        listContainer.appendChild(el);
    });
}
