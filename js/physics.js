// Physics module using Matter.js

const Physics = {
    engine: null,
    world: null,

    init: function () {
        this.engine = Matter.Engine.create();
        this.world = this.engine.world;

        // Configure gravity
        this.engine.gravity.y = CONSTANTS.GRAVITY;
    },

    createWalls: function () {
        const wallOptions = {
            isStatic: true,
            friction: CONSTANTS.FRICTION,
            restitution: CONSTANTS.BOUNCINESS,
            label: 'wall'
        };
        const ground = Matter.Bodies.rectangle(
            CONSTANTS.SCREEN_WIDTH / 2,
            CONSTANTS.SCREEN_HEIGHT + CONSTANTS.WALL_THICKNESS / 2,
            CONSTANTS.SCREEN_WIDTH,
            CONSTANTS.WALL_THICKNESS,
            wallOptions
        );
        const leftWall = Matter.Bodies.rectangle(
            -CONSTANTS.WALL_THICKNESS / 2,
            CONSTANTS.SCREEN_HEIGHT / 2,
            CONSTANTS.WALL_THICKNESS,
            CONSTANTS.SCREEN_HEIGHT * 2,
            wallOptions
        );
        const rightWall = Matter.Bodies.rectangle(
            CONSTANTS.SCREEN_WIDTH + CONSTANTS.WALL_THICKNESS / 2,
            CONSTANTS.SCREEN_HEIGHT / 2,
            CONSTANTS.WALL_THICKNESS,
            CONSTANTS.SCREEN_HEIGHT * 2,
            wallOptions
        );

        Matter.World.add(this.world, [ground, leftWall, rightWall]);
    },

    createPlanetBody: function (x, y, radius, planetData) {
        // Use COLLISION_RATIO from constants (radius = display diameter)
        const collisionRadius = radius * CONSTANTS.COLLISION_RATIO;
        const body = Matter.Bodies.circle(x, y, collisionRadius, {
            restitution: CONSTANTS.BOUNCINESS,
            friction: CONSTANTS.FRICTION,
            density: 0.001, // Default, will be overridden by mass
            label: planetData.name
        });

        // FORCE SAME WEIGHT RULE
        Matter.Body.setMass(body, CONSTANTS.OBJECT_MASS);

        return body;
    },

    setupCollisionHandler: function (onMerge) {
        Matter.Events.on(this.engine, 'collisionStart', (event) => {
            const pairs = event.pairs;
            const processedBodies = new Set(); // Track bodies already merged this frame

            for (let i = 0; i < pairs.length; i++) {
                const bodyA = pairs[i].bodyA;
                const bodyB = pairs[i].bodyB;

                // Skip if either body was already processed in this frame
                if (processedBodies.has(bodyA.id) || processedBodies.has(bodyB.id)) {
                    continue;
                }

                if (bodyA.label === bodyB.label && bodyA.label !== 'wall') {
                    // Check if they are planets (labels match planet names)
                    const planetIndex = CONSTANTS.PLANETS.findIndex(p => p.name === bodyA.label);
                    if (planetIndex !== -1) {
                        // Mark both bodies as processed
                        processedBodies.add(bodyA.id);
                        processedBodies.add(bodyB.id);
                        
                        // Get next planet (null if sun - last planet)
                        const nextPlanet = planetIndex < CONSTANTS.PLANETS.length - 1 
                            ? CONSTANTS.PLANETS[planetIndex + 1] 
                            : null;
                        
                        // Merge! (pass current planet for score if sun)
                        onMerge(bodyA, bodyB, nextPlanet, CONSTANTS.PLANETS[planetIndex]);
                    }
                }
            }
        });
    }
};
