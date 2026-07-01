const loadingGif = document.querySelectorAll('.loading-gif');

const mobileDevice = isMobileDevice();

const screenWidth = window.innerWidth;
const screenHeight = window.innerHeight * 1.1;
const urlParams = new URLSearchParams(window.location.search);
const GAME_CAMERA_ZOOM = 1;
const GAME_CAMERA_FOLLOW_OFFSET_Y = typeof window.themeConfig !== 'undefined' && window.themeConfig.mode === 'custom'
    ? screenHeight * 0.14
    : 0;
const DEFAULT_LEVEL_MODE = 'fixed';
const LEVEL_MODE = (window.localStorage.getItem('level-mode') || DEFAULT_LEVEL_MODE).toLowerCase();
const DEBUG_START_NEAR_GOAL = urlParams.get('start') === 'goal' || window.localStorage.getItem('debug-start-near-goal') === 'true';
const resolveAssetPath = typeof resolveThemeAssetPath === 'function'
    ? resolveThemeAssetPath
    : function (_assetKey, classicPath) { return classicPath; };
const resolveDecorationScale = window.themeConfig?.resolveThemeDecorationScale
    ? window.themeConfig.resolveThemeDecorationScale
    : function (_assetKey, baseScale = 1) { return baseScale; };
const isCustomThemeMode = typeof window.themeConfig !== 'undefined' && window.themeConfig.mode === 'custom';

const ALERT_WEATHER_CONFIG = {
    overworldSkyColor: 0x6f7696,
    intenseSkyColor: 0x555c78,
    lightningThresholdMm: 200,
    rainAlpha: 0.2,
    intenseRainAlpha: 0.34,
    rainScrollX: 90,
    rainScrollY: 560,
    minLightningDelayMs: 2200,
    maxLightningDelayMs: 4800
};

window.ALERT_WEATHER_CONFIG = ALERT_WEATHER_CONFIG;

const EVACUATION_CROWD_ASSET_KEYS = Array.from({ length: 12 }, (_, index) => `evacuation-citizen-${index + 1}`);

const velocityX = screenWidth / 4.5;
const velocityY = screenHeight / 1.15;
const jumpVelocity = velocityY;

const levelGravity = velocityY * 2;

var config = {
    type: Phaser.AUTO,
    width: screenWidth,
    height: screenHeight,
    backgroundColor: isCustomThemeMode ? ALERT_WEATHER_CONFIG.overworldSkyColor : 0x8585FF,
    parent: 'game',
    preserveDrawingBuffer: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: levelGravity },
            debug: false
        }
    },
    scene: {
        key: 'level-1',
        preload: preload,
        create: create,
        update: update
    },
    version: '0.7.3'
};

const defaultWorldWidth = screenWidth * 11;
const platformHeight = screenHeight / 5;
const DEFAULT_ALERT_CONFIG = {
    streamName: '示範土石流潛勢溪流',
    yellowAlertMm: 250,
    redAlertMm: 300,
    responseCenterName: '農村水保署土石流防災應變中心',
    alertPublisherName: '\u8b66\u5831\u767c\u5e03\u5668'
};

const startOffset = screenWidth / 2.5;

// Hole with is calculated dividing the world width in x holes of the same size.
const platformPieces = 100;
var worldWidth = defaultWorldWidth;
var platformPiecesWidth = (worldWidth - screenWidth) / platformPieces;

var isLevelOverworld;
var activeLevelData = null;

// Create empty holes array, every hole will have their object with the hole start and end
var worldHolesCoords = [];

var emptyBlocksList = [];

var player;
var playerController;
var playerState = 0;
var playerInvulnerable = false;
var playerBlocked = false;
var playerFiring = false;
var fireInCooldown = false;
var furthestPlayerPos = 0;

var flagRaised = false;

var controlKeys = {
    JUMP: null,
    DOWN: null,
    LEFT: null,
    LEFT_ALT: null,
    RIGHT: null,
    RIGHT_ALT: null,
    FIRE: null,
    PAUSE: null

};

var score = 0;
var rainfallAccumulated = 0;
var activeAlertConfig = { ...DEFAULT_ALERT_CONFIG };
var yellowAlertIssued = false;
var redAlertIssued = false;
var totalCitizensToEvacuate = 0;
var evacuatedCitizensCount = 0;
var totalDataPointsToCollect = 0;
var collectedDataPointsCount = 0;
var gameOverReason = '';

var levelStarted = false;
var reachedLevelEnd = false;
var missionIntroPending = false;
var pendingMissionStartScene = null;

var smoothedControls;
var gameOver = false;
var gameWinned = false;

var game = new Phaser.Game(config);

function getUiViewportWidth() {
    return screenWidth / GAME_CAMERA_ZOOM;
}

function getUiViewportHeight() {
    return screenHeight / GAME_CAMERA_ZOOM;
}

function syncWorldMetrics(customWidth = defaultWorldWidth) {
    worldWidth = customWidth;
    platformPiecesWidth = (worldWidth - screenWidth) / platformPieces;
}

function scaleLevelCollection(collection, transform) {
    if (!Array.isArray(collection)) {
        return [];
    }

    return collection.map((item) => transform({ ...item }));
}

function normalizeFixedLevelData(levelData) {
    if (!levelData) {
        return null;
    }

    const sourceViewportWidth = levelData.sourceViewport?.width || (levelData.world?.width ? levelData.world.width / 11 : screenWidth);
    const sourceViewportHeight = levelData.sourceViewport?.height || levelData.world?.height || screenHeight;
    const scaleX = screenWidth / sourceViewportWidth;
    const scaleY = screenHeight / sourceViewportHeight;
    const shouldUseMudBoulder = window.themeConfig?.mode === 'custom' && levelData.name === 'Original Generator Snapshot A';
    const selectedPlayerStart = DEBUG_START_NEAR_GOAL && levelData.debugPlayerStart
        ? levelData.debugPlayerStart
        : levelData.playerStart;

    const scaleNumber = (value, scale, round = true) => {
        if (typeof value !== 'number') {
            return value;
        }

        const scaledValue = value * scale;
        return round ? Math.round(scaledValue) : scaledValue;
    };

    return {
        ...levelData,
        sourceViewport: {
            width: sourceViewportWidth,
            height: sourceViewportHeight
        },
        world: {
            ...levelData.world,
            width: scaleNumber(levelData.world.width, scaleX),
            height: scaleNumber(levelData.world.height, scaleY, false)
        },
        playerStart: {
            ...selectedPlayerStart,
            x: scaleNumber(selectedPlayerStart.x, scaleX),
            y: scaleNumber(selectedPlayerStart.y, scaleY, false)
        },
        debugPlayerStart: levelData.debugPlayerStart ? {
            ...levelData.debugPlayerStart,
            x: scaleNumber(levelData.debugPlayerStart.x, scaleX),
            y: scaleNumber(levelData.debugPlayerStart.y, scaleY, false)
        } : undefined,
        officialPlayerStart: {
            ...levelData.playerStart,
            x: scaleNumber(levelData.playerStart.x, scaleX),
            y: scaleNumber(levelData.playerStart.y, scaleY, false)
        },
        goal: {
            ...levelData.goal,
            flagMastX: scaleNumber(levelData.goal.flagMastX, scaleX),
            castleX: scaleNumber(levelData.goal.castleX, scaleX),
            responseCenterX: scaleNumber(levelData.goal.responseCenterX, scaleX)
        },
        groundSegments: scaleLevelCollection(levelData.groundSegments, (segment) => ({
            ...segment,
            x: scaleNumber(segment.x, scaleX),
            width: scaleNumber(segment.width, scaleX)
        })),
        holes: scaleLevelCollection(levelData.holes, (hole) => ({
            ...hole,
            start: scaleNumber(hole.start, scaleX),
            end: scaleNumber(hole.end, scaleX)
        })),
        blocks: scaleLevelCollection(levelData.blocks, (block) => ({
            ...block,
            x: scaleNumber(block.x, scaleX),
            y: scaleNumber(block.y, scaleY, false),
            width: scaleNumber(block.width, scaleX),
            height: scaleNumber(block.height, scaleY)
        })),
        brickBlocks: scaleLevelCollection(levelData.brickBlocks, (block) => ({
            ...block,
            x: scaleNumber(block.x, scaleX),
            y: scaleNumber(block.y, scaleY, false)
        })),
        questionBlocks: scaleLevelCollection(levelData.questionBlocks, (block) => ({
            ...block,
            x: scaleNumber(block.x, scaleX),
            y: scaleNumber(block.y, scaleY, false)
        })),
        pipes: scaleLevelCollection(levelData.pipes, (pipe) => ({
            ...pipe,
            x: scaleNumber(pipe.x, scaleX),
            y: scaleNumber(pipe.y, scaleY, false),
            width: scaleNumber(pipe.width, scaleX),
            height: scaleNumber(pipe.height, scaleY)
        })),
        enemies: scaleLevelCollection(levelData.enemies, (enemy) => ({
            ...enemy,
            type: shouldUseMudBoulder && enemy.type === 'goomba' ? 'mud-boulder' : enemy.type,
            x: scaleNumber(enemy.x, scaleX),
            y: scaleNumber(enemy.y, scaleY, false)
        })),
        collectibles: scaleLevelCollection(levelData.collectibles, (collectible) => ({
            ...collectible,
            x: scaleNumber(collectible.x, scaleX),
            y: scaleNumber(collectible.y, scaleY, false)
        })),
        decorations: scaleLevelCollection(levelData.decorations, (decoration) => ({
            ...decoration,
            x: scaleNumber(decoration.x, scaleX),
            y: scaleNumber(decoration.y, scaleY, false),
            width: scaleNumber(decoration.width, scaleX),
            height: scaleNumber(decoration.height, scaleY),
            scale: typeof decoration.scale === 'number' ? decoration.scale * scaleY : decoration.scale
        }))
    };
}

