function initializeLevelGroups() {
    this.platformGroup = this.add.group();
    this.fallProtectionGroup = this.add.group();
    this.blocksGroup = this.add.group();
    this.constructionBlocksGroup = this.add.group();
    this.misteryBlocksGroup = this.add.group();
    this.immovableBlocksGroup = this.add.group();
    this.groundCoinsGroup = this.add.group();
    this.goombasGroup = this.add.group();
}

function addFixedDecoration(decoration) {
    const resolveDecorationScale = window.themeConfig?.resolveThemeDecorationScale
        ? window.themeConfig.resolveThemeDecorationScale
        : ((_, baseScale = 1) => baseScale);
    let node;

    if (decoration.type === 'tileSprite') {
        node = this.add.tileSprite(decoration.x, decoration.y, decoration.width, decoration.height, decoration.key);
    } else {
        node = this.add.image(decoration.x, decoration.y, decoration.key);
    }

    node.setOrigin(decoration.originX ?? 0.5, decoration.originY ?? 0.5);

    if (decoration.scale) {
        node.setScale(resolveDecorationScale(decoration.key, decoration.scale));
    }

    if (typeof decoration.depth === 'number') {
        node.depth = decoration.depth;
    }

    return node;
}

function resolveGroundedX(levelData, desiredX, padding = 36) {
    if (!levelData || !Array.isArray(levelData.groundSegments) || levelData.groundSegments.length === 0) {
        return desiredX;
    }

    for (let i = 0; i < levelData.groundSegments.length; i++) {
        const segment = levelData.groundSegments[i];
        const safeStart = segment.x + padding;
        const safeEnd = segment.x + segment.width - padding;
        if (desiredX >= safeStart && desiredX <= safeEnd) {
            return desiredX;
        }
    }

    let nearestX = desiredX;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < levelData.groundSegments.length; i++) {
        const segment = levelData.groundSegments[i];
        const safeStart = segment.x + padding;
        const safeEnd = segment.x + segment.width - padding;
        const candidateX = Phaser.Math.Clamp(desiredX, safeStart, safeEnd);
        const distance = Math.abs(candidateX - desiredX);

        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestX = candidateX;
        }
    }

    return nearestX;
}

function createFixedGroundVisual(segment) {
    const groundTopY = screenHeight - platformHeight;
    const grassHeight = Math.max(26, Math.round(platformHeight * 0.28));

    const gravelLayer = this.add.tileSprite(
        segment.x,
        groundTopY,
        segment.width,
        platformHeight,
        segment.fillTexture || 'ground-gravel-fill'
    ).setOrigin(0, 0);
    gravelLayer.depth = 1;

    const grassLayer = this.add.tileSprite(
        segment.x,
        groundTopY,
        segment.width,
        grassHeight,
        segment.topTexture || 'ground-grass-top'
    ).setOrigin(0, 0);
    grassLayer.depth = 3;

    return { gravelLayer, grassLayer };
}

function createFixedGoal(goal) {
    const propsY = screenHeight - platformHeight;
    const responseCenterScale = goal.responseCenterScale ?? (screenHeight / 1200);
    const responseCenterX = goal.responseCenterX ?? goal.castleX;
    const alarmMastScale = goal.alarmMastScale ?? 1;

    this.finalFlagMast = this.add.tileSprite(goal.flagMastX, propsY, 16, 167, 'flag-mast').setOrigin(0, 1).setScale(screenHeight / 400);
    this.physics.add.existing(this.finalFlagMast);
    this.finalFlagMast.immovable = true;
    this.finalFlagMast.allowGravity = false;
    this.finalFlagMast.body.setSize(3, 167);
    this.finalFlagMast.alpha = 0.001;
    this.physics.add.overlap(player, this.finalFlagMast, null, raiseFlag, this);
    this.physics.add.collider(this.platformGroup.getChildren(), this.finalFlagMast);

    this.finalFlag = this.add.image(goal.flagMastX, propsY, 'final-flag').setOrigin(0.5, 1);
    this.finalFlag.setScale(alarmMastScale);

    this.responseCenter = this.add.image(responseCenterX, propsY, 'castle').setOrigin(0.5, 1).setScale(responseCenterScale);
}

