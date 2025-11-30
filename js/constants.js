const CONSTANTS = {
    SCREEN_WIDTH: 600,
    SCREEN_HEIGHT: 860,
    WALL_THICKNESS: 100, // Invisible walls thickness
    GRAVITY: 1.5,
    FRICTION: 0.5,
    BOUNCINESS: 0.2, // Restitution
    DAMPING: 0.95, // Air resistance-ish

    // Physics Rule: All objects have same mass
    OBJECT_MASS: 1.0,

    // Display scale: adjust if planets appear larger/smaller than radius value
    // 1.0 = radius matches display, lower = smaller display, higher = larger display
    DISPLAY_SCALE: 0.8,  // Adjust this! (try 0.8 if 1.25x too big → 1/1.25 = 0.8)

    // Collision ratio: collision_radius = radius * COLLISION_RATIO
    // radius is display diameter, so 0.5 means collision = visual radius
    COLLISION_RATIO: 0.5,

    // radius = display diameter (visible size on screen)
    PLANETS: [
        { name: 'asteroid', ja_name: '小惑星', radius: 44, score: 1, img: 'assets/asteroid.png' },
        { name: 'moon', ja_name: '月', radius: 57, score: 3, img: 'assets/moon.png' },
        { name: 'mercury', ja_name: '水星', radius: 85, score: 6, img: 'assets/mercury.png' },
        { name: 'mars', ja_name: '火星', radius: 91, score: 10, img: 'assets/mars.png' },
        { name: 'venus', ja_name: '金星', radius: 105, score: 15, img: 'assets/venus.png' },
        { name: 'earth', ja_name: '地球', radius: 134, score: 21, img: 'assets/earth.png' },
        { name: 'neptune', ja_name: '海王星', radius: 172, score: 28, img: 'assets/neptune.png' },
        { name: 'uranus', ja_name: '天王星', radius: 210, score: 36, img: 'assets/uranus.png' },
        { name: 'saturn', ja_name: '土星', radius: 237, score: 45, img: 'assets/saturn.png' }, // Special Ring Effect
        { name: 'jupiter', ja_name: '木星', radius: 294, score: 55, img: 'assets/jupiter.png' },
        { name: 'sun', ja_name: '太陽', radius: 347, score: 66, img: 'assets/sun.png' }
    ],

    // Categories for collision filtering (if needed)
    CATEGORY_PLANET: 0x0001,
    CATEGORY_WALL: 0x0002,
};
