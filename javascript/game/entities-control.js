
const goombasVelocityX = screenWidth / 19

function getEnemyConfig(type = 'goomba') {
    if (type === 'mud-boulder') {
        return {
            texture: 'mud-boulder-0',
            walkAnimation: 'mud-boulder-walk',
            hurtAnimation: 'mud-boulder-hurt',
            idleAnimation: 'mud-boulder-idle',
            scale: screenHeight / 620,
            defaultFacing: 'left',
            speedMultiplier: 1
        };
    }

    if (type === 'wandering-citizen') {
        return {
            texture: 'wandering-citizen-walk-0',
            walkAnimation: 'wandering-citizen-walk',
            hurtAnimation: 'wandering-citizen-cover',
            idleAnimation: 'wandering-citizen-idle',
            coverAnimation: 'wandering-citizen-cover',
            evacuateAnimation: 'wandering-citizen-evacuate',
            scale: screenHeight / 620,
            defaultFacing: 'right',
            speedMultiplier: 0.8
        };
    }

    return {
        texture: 'goomba',
        walkAnimation: 'goomba-walk',
        hurtAnimation: 'goomba-hurt',
        idleAnimation: 'goomba-idle',
        scale: screenHeight / 376,
        defaultFacing: 'left',
        speedMultiplier: 1
    };
}

function syncEnemyFacing(enemy) {
    if (!enemy || !enemy.body) {
        return;
    }

    const velocity = enemy.body.velocity.x;
    if (Math.abs(velocity) < 2) {
        return;
    }

    if (enemy.defaultFacing === 'right') {
        enemy.flipX = velocity < 0;
        return;
    }

    enemy.flipX = velocity > 0;
}

function startCitizenCover(citizen) {
    citizen.citizenState = 'covering';
    citizen.harmful = false;
    citizen.setVelocityX(0);
    citizen.anims.play(citizen.coverAnimationKey || 'wandering-citizen-cover', true);
    citizen.flipX = false;

    if (typeof showInteractionLabel === 'function') {
        showInteractionLabel.call(this, citizen, '\u52f8\u5c0e', '#ffe36e');
    }
}

function startCitizenEvacuation(citizen) {
    if (citizen.citizenState === 'evacuating') {
        return;
    }

    citizen.citizenState = 'evacuating';
    citizen.harmful = false;
    citizen.hasBeenEvacuated = true;
    citizen.anims.play(citizen.evacuateAnimationKey || 'wandering-citizen-evacuate', true);
    citizen.flipX = true;

    if (citizen.body) {
        citizen.body.enable = false;
    }

    if (typeof showInteractionLabel === 'function') {
        showInteractionLabel.call(this, citizen, '\u6210\u529f\u64a4\u96e2', '#9cff8f');
    }

    if (!citizen.countedAsEvacuated) {
        citizen.countedAsEvacuated = true;
        evacuatedCitizensCount++;
        if (typeof updateCitizenHUD === 'function') {
            updateCitizenHUD.call(this);
        }
    }

    this.tweens.add({
        targets: citizen,
        x: citizen.x - screenWidth * 1.4,
        duration: 1400,
        ease: 'Linear',
        onComplete: () => {
            if (this.goombasGroup) {
                this.goombasGroup.remove(citizen);
            }
            citizen.destroy();
        }
    });
}

function spawnGoomba(x, direction = null, type = 'goomba') {
    if (!this.goombasGroup) {
        this.goombasGroup = this.add.group();
    }

    const enemyConfig = getEnemyConfig(type);
    let goomba = this.physics.add.sprite(x, screenHeight - platformHeight, enemyConfig.texture).setOrigin(0.5, 1).setBounce(1, 0).setScale(enemyConfig.scale);
    goomba.anims.play(enemyConfig.walkAnimation, true);
    goomba.smoothed = true;
    goomba.depth = 2;
    goomba.enemyType = type;
    goomba.hurtAnimationKey = enemyConfig.hurtAnimation;
    goomba.idleAnimationKey = enemyConfig.idleAnimation;
    goomba.coverAnimationKey = enemyConfig.coverAnimation || null;
    goomba.evacuateAnimationKey = enemyConfig.evacuateAnimation || null;
    goomba.defaultFacing = enemyConfig.defaultFacing || 'left';
    goomba.harmful = true;
    goomba.citizenState = type === 'wandering-citizen' ? 'wandering' : null;
    goomba.countedAsEvacuated = false;

    let moveRight = direction === null ? Phaser.Math.Between(0, 10) <= 4 : direction >= 0;
    const speed = goombasVelocityX * (enemyConfig.speedMultiplier || 1);
    goomba.setVelocityX(moveRight ? speed : -speed);
    goomba.setMaxVelocity(Math.max(goombasVelocityX, speed * 2.2), levelGravity);
    syncEnemyFacing(goomba);
    this.goombasGroup.add(goomba);

    let platformPieces = this.platformGroup ? this.platformGroup.getChildren() : [];
    this.physics.add.collider(goomba, platformPieces);

    let blocks = this.blocksGroup ? this.blocksGroup.getChildren() : [];
    this.physics.add.collider(goomba, blocks);

    let misteryBlocks = this.misteryBlocksGroup ? this.misteryBlocksGroup.getChildren() : [];
    this.physics.add.collider(goomba, misteryBlocks);

    let goombas = this.goombasGroup.getChildren();
    this.physics.add.collider(goomba, goombas);

    if (this.finalFlagMast) {
        this.physics.add.collider(goomba, this.finalFlagMast);
    }

    this.physics.add.overlap(player, goomba, checkGoombaCollision, null, this);

    return goomba;
}