function configureAlertState(levelData = null) {
    const levelAlert = levelData?.alert || {};
    const redAlertMm = typeof levelAlert.redAlertMm === 'number' ? levelAlert.redAlertMm : DEFAULT_ALERT_CONFIG.redAlertMm;
    const yellowAlertMm = typeof levelAlert.yellowAlertMm === 'number'
        ? levelAlert.yellowAlertMm
        : Math.max(0, redAlertMm - 50);

    activeAlertConfig = {
        ...DEFAULT_ALERT_CONFIG,
        ...levelAlert,
        yellowAlertMm,
        redAlertMm
    };
}

function hasReachedYellowAlert() {
    return rainfallAccumulated >= activeAlertConfig.yellowAlertMm;
}

function hasReachedRedAlert() {
    return rainfallAccumulated >= activeAlertConfig.redAlertMm;
}

function getAlertSkyColor() {
    if (!isLevelOverworld || !isCustomThemeMode) {
        return isLevelOverworld ? 0x8585FF : 0x000000;
    }

    return rainfallAccumulated >= ALERT_WEATHER_CONFIG.lightningThresholdMm
        ? ALERT_WEATHER_CONFIG.intenseSkyColor
        : ALERT_WEATHER_CONFIG.overworldSkyColor;
}

function ensureAlertRainTexture(scene) {
    if (scene.textures.exists('alert-rain-streak')) {
        return;
    }

    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
    graphics.clear();
    graphics.fillStyle(0xffffff, 0);
    graphics.fillRect(0, 0, 64, 64);
    graphics.lineStyle(2, 0xd7ecff, 0.7);
    graphics.beginPath();
    graphics.moveTo(10, 0);
    graphics.lineTo(0, 18);
    graphics.moveTo(28, 8);
    graphics.lineTo(16, 28);
    graphics.moveTo(44, -2);
    graphics.lineTo(32, 18);
    graphics.moveTo(58, 10);
    graphics.lineTo(46, 30);
    graphics.moveTo(22, 36);
    graphics.lineTo(10, 56);
    graphics.moveTo(48, 40);
    graphics.lineTo(36, 60);
    graphics.strokePath();
    graphics.generateTexture('alert-rain-streak', 64, 64);
    graphics.destroy();
}

function scheduleNextLightning(scene, delay = null) {
    scene.nextLightningAt = scene.time.now + (delay ?? Phaser.Math.Between(
        ALERT_WEATHER_CONFIG.minLightningDelayMs,
        ALERT_WEATHER_CONFIG.maxLightningDelayMs
    ));
}

function triggerAlertLightning(scene) {
    if (!scene.lightningOverlay || gameOver || gameWinned) {
        return;
    }

    scene.lastLightningTriggeredAt = scene.time.now;
    scene.lightningOverlay.alpha = 0;

    scene.tweens.killTweensOf(scene.lightningOverlay);
    scene.tweens.add({
        targets: scene.lightningOverlay,
        alpha: 0.68,
        duration: 80,
        yoyo: true,
        repeat: 1,
        onComplete: function () {
            scene.lightningOverlay.alpha = 0;
        }
    });

    scene.cameras.main.flash(120, 230, 240, 255, false);
    scheduleNextLightning(scene);
}

function syncAlertWeatherVisuals() {
    if (!isCustomThemeMode || !isLevelOverworld) {
        return;
    }

    if (this.alertSky) {
        this.alertSky.fillColor = getAlertSkyColor();
        this.alertSky.fillAlpha = 1;
    }

    if (this.alertRainLayer) {
        this.alertRainLayer.alpha = rainfallAccumulated >= ALERT_WEATHER_CONFIG.lightningThresholdMm
            ? ALERT_WEATHER_CONFIG.intenseRainAlpha
            : ALERT_WEATHER_CONFIG.rainAlpha;
    }
}

function createAlertWeatherEffects() {
    if (!isCustomThemeMode || !isLevelOverworld) {
        return;
    }

    ensureAlertRainTexture(this);

    this.alertRainLayer = this.add.tileSprite(0, 0, worldWidth, screenHeight, 'alert-rain-streak')
        .setOrigin(0)
        .setDepth(1.4);
    this.alertRainLayer.alpha = ALERT_WEATHER_CONFIG.rainAlpha;

    this.lightningOverlay = this.add.rectangle(0, 0, screenWidth, screenHeight, 0xe9f1ff)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(8);
    this.lightningOverlay.alpha = 0;

    this.lastLightningTriggeredAt = null;
    scheduleNextLightning(this, ALERT_WEATHER_CONFIG.maxLightningDelayMs);
    syncAlertWeatherVisuals.call(this);
}

function updateAlertWeatherEffects(delta) {
    if (!isCustomThemeMode || !isLevelOverworld || !this.alertRainLayer) {
        return;
    }

    const seconds = delta / 1000;
    this.alertRainLayer.tilePositionX -= ALERT_WEATHER_CONFIG.rainScrollX * seconds;
    this.alertRainLayer.tilePositionY += ALERT_WEATHER_CONFIG.rainScrollY * seconds;

    if (!gameOver && !gameWinned && rainfallAccumulated >= ALERT_WEATHER_CONFIG.lightningThresholdMm && this.time.now >= this.nextLightningAt) {
        triggerAlertLightning(this);
    }
}

function resetGameplayState() {
    worldHolesCoords = [];
    emptyBlocksList = [];
    playerState = 0;
    playerInvulnerable = false;
    playerBlocked = false;
    playerFiring = false;
    fireInCooldown = false;
    furthestPlayerPos = 0;
    flagRaised = false;
    score = 0;
    rainfallAccumulated = 0;
    activeAlertConfig = { ...DEFAULT_ALERT_CONFIG };
    yellowAlertIssued = false;
    redAlertIssued = false;
    totalCitizensToEvacuate = 0;
    evacuatedCitizensCount = 0;
    totalDataPointsToCollect = 0;
    collectedDataPointsCount = 0;
    gameOverReason = '';
    levelStarted = false;
    reachedLevelEnd = false;
    gameOver = false;
    gameWinned = false;
}

function beginFixedLevelRun() {
    const camera = this.cameras.main;

    camera.stopFollow();
    camera.setScroll(0, 0);
    camera.setZoom(GAME_CAMERA_ZOOM);
    camera.followOffset.set(0, GAME_CAMERA_FOLLOW_OFFSET_Y);
    camera.startFollow(player, true, 0.08, 0.05);
    camera.isFollowing = true;

    createHUD.call(this);
    updateTimer.call(this);

    levelStarted = true;
    furthestPlayerPos = player.x;
}

function shouldWaitForMissionIntro() {
    const intro = document.getElementById('mission-intro');
    return !!intro && !intro.classList.contains('is-hidden');
}

function pauseForMissionIntro(scene) {
    missionIntroPending = true;
    pendingMissionStartScene = scene;

    if (scene.physics && scene.physics.world) {
        scene.physics.world.pause();
    }
}

