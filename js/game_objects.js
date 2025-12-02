/**
 * ゲームオブジェクトモジュール
 * PIXI.jsを使用した惑星のレンダリングを管理
 */

/**
 * 惑星クラス
 * 物理ボディと視覚表現を結びつけ、ゆらゆらエフェクトを適用
 */
class Planet {
    /**
     * 惑星インスタンスを生成
     * @param {Object} planetData - 惑星データ（定数から取得）
     * @param {number} x - 初期X座標
     * @param {number} y - 初期Y座標
     * @param {Matter.Body|null} physicsBody - 物理ボディ（プレビュー時はnull）
     */
    constructor(planetData, x, y, physicsBody) {
        this.data = planetData;        // 惑星データ参照
        this.body = physicsBody;       // 物理ボディ参照
        this.radius = planetData.radius;  // 表示半径

        // スプライトとエフェクト用のコンテナを作成
        this.container = new PIXI.Container();
        this.container.x = x;
        this.container.y = y;

        // メインスプライトを生成
        this.sprite = PIXI.Sprite.from(planetData.img);
        this.sprite.anchor.set(0.5);  // アンカーを中央に設定

        // 表示サイズを調整（画像は1024x1024、DISPLAY_SCALEで調整）
        const displayScale = CONSTANTS.DISPLAY_SCALE || 1.0;
        this.sprite.width = this.radius * 2 * displayScale;
        this.sprite.height = this.radius * 2 * displayScale;

        // ===== ゆらゆらエフェクト設定 =====
        // パフォーマンスを考慮し、シェーダーではなくスケール変化で表現
        this.wobblePhase = Math.random() * Math.PI * 2;  // 初期位相（ランダム）
        this.wobbleSpeed = 0.05;  // ゆらぎ速度

        // ===== グローフィルター（オプション） =====
        // pixi-filtersが利用可能な場合のみ適用
        if (PIXI.filters && PIXI.filters.GlowFilter) {
            const glowFilter = new PIXI.filters.GlowFilter({
                distance: 15,        // グローの広がり
                outerStrength: 2,    // 外側の強さ
                innerStrength: 0,    // 内側の強さ
                color: 0xffffff,     // グローの色
                quality: 0.1         // 品質（低いほど軽い）
            });
            this.sprite.filters = [glowFilter];
        }

        this.container.addChild(this.sprite);
    }

    /**
     * フレーム更新処理
     * 物理ボディとの同期、ゆらゆらエフェクトを適用
     * @param {number} delta - フレーム間隔（PIXI.Tickerから提供）
     */
    update(delta) {
        // 物理ボディがない場合は更新不要（プレビュー惑星）
        if (!this.body) return;

        // 物理ボディの位置・回転と同期
        this.container.x = this.body.position.x;
        this.container.y = this.body.position.y;
        this.container.rotation = this.body.angle;

        // ゆらゆらエフェクト（サイン波によるスケール変化）
        this.wobblePhase += this.wobbleSpeed;
        const scaleWobble = 1 + Math.sin(this.wobblePhase) * 0.02;  // ±2%の変化

        // 表示スケールを適用しながらゆらぎを反映
        const displayScale = CONSTANTS.DISPLAY_SCALE || 1.0;
        this.sprite.scale.set(
            (this.radius * 2 * displayScale / this.sprite.texture.width) * scaleWobble,
            (this.radius * 2 * displayScale / this.sprite.texture.height) * (1 / scaleWobble)
        );
    }

    /**
     * 惑星を破棄
     * コンテナと子要素を完全に削除
     */
    destroy() {
        this.container.destroy({ children: true });
    }
}
