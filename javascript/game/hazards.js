
const ROCKFALL_TELEGRAPH_MS = 700;
const ROCKFALL_JITTER_RANGE = 70;
const ROCKFALL_MIN_INTERVAL_MS = 1500;

function rockfallWarningScale() {
    return screenHeight / 700;
}

function rockfallRockScale() {
    return screenHeight / 850;
}

function spawnFallingRock(x) {
    if (gameOver || gameWinned) {
        return;
    }

    let rock = this.physics.add.sprite(x, -40, 'rock-pile').setOrigin(0.5, 1).setScale(rockfallRockScale());
    rock.depth = 3;
    rock.hazardType = 'falling-rock';
    rock.body.allowGravity = true;
    rock.setVelocityY(levelGravity / 6);

    const settleRock = () => {
        if (rock.landed) {
            return;
        }
        rock.landed = true;
        rock.body.enable = false;
        this.blockBumpSound.play();
        this.tweens.add({
            targets: rock,
            duration: 220,
            alpha: 0,
            onComplete: () => rock.destroy()
        });
    };

    // Only the ground and truly solid terrain (pipes/immovable blocks) stop a falling rock.
    // Breakable brick clusters (blocksGroup / constructionBlocksGroup) are smashed through,
    // otherwise a brick row floating above a rockfall zone would silently absorb every rock
    // before it ever reaches the ground the player is standing on.
    let solidGroups = [this.platformGroup, this.immovableBlocksGroup];
    for (let i = 0; i < solidGroups.length; i++) {
        if (solidGroups[i]) {
            this.physics.add.collider(rock, solidGroups[i].getChildren(), settleRock, null, this);
        }
    }

    this.physics.add.overlap(player, rock, (playerObj, rockObj) => {
        if (rockObj.landed || rockObj.hit) {
            return;
        }
        rockObj.hit = true;
        if (!playerInvulnerable) {
            decreasePlayerState.call(this);
        }
        settleRock();
    }, null, this);

    this.time.delayedCall(4000, () => {
        if (rock && rock.active) {
            rock.destroy();
        }
    });
}

function showRockfallWarning(x) {
    if (gameOver || gameWinned) {
        return;
    }

    let warning = this.add.image(x, screenHeight - platformHeight, 'warning-sign-rockfall')
        .setOrigin(0.5, 1)
        .setScale(rockfallWarningScale())
        .setDepth(3);

    this.tweens.add({
        targets: warning,
        alpha: { from: 1, to: 0.25 },
        duration: 140,
        yoyo: true,
        repeat: 2
    });

    this.time.delayedCall(ROCKFALL_TELEGRAPH_MS, () => {
        warning.destroy();
        if (gameOver || gameWinned) {
            return;
        }
        let jitter = Phaser.Math.Between(-ROCKFALL_JITTER_RANGE, ROCKFALL_JITTER_RANGE);
        spawnFallingRock.call(this, x + jitter);
    });
}

function initRockfallZones(levelData) {
    if (!Array.isArray(levelData.rockfallZones) || levelData.rockfallZones.length === 0) {
        return;
    }

    this.rockfallTimers = [];

    levelData.rockfallZones.forEach((zone) => {
        const interval = zone.intervalMs || 4500;
        const timer = this.time.addEvent({
            delay: interval,
            startAt: Phaser.Math.Between(0, interval),
            loop: true,
            callback: () => {
                if (gameOver || gameWinned) {
                    return;
                }
                showRockfallWarning.call(this, zone.x);
            }
        });
        this.rockfallTimers.push(timer);
    });
}

function escalateRockfallZones(multiplier) {
    if (!this.rockfallTimers) {
        return;
    }
    this.rockfallTimers.forEach((timer) => {
        timer.delay = Math.max(ROCKFALL_MIN_INTERVAL_MS, timer.delay * multiplier);
    });
}

function stopRockfallZones() {
    if (!this.rockfallTimers) {
        return;
    }
    this.rockfallTimers.forEach((timer) => timer.remove(false));
    this.rockfallTimers = [];
}