function createGoombas() {
    this.goombasGroup = this.add.group();

    for (i = 0; i < Math.trunc(worldWidth / 960); i++) {
        let x = generateRandomCoordinate(true);
        spawnGoomba.call(this, x);
    }

    // Create collision with fall protections to stop goombas from falling off the map
    this.physics.add.collider(this.goombasGroup.getChildren(), this.immovableBlocksGroup.getChildren());
    this.physics.add.collider(this.goombasGroup.getChildren(), this.fallProtectionGroup.getChildren());
    if (this.finalTrigger) {
        this.physics.add.collider(this.goombasGroup.getChildren(), this.finalTrigger);
    }

    setInterval(clearGoombas.call(this), 250);
}

function checkGoombaCollision(player, goomba) {

    if (goomba.dead)
        return;
    
    let goombaBeingStomped = player.body.touching.down && goomba.body.touching.up;

    if (flagRaised)
        return;

    if (playerInvulnerable) {
        if (!goombaBeingStomped) {
            return;
        }
    }

    if (goomba.enemyType === 'wandering-citizen') {
        if (goomba.citizenState === 'wandering') {
            if (goombaBeingStomped) {
                startCitizenCover.call(this, goomba);
                this.goombaStompSound.play();
                player.setVelocityY(-velocityY / 1.7);
                return;
            }

            if (goomba.harmful !== false) {
                decreasePlayerState.call(this);
            }
            return;
        }

        if (goomba.citizenState === 'covering') {
            startCitizenEvacuation.call(this, goomba);
            if (goombaBeingStomped) {
                player.setVelocityY(-velocityY / 1.7);
            }
            return;
        }

        return;
    }
    
    if (goombaBeingStomped) {
        goomba.anims.play(goomba.hurtAnimationKey || 'goomba-hurt', true);
        if (typeof showInteractionLabel === 'function') {
            showInteractionLabel.call(this, goomba, '\u5de5\u7a0b\u6574\u6cbb', '#d7ecff');
        }
        goomba.body.enable = false;
        this.goombasGroup.remove(goomba);
        this.goombaStompSound.play();
        player.setVelocityY(-velocityY / 1.5);
        addToScore.call(this, 100, goomba);
        setTimeout(() => {
            this.tweens.add({
                targets: goomba,
                duration: 300,
                alpha: 0
            });
        }, 200);
        setTimeout(() => {
            goomba.destroy();
        }, 500);
        return;
    }
    
    decreasePlayerState.call(this);
        
    return;
}

function updateEnemies() {
    if (!this.goombasGroup) {
        return;
    }

    let enemies = this.goombasGroup.getChildren();
    const leftBoundary = this.cameras.main.worldView.x - screenWidth / 6;

    for (let i = 0; i < enemies.length; i++) {
        let enemy = enemies[i];
        if (!enemy || !enemy.body || enemy.dead) {
            continue;
        }

        syncEnemyFacing(enemy);

        if (enemy.enemyType === 'wandering-citizen' && enemy.citizenState === 'evacuating' && enemy.x < leftBoundary) {
            this.goombasGroup.remove(enemy);
            enemy.destroy();
        }
    }
}

function escalateMudBoulderSpeed(multiplier) {
    if (!this.goombasGroup) {
        return;
    }

    let enemies = this.goombasGroup.getChildren();
    for (let i = 0; i < enemies.length; i++) {
        let enemy = enemies[i];
        if (!enemy || !enemy.body || enemy.dead || enemy.enemyType !== 'mud-boulder') {
            continue;
        }

        const currentSpeed = Math.abs(enemy.body.velocity.x) || goombasVelocityX;
        const sign = enemy.body.velocity.x < 0 ? -1 : 1;
        const newSpeed = currentSpeed * multiplier;

        enemy.setMaxVelocity(newSpeed * 1.2, levelGravity);
        enemy.setVelocityX(sign * newSpeed);
    }
}

function clearGoombas() {
    let goombas = this.goombasGroup.getChildren();

    for (let i = 0; i < goombas.length; i++) {
        if (goombas[i].enemyType === 'wandering-citizen') {
            continue;
        }
        if (goombas[i].body.velocity.x == 0 || (goombas[i].body.velocity.x > 0 && goombas[i].body.velocity.x != goombasVelocityX) || (goombas[i].body.velocity.x < 0 && goombas[i].body.velocity.x != -goombasVelocityX)) {
            this.goombasGroup.remove(goombas[i]);
            goombas[i].destroy();
        }
    }
}