function createFixedStartTrigger() {
    this.startScreenTrigger = this.add.tileSprite(screenWidth, screenHeight - platformHeight, 32, 28, 'horizontal-tube').setScale(screenHeight / 345).setOrigin(1, 1);
    this.startScreenTrigger.depth = 4;
    this.physics.add.existing(this.startScreenTrigger);
    this.startScreenTrigger.body.allowGravity = false;
    this.startScreenTrigger.body.immovable = true;
    this.physics.add.collider(player, this.startScreenTrigger, startLevel, null, this);

    let invisibleWall = this.add.rectangle(screenWidth, screenHeight - platformHeight, 1, screenHeight).setOrigin(0.5, 1);
    this.physics.add.existing(invisibleWall);
    invisibleWall.body.allowGravity = false;
    invisibleWall.body.immovable = true;
    this.physics.add.collider(player, invisibleWall);
    this.fallProtectionGroup.add(invisibleWall);
}

function finalizeFixedLevelCollisions() {
    let fallProtections = this.fallProtectionGroup.getChildren();
    for (let i = 0; i < fallProtections.length; i++) {
        this.physics.add.existing(fallProtections[i]);
        fallProtections[i].body.allowGravity = false;
        fallProtections[i].body.immovable = true;
    }

    let misteryBlocks = this.misteryBlocksGroup.getChildren();
    for (let i = 0; i < misteryBlocks.length; i++) {
        if (!misteryBlocks[i].body) {
            this.physics.add.existing(misteryBlocks[i]);
        }
        misteryBlocks[i].body.allowGravity = false;
        misteryBlocks[i].body.immovable = true;
        misteryBlocks[i].depth = 2;
        misteryBlocks[i].anims.play('mistery-block-default', true);
        this.physics.add.collider(player, misteryBlocks[i], revealHiddenBlock, null, this);
    }

    let blocks = this.blocksGroup.getChildren();
    for (let i = 0; i < blocks.length; i++) {
        if (!blocks[i].body) {
            this.physics.add.existing(blocks[i]);
        }
        blocks[i].body.allowGravity = false;
        blocks[i].body.immovable = true;
        blocks[i].depth = 2;
        this.physics.add.collider(player, blocks[i], destroyBlock, null, this);
    }

    let constructionBlocks = this.constructionBlocksGroup.getChildren();
    for (let i = 0; i < constructionBlocks.length; i++) {
        if (!constructionBlocks[i].body) {
            this.physics.add.existing(constructionBlocks[i]);
        }
        constructionBlocks[i].isImmovable = true;
        constructionBlocks[i].body.allowGravity = false;
        constructionBlocks[i].body.immovable = true;
        constructionBlocks[i].depth = 2;
        this.physics.add.collider(player, constructionBlocks[i], destroyBlock, null, this);
    }

    let immovableBlocks = this.immovableBlocksGroup.getChildren();
    for (let i = 0; i < immovableBlocks.length; i++) {
        if (!immovableBlocks[i].body) {
            this.physics.add.existing(immovableBlocks[i]);
        }
        immovableBlocks[i].body.allowGravity = false;
        immovableBlocks[i].body.immovable = true;
        immovableBlocks[i].depth = 2;
        this.physics.add.collider(player, immovableBlocks[i]);
    }

    let groundCoins = this.groundCoinsGroup.getChildren();
    for (let i = 0; i < groundCoins.length; i++) {
        if (!groundCoins[i].body) {
            this.physics.add.existing(groundCoins[i]);
        }
        groundCoins[i].anims.play('ground-coin-default', true);
        groundCoins[i].body.allowGravity = false;
        groundCoins[i].body.immovable = true;
        groundCoins[i].depth = 2;
        this.physics.add.overlap(player, groundCoins[i], collectCoin, null, this);
    }

    if (this.goombasGroup && this.goombasGroup.getChildren().length > 0) {
        this.physics.add.collider(this.goombasGroup.getChildren(), this.immovableBlocksGroup.getChildren());
        this.physics.add.collider(this.goombasGroup.getChildren(), this.fallProtectionGroup.getChildren());
    }
}