function startPendingMissionRun() {
    if (!pendingMissionStartScene) {
        return false;
    }

    const scene = pendingMissionStartScene;

    missionIntroPending = false;
    pendingMissionStartScene = null;

    if (scene.physics && scene.physics.world) {
        scene.physics.world.resume();
    }

    if (scene.input) {
        scene.input.enabled = true;
        if (scene.input.keyboard) {
            scene.input.keyboard.enabled = true;
        }
    }

    if (activeLevelData && !activeLevelData.useOriginalStartSequence && !levelStarted) {
        beginFixedLevelRun.call(scene);
    }

    return true;
}

window.startMissionFromIntro = startPendingMissionRun;

function showInteractionLabel(target, message, color = '#ffffff') {
    if (!target || !this.add) {
        return;
    }

    const bounds = typeof target.getBounds === 'function' ? target.getBounds() : null;
    const x = bounds ? bounds.centerX : target.x;
    const y = bounds ? bounds.top - screenHeight / 42 : target.y - screenHeight / 16;

    const label = this.add.text(x, y, message, {
        fontFamily: '"Microsoft JhengHei", "Noto Sans TC", sans-serif',
        fontSize: Math.max(15, screenWidth / 105),
        color,
        fontStyle: 'bold',
        align: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.56)',
        padding: { left: 8, right: 8, top: 3, bottom: 3 }
    }).setOrigin(0.5).setDepth(9);

    this.tweens.add({
        targets: label,
        y: y - screenHeight / 14,
        alpha: 0,
        duration: 820,
        ease: 'Quad.Out',
        onComplete: () => label.destroy()
    });
}

function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Source: https://github.com/photonstorm/phaser3-examples/blob/master/public/src/tilemap/collision/matter%20destroy%20tile%20bodies.js#L35

var SmoothedHorionztalControl = new Phaser.Class({

    initialize:

    function SmoothedHorionztalControl(speed) {
            this.msSpeed = speed;
            this.value = 0;
    },

    moveLeft: function(delta) {
        if (this.value > 0) { this.reset(); }
        this.value -= this.msSpeed * 3.5;
        if (this.value < -1) { this.value = -1; }
        playerController.time.rightDown += delta;
    },

    moveRight: function(delta) {
        if (this.value < 0) { this.reset(); }
        this.value += this.msSpeed * 3.5;
        if (this.value > 1) { this.value = 1; }
        playerController.time.leftDown += delta;
    },

    reset: function() {
        this.value = 0;
    }
});

