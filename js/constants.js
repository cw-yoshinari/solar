/**
 * ゲーム定数設定ファイル
 * 画面サイズ、物理パラメータ、惑星データを管理
 */
const CONSTANTS = {
    // ===== 画面設定 =====
    SCREEN_WIDTH: 600,    // ゲーム画面の幅（ピクセル）
    SCREEN_HEIGHT: 860,   // ゲーム画面の高さ（ピクセル）
    WALL_THICKNESS: 100,  // 透明な壁の厚さ

    // ===== 物理エンジン設定 =====
    GRAVITY: 1.5,         // 重力の強さ
    FRICTION: 0.5,        // 摩擦係数
    BOUNCINESS: 0.2,      // 反発係数（跳ね返り）
    DAMPING: 0.95,        // 空気抵抗（減衰）

    // ===== 物理ルール: 全オブジェクト同一質量 =====
    OBJECT_MASS: 1.0,

    // ===== 表示スケール設定 =====
    // 惑星の表示サイズを調整（1.0 = 半径と一致、小さい値 = 小さく表示）
    DISPLAY_SCALE: 0.8,

    // ===== 当たり判定比率 =====
    // 衝突判定半径 = 表示半径 × COLLISION_RATIO
    // radius（直径）に対して0.5で視覚的な半径と一致
    COLLISION_RATIO: 0.5,

    // ===== 惑星データ =====
    // radius: 表示サイズ（直径）
    // score: マージ時に獲得するスコア
    // img: 惑星画像パス
    PLANETS: [
        { name: 'asteroid', ja_name: '小惑星', radius: 44, score: 1, img: 'assets/asteroid.png' },
        { name: 'moon', ja_name: '月', radius: 57, score: 3, img: 'assets/moon.png' },
        { name: 'mercury', ja_name: '水星', radius: 84, score: 6, img: 'assets/mercury.png' },
        { name: 'mars', ja_name: '火星', radius: 92, score: 10, img: 'assets/mars.png' },
        { name: 'venus', ja_name: '金星', radius: 105, score: 15, img: 'assets/venus.png' },
        { name: 'earth', ja_name: '地球', radius: 134, score: 21, img: 'assets/earth.png' },
        { name: 'neptune', ja_name: '海王星', radius: 172, score: 28, img: 'assets/neptune.png' },
        { name: 'uranus', ja_name: '天王星', radius: 210, score: 36, img: 'assets/uranus.png' },
        { name: 'saturn', ja_name: '土星', radius: 237, score: 45, img: 'assets/saturn.png' },
        { name: 'jupiter', ja_name: '木星', radius: 294, score: 55, img: 'assets/jupiter.png' },
        { name: 'sun', ja_name: '太陽', radius: 347, score: 66, img: 'assets/sun.png' }
    ],

    // ===== 衝突フィルタリング用カテゴリ =====
    CATEGORY_PLANET: 0x0001,  // 惑星カテゴリ
    CATEGORY_WALL: 0x0002,    // 壁カテゴリ
};
