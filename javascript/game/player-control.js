
function isMediumResolutionCustomPlayer() {
    return window.themeConfig?.mode === 'custom';
}

function getPlayerScaleConfig() {
    if (!isMediumResolutionCustomPlayer()) {
        return {
            smallScale: screenHeight / 376,
            bigScale: screenHeight / 376
        };
    }

    return {
        smallScale: screenHeight / 950,
        bigScale: screenHeight / 700
    };
}

function applyPlayerScaleForState() {
    const scaleConfig = getPlayerScaleConfig();
    player.setScale(playerState > 0 ? scaleConfig.bigScale : scaleConfig.smallScale);
}

function applyStandingBodySize() {
    if (!isMediumResolutionCustomPlayer()) {
        if (playerState > 0) {
            player.body.setSize(14, 32).setOffset(2, 0);
            return;
        }

        player.body.setSize(14, 16).setOffset(1.3, 0.5);
        return;
    }

    if (playerState > 0) {
        player.body.setSize(24, 60).setOffset(12, 4);
        return;
    }

    player.body.setSize(22, 40).setOffset(14, 8);
}

function applyCrouchBodySize() {
    if (!isMediumResolutionCustomPlayer()) {
        player.body.setSize(14, 22).setOffset(2, 10);
        return;
    }

    player.body.setSize(24, 40).setOffset(12, 24);
}

function refreshPlayerPresentation() {
    applyPlayerScaleForState();
    applyStandingBodySize();
}

function createPlayer() {
    // Draw player
    player = this.physics.add.sprite( /*screenWidth * 1.5*/ startOffset, screenHeight - platformHeight, 'mario').setOrigin(1).setBounce(0)
    .setCollideWorldBounds(true);
    refreshPlayerPresentation();
    player.depth = 3;
    /*this.cameras.main.startFollow(player);
    playerState = 2;*/
}

function decreasePlayerState() {

    if (playerState <= 0) {
        gameOver = true;
        gameOverReason = 'enemy-hit';
        gameOverFunc.call(this);
        return;
    }
    
    playerBlocked = true;
    this.physics.pause();
    this.anims.pauseAll();
    this.powerDownSound.play();

    let anim1 = playerState == 2 ? 'fire-mario-idle' : 'grown-mario-idle';
    let anim2 = playerState == 2 ? 'grown-mario-idle' : 'idle';

    applyPlayerInvulnerability.call(this, 3000);
    player.anims.play(anim2);

    let i = 0;
    let interval = setInterval(() => {
        i++;
        player.anims.play(i % 2 === 0 ? anim2 : anim1);
        if (i > 5) {
            clearInterval(interval);
        }
    }, 100);

    playerState--;

    setTimeout(() => { 
        this.physics.resume();
        this.anims.resumeAll();
        playerBlocked = false;
        refreshPlayerPresentation();
        updateTimer.call(this);
    }, 1000);
}

function applyPlayerInvulnerability(time) {
    let blinkAnim = this.tweens.add({
        targets: player,
        duration: 100,
        alpha: { from: 1, to: 0.2 },
        ease: 'Linear',
        repeat: -1,
        yoyo: true
    });

    playerInvulnerable = true;
    setTimeout(() => {
        playerInvulnerable = false;
        blinkAnim.stop();
        player.alpha = 1;
    }, time);
}

