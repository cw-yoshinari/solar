/**
 * 物理エンジンモジュール
 * Matter.jsを使用して惑星の物理挙動を管理
 */
const Physics = {
    engine: null,  // Matter.jsエンジンインスタンス
    world: null,   // 物理世界インスタンス
    walls: {       // 壁への参照（揺さぶり用）
        ground: null,
        left: null,
        right: null,
        originalPositions: null  // 元の位置を保存
    },

    /**
     * 物理エンジンを初期化
     * 重力設定を適用してエンジンを生成
     */
    init: function () {
        this.engine = Matter.Engine.create();
        this.world = this.engine.world;

        // 重力を設定（Y軸方向）
        this.engine.gravity.y = CONSTANTS.GRAVITY;
    },

    /**
     * ゲームエリアの壁を生成
     * 床と左右の壁を静的オブジェクトとして配置
     */
    createWalls: function () {
        // 壁の共通設定
        const wallOptions = {
            isStatic: true,                      // 静的オブジェクト（動かない）
            friction: CONSTANTS.FRICTION,         // 摩擦係数
            restitution: CONSTANTS.BOUNCINESS,    // 反発係数
            label: 'wall'                         // 識別ラベル
        };

        // 床（画面下部）
        const ground = Matter.Bodies.rectangle(
            CONSTANTS.SCREEN_WIDTH / 2,                           // X座標（中央）
            CONSTANTS.SCREEN_HEIGHT + CONSTANTS.WALL_THICKNESS / 2, // Y座標（画面下）
            CONSTANTS.SCREEN_WIDTH,                               // 幅
            CONSTANTS.WALL_THICKNESS,                             // 高さ
            wallOptions
        );

        // 左壁
        const leftWall = Matter.Bodies.rectangle(
            -CONSTANTS.WALL_THICKNESS / 2,        // X座標（画面左外）
            CONSTANTS.SCREEN_HEIGHT / 2,          // Y座標（中央）
            CONSTANTS.WALL_THICKNESS,             // 幅
            CONSTANTS.SCREEN_HEIGHT * 2,          // 高さ（十分な長さ）
            wallOptions
        );

        // 右壁
        const rightWall = Matter.Bodies.rectangle(
            CONSTANTS.SCREEN_WIDTH + CONSTANTS.WALL_THICKNESS / 2,  // X座標（画面右外）
            CONSTANTS.SCREEN_HEIGHT / 2,                            // Y座標（中央）
            CONSTANTS.WALL_THICKNESS,                               // 幅
            CONSTANTS.SCREEN_HEIGHT * 2,                            // 高さ
            wallOptions
        );

        // 壁への参照を保存（揺さぶり機能用）
        this.walls.ground = ground;
        this.walls.left = leftWall;
        this.walls.right = rightWall;
        this.walls.originalPositions = {
            ground: { x: ground.position.x, y: ground.position.y },
            left: { x: leftWall.position.x, y: leftWall.position.y },
            right: { x: rightWall.position.x, y: rightWall.position.y }
        };

        // 壁を物理世界に追加
        Matter.World.add(this.world, [ground, leftWall, rightWall]);
    },

    /**
     * 壁を揺さぶる（オフセット適用）
     * @param {number} offsetX - X方向のオフセット
     * @param {number} offsetY - Y方向のオフセット
     */
    shakeWalls: function (offsetX, offsetY) {
        if (!this.walls.originalPositions) return;

        const orig = this.walls.originalPositions;

        // 床を移動
        Matter.Body.setPosition(this.walls.ground, {
            x: orig.ground.x + offsetX,
            y: orig.ground.y + offsetY
        });

        // 左壁を移動
        Matter.Body.setPosition(this.walls.left, {
            x: orig.left.x + offsetX,
            y: orig.left.y + offsetY
        });

        // 右壁を移動
        Matter.Body.setPosition(this.walls.right, {
            x: orig.right.x + offsetX,
            y: orig.right.y + offsetY
        });
    },

    /**
     * 壁を元の位置にリセット
     */
    resetWalls: function () {
        this.shakeWalls(0, 0);
    },

    /**
     * 惑星の物理ボディを生成
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @param {number} radius - 惑星の表示半径
     * @param {Object} planetData - 惑星データ
     * @returns {Matter.Body} 生成された物理ボディ
     */
    createPlanetBody: function (x, y, radius, planetData) {
        // 当たり判定半径を計算（表示サイズ × 衝突比率）
        const collisionRadius = radius * CONSTANTS.COLLISION_RATIO;

        // 円形の物理ボディを生成
        const body = Matter.Bodies.circle(x, y, collisionRadius, {
            restitution: CONSTANTS.BOUNCINESS,  // 反発係数
            friction: CONSTANTS.FRICTION,        // 摩擦係数
            density: 0.001,                      // 密度（後で質量で上書き）
            label: planetData.name               // 惑星名をラベルに設定
        });

        // 全惑星同一質量ルールを適用
        Matter.Body.setMass(body, CONSTANTS.OBJECT_MASS);

        return body;
    },

    /**
     * 衝突イベントハンドラを設定
     * 同じ種類の惑星同士が衝突した時にマージ処理を呼び出す
     * @param {Function} onMerge - マージ時に呼び出されるコールバック関数
     */
    setupCollisionHandler: function (onMerge) {
        Matter.Events.on(this.engine, 'collisionStart', (event) => {
            const pairs = event.pairs;
            const processedBodies = new Set();  // 同一フレームで処理済みのボディを追跡

            for (let i = 0; i < pairs.length; i++) {
                const bodyA = pairs[i].bodyA;
                const bodyB = pairs[i].bodyB;

                // 既に処理済みのボディはスキップ（重複マージ防止）
                if (processedBodies.has(bodyA.id) || processedBodies.has(bodyB.id)) {
                    continue;
                }

                // 同じ種類の惑星同士の衝突かチェック（壁は除外）
                if (bodyA.label === bodyB.label && bodyA.label !== 'wall') {
                    // 惑星リストから該当惑星のインデックスを取得
                    const planetIndex = CONSTANTS.PLANETS.findIndex(p => p.name === bodyA.label);

                    if (planetIndex !== -1) {
                        // 両ボディを処理済みとしてマーク
                        processedBodies.add(bodyA.id);
                        processedBodies.add(bodyB.id);

                        // 次の惑星を取得（太陽の場合はnull = 消滅のみ）
                        const nextPlanet = planetIndex < CONSTANTS.PLANETS.length - 1
                            ? CONSTANTS.PLANETS[planetIndex + 1]
                            : null;

                        // マージ処理を実行
                        onMerge(bodyA, bodyB, nextPlanet, CONSTANTS.PLANETS[planetIndex]);
                    }
                }
            }
        });
    }
};