function preload() {
    activeLevelData = LEVEL_MODE === 'fixed' && typeof LEVEL_1 !== 'undefined' ? normalizeFixedLevelData(LEVEL_1) : null;
    syncWorldMetrics(activeLevelData ? activeLevelData.world.width : defaultWorldWidth);

    var progressBox = this.add.graphics();
    var progressBar = this.add.graphics();
    progressBox.fillStyle(0x222222, 1);
    progressBox.fillRoundedRect(screenWidth / 2.48, screenHeight / 2 * 1.05, screenWidth / 5.3, screenHeight / 20.7, 10);
    
    var width = this.cameras.main.width;
    var height = this.cameras.main.height;
    
    var percentText = this.make.text({
        x: width / 2,
        y: height / 2 * 1.25,
        text: '0%',
        style: {
            font: screenWidth / 96 + 'px pixel_nums',
            fill: '#ffffff'
        }
    });
    percentText.setOrigin(0.5, 0.5);
    
    this.load.on('progress', function (value) {
        percentText.setText(value * 99 >= 99 ? 'Generating world...' : 'Loading... ' + parseInt(value * 99) + '%');
        progressBar.clear();
        progressBar.fillStyle(0xffffff, 1);
        progressBar.fillRoundedRect(screenWidth / 2.45, screenHeight / 2 * 1.07, screenWidth / 5.6 * value, screenHeight / 34.5, 5);
    });
    
    this.load.on('complete', function () {
        progressBar.destroy();
        progressBox.destroy();
        percentText.destroy();
        loadingGif.forEach(gif => {gif.style.display = 'none';});
    });

    // Load Fonts
    this.load.bitmapFont('carrier_command', 'assets/fonts/carrier_command.png', 'assets/fonts/carrier_command.xml');

    // Load plugins
    this.load.plugin('rexvirtualjoystickplugin', 'vendor/rex/rexvirtualjoystickplugin.min.js', true);
    this.load.plugin('rexcheckboxplugin', 'vendor/rex/rexcheckboxplugin.min.js', true);
    this.load.plugin('rexsliderplugin', 'vendor/rex/rexsliderplugin.min.js', true);
    this.load.plugin('rexkawaseblurpipelineplugin', 'vendor/rex/rexkawaseblurpipelineplugin.min.js', true);

    isLevelOverworld = activeLevelData ? activeLevelData.theme !== 'underground' : Phaser.Math.Between(0, 100) <= 84;

    let levelStyle = isLevelOverworld ? 'overworld' : 'underground';

    // Load entities sprites
    const marioFrameConfig = isCustomThemeMode
        ? { frameWidth: 48, frameHeight: 48 }
        : { frameWidth: 18, frameHeight: 16 };
    const marioGrownFrameConfig = isCustomThemeMode
        ? { frameWidth: 48, frameHeight: 64 }
        : { frameWidth: 18, frameHeight: 32 };
    const marioFireFrameConfig = isCustomThemeMode
        ? { frameWidth: 48, frameHeight: 64 }
        : { frameWidth: 18, frameHeight: 32 };
    this.load.spritesheet('mario', resolveAssetPath('mario', 'assets/entities/mario.png'), marioFrameConfig);
    this.load.spritesheet('mario-grown', resolveAssetPath('mario-grown', 'assets/entities/mario-grown.png'), marioGrownFrameConfig);
    this.load.spritesheet('mario-fire', resolveAssetPath('mario-fire', 'assets/entities/mario-fire.png'), marioFireFrameConfig);
    this.load.spritesheet('goomba', 'assets/entities/' + levelStyle + '/goomba.png', { frameWidth: 16, frameHeight: 16 });
    this.load.image('mud-boulder-0', 'assets/custom/entities/mud-boulder-frames/mud-boulder-0.png?v=phase10-enemy-2');
    this.load.image('mud-boulder-1', 'assets/custom/entities/mud-boulder-frames/mud-boulder-1.png?v=phase10-enemy-2');
    this.load.image('mud-boulder-2', 'assets/custom/entities/mud-boulder-frames/mud-boulder-2.png?v=phase10-enemy-2');
    this.load.image('mud-boulder-3', 'assets/custom/entities/mud-boulder-frames/mud-boulder-3.png?v=phase10-enemy-2');
    this.load.image('mud-boulder-4', 'assets/custom/entities/mud-boulder-frames/mud-boulder-4.png?v=phase10-enemy-2');
    this.load.image('wandering-citizen-idle', 'assets/custom/entities/wandering-citizen-frames/wandering-citizen-idle.png?v=phase10-citizen-1');
    this.load.image('wandering-citizen-walk-0', 'assets/custom/entities/wandering-citizen-frames/wandering-citizen-walk-0.png?v=phase10-citizen-1');
    this.load.image('wandering-citizen-walk-1', 'assets/custom/entities/wandering-citizen-frames/wandering-citizen-walk-1.png?v=phase10-citizen-1');
    this.load.image('wandering-citizen-walk-2', 'assets/custom/entities/wandering-citizen-frames/wandering-citizen-walk-2.png?v=phase10-citizen-1');
    this.load.image('wandering-citizen-walk-3', 'assets/custom/entities/wandering-citizen-frames/wandering-citizen-walk-3.png?v=phase10-citizen-1');
    this.load.image('wandering-citizen-cover', 'assets/custom/entities/wandering-citizen-frames/wandering-citizen-cover.png?v=phase10-citizen-1');
    this.load.image('wandering-citizen-evacuate-0', 'assets/custom/entities/wandering-citizen-frames/wandering-citizen-evacuate-0.png?v=phase10-citizen-1');
    this.load.image('wandering-citizen-evacuate-1', 'assets/custom/entities/wandering-citizen-frames/wandering-citizen-evacuate-1.png?v=phase10-citizen-1');
    this.load.image('wandering-citizen-evacuate-2', 'assets/custom/entities/wandering-citizen-frames/wandering-citizen-evacuate-2.png?v=phase10-citizen-1');
    this.load.image('wandering-citizen-evacuate-3', 'assets/custom/entities/wandering-citizen-frames/wandering-citizen-evacuate-3.png?v=phase10-citizen-1');
    this.load.spritesheet('koopa', 'assets/entities/koopa.png', { frameWidth: 16, frameHeight: 24 });
    this.load.spritesheet('shell', 'assets/entities/shell.png', { frameWidth: 16, frameHeight: 15 });

    // Load objects sprites
    const fireballFrameConfig = isCustomThemeMode
        ? { frameWidth: 32, frameHeight: 32 }
        : { frameWidth: 8, frameHeight: 8 };
    this.load.spritesheet('fireball', resolveAssetPath('fireball', 'assets/entities/fireball.png'), fireballFrameConfig);
    this.load.spritesheet('fireball-explosion', 'assets/entities/fireball-explosion.png', { frameWidth: 16, frameHeight: 16 });

    // Load props
    this.load.image('cloud1', resolveAssetPath('cloud1', 'assets/scenery/overworld/cloud1.png'));
    this.load.image('cloud2', resolveAssetPath('cloud2', 'assets/scenery/overworld/cloud2.png'));
    this.load.image('mountain1', resolveAssetPath('mountain1', 'assets/scenery/overworld/mountain1.png'));
    this.load.image('mountain2', resolveAssetPath('mountain2', 'assets/scenery/overworld/mountain2.png'));
    this.load.image('fence', resolveAssetPath('fence', 'assets/scenery/overworld/fence.png'));
    this.load.image('bush1', resolveAssetPath('bush1', 'assets/scenery/overworld/bush1.png'));
    this.load.image('bush2', resolveAssetPath('bush2', 'assets/scenery/overworld/bush2.png'));
    this.load.image('castle', resolveAssetPath('castle', 'assets/scenery/castle.png'));
    this.load.image('flag-mast', resolveAssetPath('flag-mast', 'assets/scenery/flag-mast.png'));
    this.load.image('final-flag', resolveAssetPath('final-flag', 'assets/scenery/final-flag.png'));
    this.load.image('sign', resolveAssetPath('sign', 'assets/scenery/sign.png'));
    EVACUATION_CROWD_ASSET_KEYS.forEach((assetKey, index) => {
        this.load.image(assetKey, `assets/custom/scenery/evacuation-crowd/citizen-${index + 1}.png`);
    });

    // Load tubes
    this.load.image('horizontal-tube', resolveAssetPath('horizontal-tube', 'assets/scenery/horizontal-tube.png'));
    this.load.image('horizontal-final-tube', resolveAssetPath('horizontal-final-tube', 'assets/scenery/horizontal-final-tube.png'));
    this.load.image('vertical-extralarge-tube', resolveAssetPath('vertical-extralarge-tube', 'assets/scenery/vertical-large-tube.png'));
    this.load.image('vertical-small-tube', resolveAssetPath('vertical-small-tube', 'assets/scenery/vertical-small-tube.png'));
    this.load.image('vertical-medium-tube', resolveAssetPath('vertical-medium-tube', 'assets/scenery/vertical-medium-tube.png'));
    this.load.image('vertical-large-tube', resolveAssetPath('vertical-large-tube', 'assets/scenery/vertical-large-tube.png'));

    
    // Load HUD images
    this.load.image('gear', 'assets/hud/gear.png');
    this.load.image('settings-bubble', 'assets/hud/settings-bubble.png');

    this.load.spritesheet('npc', 'assets/hud/npc.png', { frameWidth: 16, frameHeight: 24 });

    // Load platform bricks and structures
    this.load.image('floorbricks', resolveAssetPath('floorbricks', 'assets/scenery/' + levelStyle + '/floorbricks.png'));
    this.load.image('start-floorbricks', resolveAssetPath('start-floorbricks', 'assets/scenery/overworld/floorbricks.png'));
    this.load.image('ground-grass-top', 'assets/custom/scenery/overworld/ground-grass-top.png?v=phase12-ground-1');
    this.load.image('ground-gravel-fill', 'assets/custom/scenery/overworld/ground-gravel-fill.png?v=phase12-ground-1');
    this.load.image('block', resolveAssetPath('block', 'assets/blocks/' + levelStyle + '/block.png'));
    this.load.image('block2', 'assets/blocks/underground/block2.png');
    this.load.image('emptyBlock', resolveAssetPath('emptyBlock', 'assets/blocks/' + levelStyle + '/emptyBlock.png'));
    this.load.image('immovableBlock', resolveAssetPath('immovableBlock', 'assets/blocks/' + levelStyle + '/immovableBlock.png'));
    this.load.image('sandbag-step', 'assets/custom/blocks/overworld/sandbag-step.png');
    this.load.spritesheet('brick-debris', 'assets/blocks/' + levelStyle + '/brick-debris.png', { frameWidth: 8, frameHeight: 8 });
    this.load.spritesheet('mistery-block', resolveAssetPath('mistery-block', 'assets/blocks/' + levelStyle + '/misteryBlock.png'), { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('custom-block', 'assets/blocks/overworld/customBlock.png', { frameWidth: 16, frameHeight: 16 });

    // Load collectibles
    this.load.spritesheet('coin', resolveAssetPath('coin', 'assets/collectibles/coin.png'), { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('ground-coin', resolveAssetPath('ground-coin', 'assets/collectibles/underground/ground-coin.png'), { frameWidth: 10, frameHeight: 14 });
    this.load.spritesheet(
        'fire-flower',
        resolveAssetPath('fire-flower', 'assets/collectibles/' + levelStyle + '/fire-flower.png'),
        isCustomThemeMode ? { frameWidth: 32, frameHeight: 32 } : { frameWidth: 16, frameHeight: 16 }
    );
    this.load.image('live-mushroom', resolveAssetPath('live-mushroom', 'assets/collectibles/live-mushroom.png'));
    this.load.image('super-mushroom', resolveAssetPath('super-mushroom', 'assets/collectibles/super-mushroom.png'));


    // Load sounds and music
    this.load.audio('music', 'assets/sound/music/custom/red-alert-sprint.mp3?v=phase13-red-alert-music-1');
    this.load.audio('underground-music', 'assets/sound/music/underground/theme.mp3');
    this.load.audio('hurry-up-music', 'assets/sound/music/' + levelStyle +'/hurry-up-theme.mp3');
    this.load.audio('gameoversong', 'assets/sound/music/gameover.mp3');
    this.load.audio('win', 'assets/sound/music/win.wav');
    this.load.audio('jumpsound', 'assets/sound/effects/jump.mp3');
    this.load.audio('coin', 'assets/sound/effects/coin.mp3');
    this.load.audio('powerup-appears', 'assets/sound/effects/powerup-appears.mp3');
    this.load.audio('consume-powerup', 'assets/sound/effects/consume-powerup.mp3');
    this.load.audio('powerdown', 'assets/sound/effects/powerdown.mp3');
    this.load.audio('goomba-stomp', 'assets/sound/effects/goomba-stomp.wav');
    this.load.audio('flagpole', 'assets/sound/effects/flagpole.mp3');
    this.load.audio('fireball', 'assets/sound/effects/fireball.mp3');
    this.load.audio('kick', 'assets/sound/effects/kick.mp3');
    this.load.audio('time-warning', 'assets/sound/effects/time-warning.mp3');
    this.load.audio('here-we-go', Phaser.Math.Between(0, 100) < 98 ? 'assets/sound/effects/here-we-go.mp3' : 'assets/sound/effects/cursed-here-we-go.mp3');
    this.load.audio('pauseSound', 'assets/sound/effects/pause.wav');
    this.load.audio('block-bump', 'assets/sound/effects/block-bump.wav');
    this.load.audio('break-block', 'assets/sound/effects/break-block.wav');
}

function initSounds() {
    this.musicGroup = this.add.group();
    this.effectsGroup = this.add.group();

    this.musicTheme = this.sound.add('music', { volume: 0.15 });
    this.musicTheme.play({ loop: -1 });
    this.musicGroup.add(this.musicTheme);

    this.undergroundMusicTheme = this.sound.add('underground-music', { volume: 0.15 });
    this.musicGroup.add(this.undergroundMusicTheme);

    this.hurryMusicTheme = this.sound.add('hurry-up-music', { volume: 0.15 });
    this.musicGroup.add(this.hurryMusicTheme);

    this.gameOverSong = this.sound.add('gameoversong', { volume: 0.3 });
    this.musicGroup.add(this.gameOverSong);
        
    this.winSound = this.sound.add('win', { volume: 0.3 });
    this.musicGroup.add(this.winSound);

    this.jumpSound = this.sound.add('jumpsound', { volume: 0.10 });
    this.effectsGroup.add(this.jumpSound);

    this.coinSound = this.sound.add('coin', { volume: 0.2 });
    this.effectsGroup.add(this.coinSound);

    this.powerUpAppearsSound = this.sound.add('powerup-appears', { volume: 0.2 });
    this.effectsGroup.add(this.powerUpAppearsSound);

    this.consumePowerUpSound = this.sound.add('consume-powerup', { volume: 0.2 });
    this.effectsGroup.add(this.consumePowerUpSound);

    this.powerDownSound = this.sound.add('powerdown', { volume: 0.3 });
    this.effectsGroup.add(this.powerDownSound);

    this.goombaStompSound = this.sound.add('goomba-stomp', { volume: 1 });
    this.effectsGroup.add(this.goombaStompSound);

    this.flagPoleSound = this.sound.add('flagpole', { volume: 0.3 });
    this.effectsGroup.add(this.flagPoleSound);

    this.fireballSound = this.sound.add('fireball', { volume: 0.3 });
    this.effectsGroup.add(this.fireballSound);

    this.kickSound = this.sound.add('kick', { volume: 0.3 });
    this.effectsGroup.add(this.kickSound);

    this.timeWarningSound = this.sound.add('time-warning', { volume: 0.2 });
    this.effectsGroup.add(this.timeWarningSound);

    this.hereWeGoSound = this.sound.add('here-we-go', { volume: 0.17 });
    this.effectsGroup.add(this.hereWeGoSound);

    this.pauseSound = this.sound.add('pauseSound', { volume: 0.17 });
    this.effectsGroup.add(this.pauseSound);

    this.blockBumpSound = this.sound.add('block-bump', { volume: 0.3 });
    this.effectsGroup.add(this.blockBumpSound);

    this.breakBlockSound = this.sound.add('break-block', { volume: 0.5 });
    this.effectsGroup.add(this.breakBlockSound);
}

function create() {
    resetGameplayState();
    configureAlertState(activeLevelData);

    playerController = {
        time: {
            leftDown: 0,
            rightDown: 0
        },
        direction: {
            positive: true
        },
        speed: {
            run: velocityX,
        }
    };

    this.physics.world.setBounds(0, 0, worldWidth, screenHeight);

    // Create camera
    this.cameras.main.setBounds(0, 0, worldWidth, screenHeight);
    this.cameras.main.setZoom(GAME_CAMERA_ZOOM);
    this.cameras.main.followOffset.set(0, GAME_CAMERA_FOLLOW_OFFSET_Y);
    this.cameras.main.isFollowing = false;
    //this.cameras.main.followOffset.set(startOffset / 6, 0);

    initSounds.call(this);

    createAnimations.call(this);
    createPlayer.call(this);
    createAlertWeatherEffects.call(this);

    if (activeLevelData) {
        loadFixedLevel.call(this, activeLevelData);
        if (activeLevelData.useOriginalStartSequence) {
            drawStartScreen.call(this);
        } else if (shouldWaitForMissionIntro()) {
            pauseForMissionIntro(this);
        } else {
            beginFixedLevelRun.call(this);
        }
    } else {
        generateLevel.call(this);
        drawWorld.call(this);
        drawStartScreen.call(this);
        createGoombas.call(this);
    }

    createControls.call(this);
    applySettings.call(this);

    if (missionIntroPending && pendingMissionStartScene === this && this.input) {
        this.input.enabled = false;
        if (this.input.keyboard) {
            this.input.keyboard.enabled = false;
        }
    }

    if (window.missionIntroStartRequested === true) {
        startPendingMissionRun();
    }
    
    smoothedControls = new SmoothedHorionztalControl(0.001);
}

function createControls() {

    this.joyStick = this.plugins.get('rexvirtualjoystickplugin').add(this, {
        x: screenWidth * 0.118,
        y: screenHeight / 1.68,
        radius: mobileDevice ? 100 : 0,
        base: this.add.circle(0, 0, mobileDevice ? 75 : 0, 0x0000000, 0.05),
        thumb: this.add.circle(0, 0, mobileDevice ? 25 : 0, 0xcccccc, 0.2),
        // dir: '8dir',   // 'up&down'|0|'left&right'|1|'4dir'|2|'8dir'|3
        // forceMin: 16,
        // enable: true
    });

    // Set control keys

    const keyNames = ['JUMP', 'DOWN', 'LEFT', 'RIGHT', 'FIRE', 'PAUSE'];
    const defaultCodes = [Phaser.Input.Keyboard.KeyCodes.SPACE, Phaser.Input.Keyboard.KeyCodes.S, Phaser.Input.Keyboard.KeyCodes.A, Phaser.Input.Keyboard.KeyCodes.D, Phaser.Input.Keyboard.KeyCodes.Q, Phaser.Input.Keyboard.KeyCodes.ESC];
    
    keyNames.forEach((keyName, i) => {
      const keyCode = localStorage.getItem(keyName) ? Number(localStorage.getItem(keyName)) : defaultCodes[i];
      controlKeys[keyName] = this.input.keyboard.addKey(keyCode);
    });

    controlKeys.LEFT_ALT = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    controlKeys.RIGHT_ALT = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);

    /*
    controlKeys.PAUSE.on('down', function () {
        if (!this.settingsMenuOpen)
            showSettings.call(this);
        else
            hideSettings.call(this);
    });*/
}

// This will generate a random coordinate, that can't be within a hole

function generateRandomCoordinate(entitie = false, ground = true) {
    const startPos = entitie ? screenWidth * 1.5 : screenWidth;
    const endPos = entitie ? worldWidth - screenWidth * 3 : worldWidth;
  
    let coordinate = Phaser.Math.Between(startPos, endPos);
  
    if (!ground) return coordinate;
  
    for (let hole of worldHolesCoords) {
      if (coordinate >= hole.start - platformPiecesWidth * 1.5 && coordinate <= hole.end) {
        return generateRandomCoordinate.call(this, entitie, ground);
      }
    }
  
    return coordinate;
  }
  

// World generation

function drawWorld() {
    //Drawing scenery props

    //> Drawing the Sky
    this.alertSky = this.add.rectangle(screenWidth, 0,worldWidth, screenHeight, getAlertSkyColor()).setOrigin(0).depth = -1;

    let propsY = screenHeight - platformHeight;

    if (isLevelOverworld) {
        //> Clouds
        for (i = 0; i < Phaser.Math.Between(Math.trunc(worldWidth / 760), Math.trunc(worldWidth / 380)); i++) {
            let x = generateRandomCoordinate(false, false);
            let y = Phaser.Math.Between(screenHeight / 80, screenHeight / 2.2);
            if (Phaser.Math.Between(0, 10) < 5) {
                this.add.image(x, y, 'cloud1').setOrigin(0).setScale(screenHeight / 1725);
            } else {
                this.add.image(x, y, 'cloud2').setOrigin(0).setScale(screenHeight / 1725);
            }
        }

        //> Mountains
        for (i = 0; i < Phaser.Math.Between(worldWidth / 6400, worldWidth / 3800); i++) {
            let x = generateRandomCoordinate();

            if (Phaser.Math.Between(0, 10) < 5) {
                this.add.image(x, propsY, 'mountain1').setOrigin(0, 1).setScale(resolveDecorationScale('mountain1', screenHeight / 517));
            } else {
                this.add.image(x, propsY, 'mountain2').setOrigin(0, 1).setScale(resolveDecorationScale('mountain2', screenHeight / 517));
            }
        }
        
        //> Bushes
        for (i = 0; i < Phaser.Math.Between(Math.trunc(worldWidth / 960), Math.trunc(worldWidth / 760)); i++) {
            let x = generateRandomCoordinate();

            if (Phaser.Math.Between(0, 10) < 5) {
                this.add.image(x, propsY, 'bush1').setOrigin(0, 1).setScale(resolveDecorationScale('bush1', screenHeight / 609));
            } else {
                this.add.image(x, propsY, 'bush2').setOrigin(0, 1).setScale(resolveDecorationScale('bush2', screenHeight / 609));
            }
        }

        //> Fences
        for (i = 0; i < Phaser.Math.Between(Math.trunc(worldWidth / 4000), Math.trunc(worldWidth / 2000)); i++) {
            let x = generateRandomCoordinate();

            this.add.tileSprite(x, propsY, Phaser.Math.Between(100, 250), 35, 'fence').setOrigin(0, 1).setScale(screenHeight / 863);
        }
    }

    //> Final flag
    this.finalFlagMast = this.add.tileSprite(worldWidth - (worldWidth / 30), propsY, 16, 167, 'flag-mast').setOrigin(0, 1).setScale(screenHeight / 400);
    this.physics.add.existing(this.finalFlagMast);
    this.finalFlagMast.immovable = true;
    this.finalFlagMast.allowGravity = false;
    this.finalFlagMast.body.setSize(3, 167);
    this.physics.add.overlap(player, this.finalFlagMast, null, raiseFlag, this);
    this.physics.add.collider(this.platformGroup.getChildren(), this.finalFlagMast);

    //> Flag
    this.finalFlag = this.add.image(worldWidth - (worldWidth / 30), propsY * 0.93, 'final-flag').setOrigin(0.5, 1);
    this.finalFlag.setScale(screenHeight / 400);
    this.finalFlag.setTint(0xff6b6b);

    //> Castle
    this.responseCenter = this.add.image(worldWidth - (worldWidth / 75), propsY, 'castle').setOrigin(0.5, 1).setScale(screenHeight / 300);
}

function generateLevel() {
    //> Creating the platform

    // pieceStart will be the next platform piece start pos. This value will be modified after each execution
    let pieceStart = screenWidth;
    // This will tell us if last generated piece of platform was empty, to avoid generating another empty piece next to it.
    let lastWasHole = 0;
    // Structures will generate every 2/3 platform pieces
    let lastWasStructure = 0;

    this.platformGroup = this.add.group();
    this.fallProtectionGroup = this.add.group();
    this.blocksGroup = this.add.group();
    this.constructionBlocksGroup = this.add.group();
    this.misteryBlocksGroup = this.add.group();
    this.immovableBlocksGroup = this.add.group();
    this.groundCoinsGroup = this.add.group();

    if (!isLevelOverworld) {
        //this.blocksGroup.add(this.add.tileSprite(worldWidth - screenWidth, screenHeight - (platformHeight * 4.5), screenWidth * 2.9, 16, 'block').setScale(screenHeight / 345).setOrigin(1, 0));
        this.blocksGroup.add(this.add.tileSprite(screenWidth, screenHeight - platformHeight / 1.2, 16, screenHeight - platformHeight, 'block2').setScale(screenHeight / 345).setOrigin(0, 1));
        this.undergroundRoof = this.add.tileSprite(screenWidth * 1.2, screenHeight / 13, worldWidth / 2.68, 16, 'block2').setScale(screenHeight / 345).setOrigin(0);
        this.blocksGroup.add(this.undergroundRoof);
    }

    for (i=0; i <= platformPieces; i++) {
        // Holes will have a 10% chance of spawning
        let number = Phaser.Math.Between(0, 100);

        // Check if its not a hole, this means is not that 20%, is not in the spawn safe area and is not close to the end castle.
        if (pieceStart >= (lastWasHole > 0 || lastWasStructure > 0 || worldWidth - platformPiecesWidth * 4) || number <= 0 || pieceStart <= screenWidth * 2 || pieceStart >= worldWidth - screenWidth * 2) {
            lastWasHole--;

            //> Create platform
            let Npiece = this.add.tileSprite(pieceStart, screenHeight, platformPiecesWidth, platformHeight, 'floorbricks').setScale(2).setOrigin(0, 0.5);
            this.physics.add.existing(Npiece);
            Npiece.body.immovable = true;
            Npiece.body.allowGravity = false;
            Npiece.isPlatform = true;
            Npiece.depth = 2;
            this.platformGroup.add(Npiece);
            // Apply player collision with platform
            this.physics.add.collider(player, Npiece);

            //> Creating world structures

            if (!(pieceStart >= (worldWidth - screenWidth * (isLevelOverworld ? 1 : 1.5))) && pieceStart > (screenWidth + platformPiecesWidth * 2) && lastWasHole < 1 && lastWasStructure < 1) {
                lastWasStructure = generateStructure.call(this, pieceStart);
            }
            else {
                lastWasStructure--;
            }
        } else {
            // Save every hole start and end for later use
            worldHolesCoords.push({ start: pieceStart, 
                end: pieceStart + platformPiecesWidth * 2});
            
            lastWasHole = 2;
            this.fallProtectionGroup.add(this.add.rectangle(pieceStart + platformPiecesWidth * 2, screenHeight - platformHeight, 5, 5).setOrigin(0, 1));
            this.fallProtectionGroup.add(this.add.rectangle(pieceStart, screenHeight - platformHeight, 5, 5).setOrigin(1, 1));
        }
        pieceStart += platformPiecesWidth * 2;
    }

    this.startScreenTrigger = this.add.tileSprite(screenWidth, screenHeight - platformHeight, 32, 28, 'horizontal-tube').setScale(screenHeight / 345).setOrigin(1, 1);
    this.startScreenTrigger.depth = 4;
    this.physics.add.existing(this.startScreenTrigger);
    this.startScreenTrigger.body.allowGravity = false;
    this.startScreenTrigger.body.immovable = true;
    this.physics.add.collider(player, this.startScreenTrigger, startLevel, null, this);

    let invisibleWall2 = this.add.rectangle(screenWidth, screenHeight - platformHeight, 1, screenHeight).setOrigin(0.5, 1);
    this.physics.add.existing(invisibleWall2);
    invisibleWall2.body.allowGravity = false;
    invisibleWall2.body.immovable = true;
    this.physics.add.collider(player, invisibleWall2);
    this.fallProtectionGroup.add(invisibleWall2);

    if (!isLevelOverworld) {
        this.verticalTube = this.add.tileSprite(worldWidth - screenWidth, screenHeight - platformHeight, 32, screenHeight, 'vertical-extralarge-tube').setScale(screenHeight / 345).setOrigin(1, 1);
        this.verticalTube.depth = 2;
        this.physics.add.existing(this.verticalTube);
        this.verticalTube.body.allowGravity = false;
        this.verticalTube.body.immovable = true;
        this.physics.add.collider(player, this.verticalTube);

        this.finalTrigger = this.add.tileSprite(worldWidth - screenWidth * 1.03, screenHeight - platformHeight, 40, 31, 'horizontal-final-tube').setScale(screenHeight / 345).setOrigin(1, 1);
        this.finalTrigger.depth = 2;
        this.physics.add.existing(this.finalTrigger);
        this.finalTrigger.body.allowGravity = false;
        this.finalTrigger.body.immovable = true;
        this.physics.add.collider(player, this.finalTrigger, teleportToLevelEnd, null, this);

        let invisibleWall1 = this.add.rectangle(worldWidth - screenWidth, screenHeight - platformHeight, 1, screenHeight).setOrigin(0.5, 1);
        this.physics.add.existing(invisibleWall1);
        invisibleWall1.body.allowGravity = false;
        invisibleWall1.body.immovable = true;
        this.physics.add.collider(player, invisibleWall1);
        this.fallProtectionGroup.add(invisibleWall1);
    }

    let fallProtections = this.fallProtectionGroup.getChildren();
    for (let i = 0; i < fallProtections.length; i++) {
        this.physics.add.existing(fallProtections[i]);
        fallProtections[i].body.allowGravity = false;
        fallProtections[i].body.immovable = true;
    }

    // Stablish properties for every generated structure
    let misteryBlocks = this.misteryBlocksGroup.getChildren();
    for (let i = 0; i < misteryBlocks.length; i++) {
        this.physics.add.existing(misteryBlocks[i]);
        misteryBlocks[i].body.allowGravity = false;
        misteryBlocks[i].body.immovable = true;
        misteryBlocks[i].depth = 2;
        misteryBlocks[i].anims.play('mistery-block-default', true);
        this.physics.add.collider(player, misteryBlocks[i], revealHiddenBlock, null, this);
    }
    
    // Apply player collision with blocks
    let blocks = this.blocksGroup.getChildren();
    for (let i = 0; i < blocks.length; i++) {
        this.physics.add.existing(blocks[i]);
        blocks[i].body.allowGravity = false;
        blocks[i].body.immovable = true;
        blocks[i].depth = 2;
        this.physics.add.collider(player, blocks[i], destroyBlock, null, this);
    }

    // Apply player collision with immovable blocks
    let constructionBlocks = this.constructionBlocksGroup.getChildren();
    for (let i = 0; i < constructionBlocks.length; i++) {
        this.physics.add.existing(constructionBlocks[i]);
        constructionBlocks[i].isImmovable = true;
        constructionBlocks[i].body.allowGravity = false;
        constructionBlocks[i].body.immovable = true;
        constructionBlocks[i].depth = 2;
        this.physics.add.collider(player, constructionBlocks[i], destroyBlock, null, this);
    }

    // Apply player collision with immovable blocks
    let immovableBlocks = this.immovableBlocksGroup.getChildren();
    for (let i = 0; i < immovableBlocks.length; i++) {
        this.physics.add.existing(immovableBlocks[i]);
        immovableBlocks[i].body.allowGravity = false;
        immovableBlocks[i].body.immovable = true;
        immovableBlocks[i].depth = 2;
        this.physics.add.collider(player, immovableBlocks[i]);
    }

    let groundCoins = this.groundCoinsGroup.getChildren();
    for (let i = 0; i < groundCoins.length; i++) {
        this.physics.add.existing(groundCoins[i]);
        groundCoins[i].anims.play('ground-coin-default', true);
        groundCoins[i].body.allowGravity = false;
        groundCoins[i].body.immovable = true;
        groundCoins[i].depth = 2;
        this.physics.add.overlap(player, groundCoins[i], collectCoin, null, this);
    }
}

function startLevel(player, trigger) {

    if (!player.body.blocked.right && !trigger.body.blocked.left)
        return;

    this.powerDownSound.play();

    this.physics.world.setBounds(screenWidth, 0, worldWidth, screenHeight);

    applyPlayerInvulnerability.call(this, 4000);

    playerBlocked = true;

    player.setVelocityX(5);
    player.anims.play('run', true).flipX = false;

    this.cameras.main.fadeOut(900, 0, 0, 0);

    this.hereWeGoSound.play();

    setTimeout(() => {
        if (!isLevelOverworld) {
            player.y = screenHeight / 5;
            this.musicTheme.stop();
            this.undergroundMusicTheme.play({ loop: -1 });
        }

        player.x = screenWidth * 1.1;
        this.cameras.main.pan(screenWidth * 1.5, 0, 0);
        playerBlocked = false;
        this.cameras.main.fadeIn(500, 0, 0, 0);
        createHUD.call(this);
        updateTimer.call(this);
        this.startScreenTrigger.destroy();
        levelStarted = true;
        if (this.settingsMenuOpen)hideSettings.call(this);
    }, 1100);
}


function teleportToLevelEnd(player, trigger) {

    if (!player.body.blocked.right && !trigger.body.blocked.left)
        return;
    
    playerBlocked = true;

    this.cameras.main.stopFollow();

    this.powerDownSound.play();

    this.tweens.add({
        targets: player,
        duration: 75,
        alpha: 0
    });

    this.cameras.main.fadeOut(450, 0, 0, 0);

    player.anims.play(playerState > 0 ? playerState == 1 ? 'grown-mario-run'  : 'fire-mario-run' : 'run', true).flipX = false;

    this.undergroundRoof.destroy();

    setTimeout(() => {
        this.physics.world.setBounds(worldWidth - screenWidth, 0, worldWidth, screenHeight);
        this.tpTube = this.add.tileSprite(worldWidth - screenWidth / 1.089, screenHeight - platformHeight, 32, 32, 'vertical-medium-tube').setScale(screenHeight / 345).setOrigin(1);
        this.tpTube.depth = 4;
        this.physics.add.existing(this.tpTube);
        this.tpTube.body.allowGravity = false;
        this.tpTube.body.immovable = true;
        this.physics.add.collider(player, this.tpTube);
        this.add.rectangle(worldWidth - screenWidth, 0, worldWidth, screenHeight,0x8585FF).setOrigin(0).depth = -1;
        this.add.tileSprite(worldWidth - screenWidth, screenHeight, screenWidth, platformHeight, 'start-floorbricks').setScale(2).setOrigin(0, 0.5).depth = 2;
    }, 500);

    setTimeout(() => {
        player.alpha = 1;
        player.x = worldWidth - screenWidth / 1.08;
        this.cameras.main.pan(worldWidth - screenWidth / 2, 0, 0);
        this.cameras.main.fadeIn(500, 0, 0, 0);
        this.powerDownSound.play();
        this.finalTrigger.destroy();
        this.tweens.add({
            targets: player,
            duration: 500,
            y: this.tpTube.getBounds().y
        });
        setTimeout(() => {
            playerBlocked = false;
        }, 500);
    }, 1100);
}

function drawStartScreen() {
    
    const screenCenterX = this.cameras.main.worldView.x + this.cameras.main.width / 2;

    // Draw sky
    this.alertSky = this.add.rectangle(0, 0, screenWidth, screenHeight, getAlertSkyColor()).setOrigin(0).depth = -1;

    let platform = this.add.tileSprite(0, screenHeight, screenWidth / 2, platformHeight, 'start-floorbricks').setScale(2).setOrigin(0, 0.5);
    this.physics.add.existing(platform);
    platform.body.immovable = true;
    platform.body.allowGravity = false;
    // Apply player collision with platform
    this.physics.add.collider(player, platform);

    /*
    this.add.text(screenWidth / 2, screenHeight - (screenHeight* 0.9), 
    "Known bugs: \n. Mobile controls are (at least) not nice",
    { fontFamily: 'pixel_nums', fontSize: (screenWidth / 115), align: 'left'}).setLineSpacing(screenHeight / 34.5);
    */
   
    this.add.image(screenWidth / 50, screenHeight / 3, 'cloud1').setScale(screenHeight / 1725);
    this.add.image(screenWidth / 1.25, screenHeight / 2, 'cloud1').setScale(screenHeight / 1725);
    this.add.image(screenWidth / 1.05, screenHeight / 6.5, 'cloud2').setScale(screenHeight / 1725);
    this.add.image(screenWidth / 3, screenHeight / 3.5, 'cloud2').setScale(screenHeight / 1725);
    this.add.image(screenWidth / 2.65, screenHeight / 2.8, 'cloud2').setScale(screenHeight / 1725);

    this.add.image(screenWidth / 50, screenHeight / 3, 'cloud1').setScale(screenHeight / 1725);

    this.add.image(screenWidth / 25, screenHeight / 10, 'sign').setOrigin(0).setScale(resolveDecorationScale('sign', screenHeight / 350));

    let propsY = screenHeight - platformHeight;

    this.add.image(screenWidth / 50, propsY, 'mountain2').setOrigin(0, 1).setScale(resolveDecorationScale('mountain2', screenHeight / 517));
    this.add.image(screenWidth / 300, propsY, 'mountain1').setOrigin(0, 1).setScale(resolveDecorationScale('mountain1', screenHeight / 517));

    this.add.image(screenWidth / 4, propsY, 'bush1').setOrigin(0, 1).setScale(resolveDecorationScale('bush1', screenHeight / 609));
    this.add.image(screenWidth / 1.55, propsY, 'bush2').setOrigin(0, 1).setScale(resolveDecorationScale('bush2', screenHeight / 609));
    this.add.image(screenWidth / 1.5, propsY, 'bush2').setOrigin(0, 1).setScale(resolveDecorationScale('bush2', screenHeight / 609));


    this.add.tileSprite(screenWidth / 15, propsY, 350, 35, 'fence').setOrigin(0, 1).setScale(screenHeight / 863);

    this.customBlock = this.add.sprite(screenCenterX, screenHeight - (platformHeight * 1.9),'custom-block').setScale(screenHeight / 345);
    this.customBlock.anims.play('custom-block-default')
    this.physics.add.collider(player, this.customBlock, function() {
        if (player.body.blocked.up) showSettings.call(this);
    }, null, this);
    this.physics.add.existing(this.customBlock);
    this.customBlock.body.allowGravity = false;
    this.customBlock.body.immovable = true;

    this.add.image(screenCenterX, screenHeight - (platformHeight * 1.9), 'gear').setScale(screenHeight / 13000).setInteractive().on('pointerdown', () => showSettings.call(this));

    this.add.image(screenCenterX * 1.12, screenHeight - (platformHeight * 1.5), 'settings-bubble').setScale(screenHeight / 620);

    this.add.sprite(screenCenterX * 1.07, screenHeight - platformHeight, 'npc').setOrigin(0.5, 1).setScale(screenHeight / 365).anims.play('npc-default', true);
}

function createEvacuatedCitizen(scene, x, groundY, options) {
    const scale = options.scale ?? 0.32;
    const delay = options.delay ?? 0;
    const citizen = scene.add.image(x, groundY, options.key).setOrigin(0.5, 1).setScale(scale);
    citizen.depth = options.depth ?? 8.2;
    citizen.alpha = 0;

    scene.tweens.add({
        targets: citizen,
        alpha: 1,
        duration: 320,
        delay,
        ease: 'Quad.Out'
    });

    if (options.clap !== false) {
        scene.tweens.add({
            targets: citizen,
            scaleX: scale * 0.985,
            scaleY: scale * 1.015,
            duration: 170,
            delay: delay + 40,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    return citizen;
}

function createCelebrationSpark(scene, x, y, delay = 0) {
    const spark = scene.add.star(x, y, 5, 4, 9, 0xffef7a).setDepth(8.6);
    spark.alpha = 0;
    scene.tweens.add({
        targets: spark,
        delay,
        alpha: { from: 0, to: 1 },
        scale: { from: 0.35, to: 1.1 },
        y: y - screenHeight / 28,
        duration: 320,
        yoyo: true,
        hold: 120,
        ease: 'Back.Out',
        onComplete: () => spark.destroy()
    });
}

function showEvacuationCelebration() {
    if (this.evacuationCelebrationShown || !this.responseCenter) {
        return;
    }

    this.evacuationCelebrationShown = true;
    const propsY = screenHeight - platformHeight;
    const centerX = this.responseCenter.x;
    const responseCenterBounds = this.responseCenter.getBounds();
    const crowdStartX = Math.min(responseCenterBounds.right + 18, worldWidth - 430);
    const crowd = [
        { key: EVACUATION_CROWD_ASSET_KEYS[0], dx: 0, scale: 0.14, clap: true },
        { key: EVACUATION_CROWD_ASSET_KEYS[1], dx: 34, scale: 0.135, clap: false },
        { key: EVACUATION_CROWD_ASSET_KEYS[2], dx: 68, scale: 0.135, clap: true },
        { key: EVACUATION_CROWD_ASSET_KEYS[3], dx: 102, scale: 0.135, clap: true },
        { key: EVACUATION_CROWD_ASSET_KEYS[4], dx: 136, scale: 0.135, clap: true },
        { key: EVACUATION_CROWD_ASSET_KEYS[5], dx: 170, scale: 0.135, clap: true },
        { key: EVACUATION_CROWD_ASSET_KEYS[6], dx: 204, scale: 0.13, clap: true },
        { key: EVACUATION_CROWD_ASSET_KEYS[7], dx: 238, scale: 0.13, clap: true },
        { key: EVACUATION_CROWD_ASSET_KEYS[8], dx: 272, scale: 0.13, clap: false },
        { key: EVACUATION_CROWD_ASSET_KEYS[9], dx: 306, scale: 0.132, clap: false },
        { key: EVACUATION_CROWD_ASSET_KEYS[10], dx: 340, scale: 0.132, clap: false },
        { key: EVACUATION_CROWD_ASSET_KEYS[11], dx: 376, scale: 0.14, clap: false }
    ];

    this.evacuationCrowd = this.add.group();
    for (let i = 0; i < crowd.length; i++) {
        const citizen = createEvacuatedCitizen(this, crowdStartX + crowd[i].dx, propsY, {
            ...crowd[i],
            delay: 60 * i
        });
        this.evacuationCrowd.add(citizen);
    }

    this.evacuationBanner = this.add.text(centerX, propsY - screenHeight / 6.6, '\u5168\u54e1\u5b89\u5168\u758f\u6563\u5b8c\u6210', {
        fontFamily: '"Microsoft JhengHei", "Noto Sans TC", sans-serif',
        fontSize: screenWidth / 88,
        color: '#fff5cf',
        fontStyle: 'bold',
        backgroundColor: 'rgba(0, 0, 0, 0.42)',
        padding: { left: 14, right: 14, top: 8, bottom: 8 }
    }).setOrigin(0.5).setDepth(8.7);
    this.evacuationBanner.alpha = 0;

    this.tweens.add({
        targets: this.evacuationBanner,
        alpha: 1,
        y: this.evacuationBanner.y - screenHeight / 120,
        duration: 380,
        ease: 'Quad.Out'
    });

    for (let i = 0; i < 18; i++) {
        const sparkX = centerX - screenWidth / 10 + (i % 9) * (screenWidth / 45);
        const sparkY = propsY - screenHeight / 7.8 - Math.floor(i / 9) * (screenHeight / 18);
        createCelebrationSpark(this, sparkX, sparkY, 180 + i * 70);
    }
}

function raiseFlag() {
    if (flagRaised) {
        return false;
    }

    this.cameras.main.stopFollow();
    this.cameras.main.pan(worldWidth - screenWidth / 2, screenHeight / 2, 500, 'Sine.easeOut');

    this.timeLeftText.stopped = true;
    if (this.rainfallTimerHandle) {
        clearTimeout(this.rainfallTimerHandle);
        this.rainfallTimerHandle = null;
    }

    this.musicTheme.stop();
    this.undergroundMusicTheme.stop();
    this.hurryMusicTheme.stop();
    this.flagPoleSound.play();

    this.tweens.add({
        targets: this.finalFlag,
        duration: 260,
        alpha: 0.35,
        yoyo: true,
        repeat: 7
    });

    showEvacuationCelebration.call(this);

    setTimeout(() => {
        this.winSound.play();
    }, 1000);
    
    flagRaised = true;
    playerBlocked = true;

    addToScore.call(this, 2000, player);

    return false;
}

function consumeMushroom(player, mushroom) {
    if (gameOver || gameWinned) return;

    this.consumePowerUpSound.play();
    addToScore.call(this, 1000, mushroom);
    mushroom.destroy();

    if (playerState > 0 )
    return;

    playerBlocked = true;
    this.anims.pauseAll();
    this.physics.pause();
    player.setTint(0xfefefe).anims.play('grown-mario-idle');
    let i = 0;
    let interval = setInterval(() => {
        i++;
        player.anims.play(i % 2 === 0 ? 'grown-mario-idle' : 'idle');
        if (i > 5) {
            clearInterval(interval);
            player.clearTint();
        }
    }, 100);

    setTimeout(() => { 
        this.physics.resume();
        this.anims.resumeAll();
        playerBlocked = false;
        playerState = 1;
        refreshPlayerPresentation();
        updateTimer.call(this);
    }, 1000);
    //player.body.setSize(16, 32).setOffset(1,0);
}

function consumeFireflower(player, fireFlower) {
    if (gameOver || gameWinned) return;

    this.consumePowerUpSound.play();
    addToScore.call(this, 1000, fireFlower);
    fireFlower.destroy();

    if (playerState > 1 )
    return;

    let anim = playerState > 0 ? 'grown-mario-idle' : 'idle';

    playerBlocked = true;
    this.anims.pauseAll();
    this.physics.pause();

    player.setTint(0xfefefe).anims.play('fire-mario-idle');
    let i = 0;
    let interval = setInterval(() => {
        i++;
        player.anims.play(i % 2 === 0 ? 'fire-mario-idle' : anim);
        if (i > 5) {
            clearInterval(interval);
            player.clearTint();
        }
    }, 100);

    setTimeout(() => { 
        this.physics.resume();
        this.anims.resumeAll();
        playerBlocked = false;
        playerState = 2;
        refreshPlayerPresentation();
        updateTimer.call(this);
    }, 1000);
    //player.body.setSize(16, 32).setOffset(1,0);
}

function collectCoin(player, coin) {
    this.coinSound.play();
    addToScore.call(this, 200);

    if (!coin.countedAsDataPoint) {
        coin.countedAsDataPoint = true;
        collectedDataPointsCount++;
        if (typeof updateDataPointHUD === 'function') {
            updateDataPointHUD.call(this);
        }
    }

    coin.destroy();
}

function update(delta) {
    if (gameOver || gameWinned) return;
    if (missionIntroPending) return;

    updatePlayer.call(this, delta);
    updateAlertWeatherEffects.call(this, delta);
    if (typeof updateEnemies === 'function') {
        updateEnemies.call(this);
    }

    const playerVelocityX = player.body.velocity.x;
    const camera = this.cameras.main;

    if (playerVelocityX > 0 && levelStarted && !reachedLevelEnd && !camera.isFollowing &&
        player.x >= screenWidth * 1.5 && player.x >= (camera.worldView.x + camera.width / 2)) {
        camera.followOffset.set(0, GAME_CAMERA_FOLLOW_OFFSET_Y);
        camera.startFollow(player, true, 0.1, 0.05);
        camera.isFollowing = true;
    }

    if (playerVelocityX < 0 && furthestPlayerPos < player.x && levelStarted && !reachedLevelEnd && camera.isFollowing) {
        furthestPlayerPos = player.x;
        const worldBounds = this.physics.world.setBounds(camera.worldView.x, 0, worldWidth, screenHeight);
        camera.setBounds(camera.worldView.x, 0, worldWidth, screenHeight);
        camera.stopFollow();
        camera.isFollowing = false;
    }

    if (!reachedLevelEnd && !isLevelOverworld && camera.isFollowing && player.x >= worldWidth - screenWidth * 1.5) {
        reachedLevelEnd = true;
        camera.stopFollow();
    }
}
