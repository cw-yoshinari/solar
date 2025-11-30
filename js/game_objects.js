// Game Objects handling Pixi.js rendering

class Planet {
    constructor(planetData, x, y, physicsBody) {
        this.data = planetData;
        this.body = physicsBody;
        this.radius = planetData.radius;

        // Container for sprite and effects
        this.container = new PIXI.Container();
        this.container.x = x;
        this.container.y = y;

        // Main Sprite
        this.sprite = PIXI.Sprite.from(planetData.img);
        this.sprite.anchor.set(0.5);
        // Image is 1024x1024, planet drawn inside. Adjust DISPLAY_SCALE in constants.js
        // radius = display diameter, sprite size adjusted by DISPLAY_SCALE
        const displayScale = CONSTANTS.DISPLAY_SCALE || 1.0;
        this.sprite.width = this.radius * 2 * displayScale;
        this.sprite.height = this.radius * 2 * displayScale;

        // Add Wobbly Shader (Simple vertex displacement simulation via mesh or filter)
        // For simplicity and performance in Pixi v7, we can use a displacement filter or just scale oscillation.
        // Let's use a simple scale oscillation for "wobbly" effect as shaders can be complex to setup without external files.
        // Or we can use a custom filter if provided. 
        // Let's try a simple "breathing" effect + rotation for now, and maybe a displacement filter if we have a noise texture.
        // Since we don't have a noise texture readily available, we'll use sine wave scaling.

        this.wobblePhase = Math.random() * Math.PI * 2;
        this.wobbleSpeed = 0.05;

        // Glow Filter
        // Requires pixi-filters
        if (PIXI.filters && PIXI.filters.GlowFilter) {
            const glowFilter = new PIXI.filters.GlowFilter({
                distance: 15,
                outerStrength: 2,
                innerStrength: 0,
                color: 0xffffff,
                quality: 0.1
            });
            this.sprite.filters = [glowFilter];
        }

        this.container.addChild(this.sprite);
    }

    update(delta) {
        if (!this.body) return;

        // Sync with physics
        this.container.x = this.body.position.x;
        this.container.y = this.body.position.y;
        this.container.rotation = this.body.angle;

        // Wobbly effect (Scaling)
        this.wobblePhase += this.wobbleSpeed;
        const scaleWobble = 1 + Math.sin(this.wobblePhase) * 0.02;
        // Adjust DISPLAY_SCALE in constants.js to match visual size with radius
        const displayScale = CONSTANTS.DISPLAY_SCALE || 1.0;
        this.sprite.scale.set(
            (this.radius * 2 * displayScale / this.sprite.texture.width) * scaleWobble,
            (this.radius * 2 * displayScale / this.sprite.texture.height) * (1 / scaleWobble)
        );
    }

    destroy() {
        this.container.destroy({ children: true });
    }
}
