const CONSTANTS = {
    SCREEN_WIDTH: 600,
    SCREEN_HEIGHT: 800,
    WALL_THICKNESS: 100, // Invisible walls thickness
    GRAVITY: 1.5,
    FRICTION: 0.5,
    BOUNCINESS: 0.2, // Restitution
    DAMPING: 0.95, // Air resistance-ish

    // Physics Rule: All objects have same mass
    OBJECT_MASS: 1.0,

    PLANETS: [
        { name: 'asteroid', ja_name: '小惑星', radius: 30, score: 1, img: 'assets/asteroid.png' },
        { name: 'moon', ja_name: '月', radius: 50, score: 3, img: 'assets/moon.png' },
        { name: 'mercury', ja_name: '水星', radius: 70, score: 6, img: 'assets/mercury.png' },
        { name: 'mars', ja_name: '火星', radius: 90, score: 10, img: 'assets/mars.png' },
        { name: 'venus', ja_name: '金星', radius: 120, score: 15, img: 'assets/venus.png' },
        { name: 'earth', ja_name: '地球', radius: 150, score: 21, img: 'assets/earth.png' },
        { name: 'neptune', ja_name: '海王星', radius: 180, score: 28, img: 'assets/neptune.png' },
        { name: 'uranus', ja_name: '天王星', radius: 210, score: 36, img: 'assets/uranus.png' },
        { name: 'saturn', ja_name: '土星', radius: 240, score: 45, img: 'assets/saturn.png' }, // Special Ring Effect
        { name: 'jupiter', ja_name: '木星', radius: 280, score: 55, img: 'assets/jupiter.png' },
        { name: 'sun', ja_name: '太陽', radius: 320, score: 66, img: 'assets/sun.png' }
    ],

    // Categories for collision filtering (if needed)
    CATEGORY_PLANET: 0x0001,
    CATEGORY_WALL: 0x0002,
};