function updatePlayer(delta) {

    // Win animation
    if (playerBlocked && flagRaised) {
        player.setVelocityX(screenWidth / 8.5);
        if (playerState == 0)
        player.anims.play('run', true).flipX = false;
        if (playerState == 1)
        player.anims.play('grown-mario-run', true).flipX = false;
        if (playerState == 2)
        player.anims.play('fire-mario-run', true);

        if(player.x >= worldWidth - (worldWidth / 75)) {
            this.tweens.add({
                targets: player,
                duration: 75,
                alpha: 0
            });
        }
        setTimeout(() => {
            gameWinned = true;
            player.destroy();
            winScreen.call(this);
        }, 5000);
        return;
    }

    if (player.body.blocked.up)
        player.setVelocityY(0);

    if (player.body.blocked.left || player.body.blocked.right)
        player.setVelocityX(0);

    // Check if player has fallen
    if (player.y > screenHeight - 10 || hasReachedRedAlert()) {
        if (gameOver) {
            return;
        }
        gameOver = true;
        if (player.y > screenHeight - 10) {
            gameOverReason = 'fell';
        } else {
            gameOverReason = 'red-alert';
        }
        gameOverFunc.call(this);
        return;
    }

    if (playerBlocked)
        return;

    // Player controls
    // https://github.com/photonstorm/phaser3-examples/blob/master/public/src/tilemap/collision/matter%20destroy%20tile%20bodies.js#L323
    // https://codepen.io/rexrainbow/pen/oyqvQY

    // > Vertical movement
    if ((controlKeys.JUMP.isDown || this.joyStick.up) && player.body.touching.down) {
        this.jumpSound.play();
        (playerState > 0 && (controlKeys.DOWN.isDown|| this.joyStick.down)) ? player.setVelocityY(-jumpVelocity / 1.25) : player.setVelocityY(-jumpVelocity);
    }

    // > Horizontal movement and animations
    let oldVelocityX;
    let targetVelocityX;
    let newVelocityX;

    if (controlKeys.LEFT.isDown || controlKeys.LEFT_ALT.isDown || this.joyStick.left) {
        smoothedControls.moveLeft(delta);
        if (!playerFiring) {
            if (playerState == 0)
            player.anims.play('run', true).flipX = true;
    
            if (playerState == 1)
            player.anims.play('grown-mario-run', true).flipX = true;
    
            if (playerState == 2)
            player.anims.play('fire-mario-run', true).flipX = true;
        }

        playerController.direction.positive = false;
        
        // Lerp the velocity towards the max run using the smoothed controls.
        // This simulates a player controlled acceleration.
        oldVelocityX = player.body.velocity.x;
        targetVelocityX = -playerController.speed.run;
        newVelocityX = Phaser.Math.Linear(oldVelocityX, targetVelocityX, -smoothedControls.value);

        player.setVelocityX(newVelocityX);
    } else if (controlKeys.RIGHT.isDown || controlKeys.RIGHT_ALT.isDown || this.joyStick.right) {
        smoothedControls.moveRight(delta);
        if (!playerFiring) {
            if (playerState == 0)
            player.anims.play('run', true).flipX = false;
    
            if (playerState == 1)
            player.anims.play('grown-mario-run', true).flipX = false;
    
            if (playerState == 2)
            player.anims.play('fire-mario-run', true).flipX = false;
        }

        playerController.direction.positive = true;

        // Lerp the velocity towards the max run using the smoothed controls.
        // This simulates a player controlled acceleration.
        oldVelocityX = player.body.velocity.x;
        targetVelocityX = playerController.speed.run;
        newVelocityX = Phaser.Math.Linear(oldVelocityX, targetVelocityX, smoothedControls.value);

        player.setVelocityX(newVelocityX);    
    } else {
        if (player.body.velocity.x != 0)
            smoothedControls.reset();
        if (player.body.touching.down)
            player.setVelocityX(0);
        if (!(controlKeys.JUMP.isDown|| this.joyStick.up) && !playerFiring) {
            if (playerState == 0)
            player.anims.play('idle', true);
    
            if (playerState == 1)
            player.anims.play('grown-mario-idle', true);

            if (playerState == 2)
            player.anims.play('fire-mario-idle', true);
        }
    }

    if (!playerFiring) {
        if (playerState > 0 && (controlKeys.DOWN.isDown|| this.joyStick.down)) {
            if (playerState == 1)
            player.anims.play('grown-mario-crouch', true);

            if (playerState == 2)
            player.anims.play('fire-mario-crouch', true);

            if (player.body.touching.down) {
                player.setVelocityX(0);
            } 

            applyCrouchBodySize();

            return;
        } else {
            applyStandingBodySize();
        }
    }

    if (player.body.touching.down && playerState == 2 && controlKeys.FIRE.isDown && !fireInCooldown) {
        throwFireball.call(this);
        return;
    }

    // Apply jump animation
    if (!player.body.touching.down) {
        if (!playerFiring) {
            if (playerState == 0)
            player.anims.play('jump', true);
    
            if (playerState == 1)
            player.anims.play('grown-mario-jump', true);
    
            if (playerState == 2)
            player.anims.play('fire-mario-jump', true);
        }
    }
}