function loadFixedLevel(levelData) {
    initializeLevelGroups.call(this);
    worldHolesCoords = [];
    emptyBlocksList = [];
    totalCitizensToEvacuate = Array.isArray(levelData.enemies)
        ? levelData.enemies.filter((enemy) => enemy.type === 'wandering-citizen').length
        : 0;
    evacuatedCitizensCount = 0;
    totalDataPointsToCollect = Array.isArray(levelData.collectibles)
        ? levelData.collectibles.filter((collectible) => collectible.type === 'ground-coin').length
        : 0;
    collectedDataPointsCount = 0;

    this.alertSky = this.add.rectangle(0, 0, worldWidth, screenHeight, getAlertSkyColor()).setOrigin(0).depth = -1;

    if (Array.isArray(levelData.decorations)) {
        for (let i = 0; i < levelData.decorations.length; i++) {
            addFixedDecoration.call(this, levelData.decorations[i]);
        }
    }

    for (let i = 0; i < levelData.groundSegments.length; i++) {
        let segment = levelData.groundSegments[i];
        createFixedGroundVisual.call(this, segment);
        let ground = this.add.rectangle(segment.x, screenHeight - platformHeight, segment.width, platformHeight, 0xffffff, 0.001)
            .setOrigin(0, 0);
        this.physics.add.existing(ground);
        ground.body.immovable = true;
        ground.body.allowGravity = false;
        ground.isPlatform = true;
        ground.depth = 2;
        this.platformGroup.add(ground);
        this.physics.add.collider(player, ground);
    }

    for (let i = 0; i < levelData.holes.length; i++) {
        let hole = levelData.holes[i];
        worldHolesCoords.push({ start: hole.start, end: hole.end });
        this.fallProtectionGroup.add(this.add.rectangle(hole.start, screenHeight - platformHeight, 5, 5).setOrigin(1, 1));
        this.fallProtectionGroup.add(this.add.rectangle(hole.end, screenHeight - platformHeight, 5, 5).setOrigin(0, 1));
    }

    for (let i = 0; i < levelData.blocks.length; i++) {
        let block = levelData.blocks[i];
        let node = this.add.tileSprite(block.x, block.y, block.width || 16, block.height || 16, block.texture || 'immovableBlock').setScale(screenHeight / 345);
        node.setOrigin(block.originX ?? 0.5, block.originY ?? 0.5);
        this.immovableBlocksGroup.add(node);
    }

    for (let i = 0; i < levelData.brickBlocks.length; i++) {
        let block = levelData.brickBlocks[i];
        let node = this.add.tileSprite(block.x, block.y, 16, 16, 'block').setScale(screenHeight / 345);
        node.setOrigin(block.originX ?? 0.5, block.originY ?? 0.5);
        this.blocksGroup.add(node);
    }

    for (let i = 0; i < levelData.questionBlocks.length; i++) {
        let block = levelData.questionBlocks[i];
        let node = this.add.sprite(block.x, block.y, 'mistery-block').setScale(screenHeight / 345);
        node.setOrigin(block.originX ?? 0.5, block.originY ?? 0.5);
        node.reward = block.reward || null;
        this.misteryBlocksGroup.add(node);
    }

    for (let i = 0; i < levelData.pipes.length; i++) {
        let pipe = levelData.pipes[i];
        let node = this.add.image(pipe.x, pipe.y, pipe.type).setScale(screenHeight / 345).setOrigin(pipe.originX ?? 0, pipe.originY ?? 1);
        this.immovableBlocksGroup.add(node);
    }

    for (let i = 0; i < levelData.collectibles.length; i++) {
        let collectible = levelData.collectibles[i];
        if (collectible.type === 'ground-coin') {
            let coin = this.physics.add.sprite(collectible.x, collectible.y, 'ground-coin').setScale(screenHeight / 345);
            coin.setOrigin(collectible.originX ?? 0.5, collectible.originY ?? 1);
            this.groundCoinsGroup.add(coin);
        }
    }

    for (let i = 0; i < levelData.enemies.length; i++) {
        let enemy = levelData.enemies[i];
        if (enemy.type === 'goomba' || enemy.type === 'mud-boulder' || enemy.type === 'wandering-citizen') {
            const groundedEnemyX = resolveGroundedX(levelData, enemy.x, 56);
            let goomba = spawnGoomba.call(this, groundedEnemyX, enemy.direction, enemy.type);
            goomba.y = enemy.y;
        }
    }

    createFixedGoal.call(this, levelData.goal);
    finalizeFixedLevelCollisions.call(this);

    if (levelData.useOriginalStartSequence) {
        createFixedStartTrigger.call(this);
    } else {
        const groundedPlayerX = resolveGroundedX(levelData, levelData.playerStart.x, 80);
        player.setPosition(groundedPlayerX, levelData.playerStart.y);
        player.setVelocity(0, 0);
        if (player.body) {
            player.body.reset(groundedPlayerX, levelData.playerStart.y);
        }
    }
}
