function createHUD() {
    const posY = screenWidth / 23;
    const hudLabelFont = '"Microsoft JhengHei", "Noto Sans TC", sans-serif';

    this.alertFrame = this.add.rectangle(screenWidth / 2, screenHeight / 2, screenWidth - 12, screenHeight - 12)
        .setScrollFactor(0)
        .setDepth(4.8);
    this.alertFrame.setStrokeStyle(6, 0xffd24d, 1);
    this.alertFrame.setFillStyle(0x000000, 0);
    this.alertFrame.alpha = 0;

    this.scoreText = this.add.text(screenWidth / 40, posY, '', {
        fontFamily: hudLabelFont,
        fontSize: (screenWidth / 118),
        align: 'left',
        color: '#ffffff',
        fontStyle: 'bold'
    });
    this.scoreText.setScrollFactor(0).depth = 5;

    this.citizenStatusText = this.add.text(screenWidth / 40, posY + screenHeight / 16, '', {
        fontFamily: hudLabelFont,
        fontSize: (screenWidth / 124),
        align: 'left',
        color: '#ffffff',
        fontStyle: 'bold'
    });
    this.citizenStatusText.setScrollFactor(0).depth = 5;

    this.dataPointStatusText = this.add.text(screenWidth / 40, posY + screenHeight / 8, '', {
        fontFamily: hudLabelFont,
        fontSize: (screenWidth / 124),
        align: 'left',
        color: '#ffffff',
        fontStyle: 'bold'
    });
    this.dataPointStatusText.setScrollFactor(0).depth = 5;

    this.highScoreText = this.add.text(screenWidth / 2, posY, '', {
        fontFamily: hudLabelFont,
        fontSize: (screenWidth / 118),
        align: 'center',
        color: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0.5, 0);
    this.highScoreText.setScrollFactor(0).depth = 5;

    this.objectiveText = this.add.text(screenWidth / 2, posY + screenHeight / 16, '', {
        fontFamily: hudLabelFont,
        fontSize: (screenWidth / 132),
        align: 'center',
        color: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0.5, 0);
    this.objectiveText.setScrollFactor(0).depth = 5;

    this.timeLeftText = this.add.text(screenWidth * 0.975, posY, '', {
        fontFamily: hudLabelFont,
        fontSize: (screenWidth / 116),
        align: 'right',
        color: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(1, 0);
    this.timeLeftText.setScrollFactor(0).depth = 5;

    this.alertStatusText = this.add.text(screenWidth * 0.975, posY + screenHeight / 16, '', {
        fontFamily: hudLabelFont,
        fontSize: (screenWidth / 124),
        align: 'right',
        color: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(1, 0);
    this.alertStatusText.setScrollFactor(0).depth = 5;

    updateScore.call(this);
    updateCitizenHUD.call(this);
    updateDataPointHUD.call(this);
    updateRainfallHUD.call(this);
}

function showAlertBanner(message, backgroundColor) {
    if (this.alertBannerTween) {
        this.alertBannerTween.stop();
        this.alertBannerTween = null;
    }

    if (this.alertBannerGroup) {
        this.alertBannerGroup.destroy(true);
    }

    const bannerY = screenHeight / 7.2;
    const bannerWidth = screenWidth / 2.8;
    const bannerHeight = screenHeight / 14;
    const group = this.add.container(screenWidth / 2, bannerY).setScrollFactor(0).setDepth(9);

    const background = this.add.rectangle(0, 0, bannerWidth, bannerHeight, backgroundColor, 0.92);
    background.setStrokeStyle(3, 0xffffff, 0.9);

    const label = this.add.text(0, 0, message, {
        fontFamily: '"Microsoft JhengHei", "Noto Sans TC", sans-serif',
        fontSize: (screenWidth / 92),
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center'
    }).setOrigin(0.5);

    group.add([background, label]);
    group.alpha = 0;
    group.y -= screenHeight / 40;
    this.alertBannerGroup = group;

    this.tweens.add({
        targets: group,
        alpha: 1,
        y: bannerY,
        duration: 180,
        ease: 'Quad.Out'
    });

    this.alertBannerTween = this.tweens.add({
        targets: group,
        delay: 1750,
        alpha: 0,
        y: bannerY - screenHeight / 50,
        duration: 260,
        ease: 'Quad.In',
        onComplete: () => {
            if (this.alertBannerGroup === group) {
                this.alertBannerGroup = null;
            }
            if (this.alertBannerTween) {
                this.alertBannerTween = null;
            }
            group.destroy(true);
        }
    });
}

function ensureAlertPulseState(level) {
    if (this.alertPulseLevel === level) {
        return;
    }

    this.alertPulseLevel = level;

    if (this.alertFrameTween) {
        this.alertFrameTween.stop();
        this.alertFrameTween = null;
    }

    if (this.timeLeftTween) {
        this.timeLeftTween.stop();
        this.timeLeftTween = null;
    }

    if (this.alertStatusTween) {
        this.alertStatusTween.stop();
        this.alertStatusTween = null;
    }

    if (this.objectiveTween) {
        this.objectiveTween.stop();
        this.objectiveTween = null;
    }

    if (this.alertFrame) {
        this.alertFrame.alpha = 0;
    }

    if (this.timeLeftText) {
        this.timeLeftText.scale = 1;
    }

    if (this.alertStatusText) {
        this.alertStatusText.alpha = 1;
        this.alertStatusText.scale = 1;
    }

    if (this.objectiveText) {
        this.objectiveText.alpha = 1;
    }

    if (!level || !this.alertFrame) {
        return;
    }

    const frameColor = level === 'red' ? 0xff5050 : 0xffd24d;
    const frameAlpha = level === 'red' ? 0.48 : 0.28;
    this.alertFrame.setStrokeStyle(6, frameColor, 1);

    this.alertFrameTween = this.tweens.add({
        targets: this.alertFrame,
        alpha: { from: frameAlpha, to: 0.02 },
        duration: level === 'red' ? 220 : 420,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    this.timeLeftTween = this.tweens.add({
        targets: this.timeLeftText,
        scale: { from: 1, to: level === 'red' ? 1.08 : 1.04 },
        duration: level === 'red' ? 240 : 420,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    this.alertStatusTween = this.tweens.add({
        targets: this.alertStatusText,
        alpha: { from: 1, to: 0.55 },
        scale: { from: 1, to: level === 'red' ? 1.08 : 1.04 },
        duration: level === 'red' ? 220 : 360,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    this.objectiveTween = this.tweens.add({
        targets: this.objectiveText,
        alpha: { from: 1, to: level === 'red' ? 0.7 : 0.82 },
        duration: level === 'red' ? 260 : 460,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
}

function getFailureReasonText() {
    if (gameOverReason === 'red-alert') {
        return '\u7d2f\u7a4d\u96e8\u91cf\u9054\u5230\u7d05\u8272\u8b66\u6212\uff0c\u901a\u5831\u4efb\u52d9\u5931\u6557';
    }

    if (gameOverReason === 'enemy-hit') {
        return 'Gene \u906d\u9047\u5371\u96aa\uff0c\u672a\u80fd\u5b8c\u6210\u6700\u5f8c\u901a\u5831';
    }

    if (gameOverReason === 'fell') {
        return '\u901a\u5831\u9014\u4e2d\u5931\u8db3\uff0c\u672a\u80fd\u62b5\u9054\u61c9\u8b8a\u4e2d\u5fc3';
    }

    return '\u8acb\u91cd\u65b0\u9032\u884c\u9632\u707d\u901a\u5831';
}

function updateScore() {
    if (!this.scoreText) return;

    this.scoreText.setText(`\u901a\u5831\u5206\u6578\n${score.toString().padStart(6, '0')}`);

    if (this.highScoreText) {
        this.highScoreText.setText(`\u571f\u77f3\u6d41\u9632\u707d\u4efb\u52d9\n\u8edf\u9ad4\u907f\u707d\uff1a\u8b66\u6212\u3001\u901a\u5831\u3001\u758f\u6563\u907f\u96e3`);
    }

    if (this.objectiveText) {
        this.objectiveText.setText(`\u76ee\u6a19\uff1a${activeAlertConfig.redAlertMm} mm \u524d\u5b8c\u6210\u6c11\u773e\u758f\u6563\n\u4e26\u555f\u52d5\u8b66\u5831\u767c\u5e03`);
    }
}

function updateTimer() {
    if (!this.timeLeftText || this.timeLeftText.stopped || this.rainfallTimerHandle) return;

    const tickRainfall = () => {
        if (!this.timeLeftText || this.timeLeftText.stopped || gameOver || gameWinned) {
            this.rainfallTimerHandle = null;
            return;
        }

        rainfallAccumulated++;

        if (!yellowAlertIssued && hasReachedYellowAlert()) {
            yellowAlertIssued = true;
            this.timeWarningSound.play();
            showAlertBanner.call(this, `\u9ec3\u8272\u8b66\u6212\uff1a\u8acb\u52a0\u901f\u5b8c\u6210\u758f\u6563\u8207\u901a\u5831\n\u76ee\u524d ${rainfallAccumulated} mm\uff0c\u7d05\u8272\u8b66\u6212\u81e8\u754c ${activeAlertConfig.redAlertMm} mm`, 0xe0a100);
        }

        updateRainfallHUD.call(this);

        if (!redAlertIssued && hasReachedRedAlert()) {
            redAlertIssued = true;
            gameOver = true;
            gameOverReason = 'red-alert';
            this.timeLeftText.stopped = true;
            if (this.rainfallTimerHandle) {
                clearTimeout(this.rainfallTimerHandle);
                this.rainfallTimerHandle = null;
            }
            gameOverFunc.call(this);
            return;
        }

        this.rainfallTimerHandle = setTimeout(tickRainfall, 500);
    };

    this.rainfallTimerHandle = setTimeout(tickRainfall, 500);
}

function updateCitizenHUD() {
    if (!this.citizenStatusText) {
        return;
    }

    if (!totalCitizensToEvacuate) {
        this.citizenStatusText.setText('');
        return;
    }

    this.citizenStatusText.setText(`\u758f\u6563\u6c11\u773e\n${evacuatedCitizensCount}/${totalCitizensToEvacuate}`);
}

function updateDataPointHUD() {
    if (!this.dataPointStatusText) {
        return;
    }

    if (!totalDataPointsToCollect) {
        this.dataPointStatusText.setText('');
        return;
    }

    this.dataPointStatusText.setText(`\u76e3\u6e2c\u8cc7\u6599\n${collectedDataPointsCount}/${totalDataPointsToCollect}`);
}

function updateRainfallHUD() {
    if (!this.timeLeftText) {
        return;
    }

    const redAlertMm = activeAlertConfig.redAlertMm;
    const alertStatus = hasReachedRedAlert()
        ? '\u7d05\u8272\u8b66\u6212'
        : hasReachedYellowAlert()
            ? '\u9ec3\u8272\u8b66\u6212'
            : '\u6b63\u5e38';

    const alertColor = hasReachedRedAlert()
        ? '#ff5f5f'
        : hasReachedYellowAlert()
            ? '#ffd84d'
            : '#ffffff';

    this.timeLeftText.setText(`\u7d2f\u7a4d\u96e8\u91cf\n${rainfallAccumulated} mm / ${redAlertMm} mm`);

    if (this.alertStatusText) {
        this.alertStatusText.setColor(alertColor);
        this.alertStatusText.setText(`\u8b66\u6212\u72c0\u614b\uff1a${alertStatus}`);
    }

    if (hasReachedRedAlert()) {
        ensureAlertPulseState.call(this, 'red');
    } else if (hasReachedYellowAlert()) {
        ensureAlertPulseState.call(this, 'yellow');
    } else {
        ensureAlertPulseState.call(this, null);
    }

    if (typeof syncAlertWeatherVisuals === 'function') {
        syncAlertWeatherVisuals.call(this);
    }
}

function addToScore(num, originObject) {
    for (i = 1; i <= num; i++) {
        setTimeout(() => {
            score++;
            updateScore.call(this);
        }, i);
    }

    if (!originObject) return;

    const textEffect = this.add.text(originObject.getBounds().x, originObject.getBounds().y, num, {
        fontFamily: 'pixel_nums',
        fontSize: (screenWidth / 150),
        align: 'center'
    });

    textEffect.setOrigin(0).smoothed = true;
    textEffect.depth = 5;

    this.tweens.add({
        targets: textEffect,
        duration: 600,
        y: textEffect.y - screenHeight / 6.5,
        onComplete: () => {
            this.tweens.add({
                targets: textEffect,
                duration: 100,
                alpha: 0,
                onComplete: () => {
                    textEffect.destroy();
                }
            });
        }
    });
}

function createDashboardMetric(scene, x, y, width, height, title, value, accentColor) {
    const card = scene.add.container(x, y).setScrollFactor(0).setDepth(5.2);
    const background = scene.add.rectangle(0, 0, width, height, 0x1b2431, 0.94).setOrigin(0);
    background.setStrokeStyle(2, accentColor, 0.95);
    const titleText = scene.add.text(16, 12, title, {
        fontFamily: '"Microsoft JhengHei", "Noto Sans TC", sans-serif',
        fontSize: Math.max(20, screenWidth / 108),
        color: '#91a9c7',
        fontStyle: 'bold',
        stroke: '#0a1220',
        strokeThickness: 2
    });
    titleText.setShadow(0, 1, '#06101c', 3, false, true);
    const valueText = scene.add.text(16, height / 2 + 8, value, {
        fontFamily: '"Microsoft JhengHei", "Noto Sans TC", sans-serif',
        fontSize: Math.max(28, screenWidth / 60),
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#08111b',
        strokeThickness: 3
    }).setOrigin(0, 0.5);
    valueText.setShadow(0, 2, '#050b13', 4, false, true);
    card.add([background, titleText, valueText]);
    return card;
}

function createDashboardBullet(scene, x, y, text, color = '#dce7f6', width = 420) {
    const bullet = scene.add.circle(x, y + 11, 4, Phaser.Display.Color.HexStringToColor(color).color).setScrollFactor(0).setDepth(5.2);
    const label = scene.add.text(x + 14, y, text, {
        fontFamily: '"Microsoft JhengHei", "Noto Sans TC", sans-serif',
        fontSize: Math.max(19, screenWidth / 114),
        color,
        stroke: '#0a1220',
        strokeThickness: 2,
        lineSpacing: 6,
        wordWrap: { width }
    }).setScrollFactor(0).setDepth(5.2);
    label.setShadow(0, 1, '#07111c', 3, false, true);
    return { bullet, label };
}

function hideDebriefHUD(scene) {
    [
        scene.scoreText,
        scene.citizenStatusText,
        scene.dataPointStatusText,
        scene.highScoreText,
        scene.objectiveText,
        scene.timeLeftText,
        scene.alertStatusText,
        scene.alertFrame
    ].forEach((hudItem) => {
        if (hudItem) {
            hudItem.setVisible(false);
        }
    });

    if (scene.alertBannerTween) {
        scene.alertBannerTween.stop();
        scene.alertBannerTween = null;
    }

    if (scene.alertBannerGroup) {
        scene.alertBannerGroup.destroy(true);
        scene.alertBannerGroup = null;
    }
}

function createDebriefDashboard(options) {
    hideDebriefHUD(this);

    const accentColor = options.accentColor || 0x4dd1ff;
    const overlay = this.add.rectangle(screenWidth / 2, screenHeight / 2, screenWidth, screenHeight, 0x08111b)
        .setScrollFactor(0)
        .setDepth(4);
    overlay.alpha = 0;

    this.tweens.add({
        targets: overlay,
        duration: 240,
        alpha: 0.94
    });

    const panelWidth = screenWidth * 0.82;
    const panelHeight = screenHeight * 0.72;
    const panelX = (screenWidth - panelWidth) / 2;
    const panelY = screenHeight * 0.14;
    const rightColumnWidth = panelWidth * 0.28;
    const leftColumnWidth = panelWidth - rightColumnWidth - 78;

    const panel = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x101925, 0.96)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(5);
    panel.setStrokeStyle(3, accentColor, 0.95);

    this.add.rectangle(panelX, panelY, panelWidth, 72, 0x172437, 1)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(5.05);

    this.add.text(panelX + 30, panelY + 16, options.title, {
        fontFamily: '"Microsoft JhengHei", "Noto Sans TC", sans-serif',
        fontSize: Math.max(34, screenWidth / 36),
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#08111b',
        strokeThickness: 3
    }).setScrollFactor(0).setDepth(5.1).setShadow(0, 2, '#050b13', 4, false, true);

    this.add.text(panelX + panelWidth - 30, panelY + 18, options.headerTag, {
        fontFamily: '"Microsoft JhengHei", "Noto Sans TC", sans-serif',
        fontSize: Math.max(22, screenWidth / 92),
        color: '#d8ecff',
        fontStyle: 'bold',
        stroke: '#0a1220',
        strokeThickness: 2
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(5.1).setShadow(0, 1, '#06101c', 3, false, true);

    const summaryX = panelX + 30;
    const summaryY = panelY + 100;

    this.add.text(summaryX, summaryY, '防災教育摘要', {
        fontFamily: '"Microsoft JhengHei", "Noto Sans TC", sans-serif',
        fontSize: Math.max(28, screenWidth / 74),
        color: '#ffd76b',
        fontStyle: 'bold',
        stroke: '#3c2600',
        strokeThickness: 2
    }).setScrollFactor(0).setDepth(5.15).setShadow(0, 1, '#2c1a00', 3, false, true);

    this.add.text(summaryX, summaryY + 42, `警戒基準值：${activeAlertConfig.redAlertMm} mm`, {
        fontFamily: '"Microsoft JhengHei", "Noto Sans TC", sans-serif',
        fontSize: Math.max(22, screenWidth / 88),
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#09111b',
        strokeThickness: 2
    }).setScrollFactor(0).setDepth(5.15).setShadow(0, 1, '#050b13', 3, false, true);

    createDashboardBullet(this, summaryX + 4, summaryY + 86, '避難體制整備：疏散民眾、蒐集監測資料、啟動警報', '#dce7f6', leftColumnWidth - 24);
    createDashboardBullet(this, summaryX + 4, summaryY + 134, options.educationLine, options.educationColor || '#dce7f6', leftColumnWidth - 24);

    const metricTop = panelY + 320;
    const metricGap = 18;
    const metricWidth = (leftColumnWidth - metricGap) / 2;
    const metricHeight = 92;

    createDashboardMetric(this, summaryX, metricTop, metricWidth, metricHeight, '疏散民眾', `${evacuatedCitizensCount}/${totalCitizensToEvacuate}`, 0x73d589);
    createDashboardMetric(this, summaryX + metricWidth + metricGap, metricTop, metricWidth, metricHeight, '監測資料', `${collectedDataPointsCount}/${totalDataPointsToCollect}`, 0x4dd1ff);
    createDashboardMetric(this, summaryX, metricTop + metricHeight + metricGap, metricWidth, metricHeight, '累積雨量', `${rainfallAccumulated} mm / ${activeAlertConfig.redAlertMm} mm`, 0xffd76b);
    createDashboardMetric(this, summaryX + metricWidth + metricGap, metricTop + metricHeight + metricGap, metricWidth, metricHeight, '通報分數', score.toString().padStart(6, '0'), 0xff9a5e);

    const rightPanelX = panelX + panelWidth - rightColumnWidth - 30;
    const rightPanelY = panelY + 96;
    const rightPanelHeight = panelHeight - 190;
    const rightPanel = this.add.rectangle(rightPanelX, rightPanelY, rightColumnWidth, rightPanelHeight, 0x182232, 0.92)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(5.1);
    rightPanel.setStrokeStyle(2, 0x385678, 1);

    this.add.text(rightPanelX + 18, rightPanelY + 16, '戰情狀態', {
        fontFamily: '"Microsoft JhengHei", "Noto Sans TC", sans-serif',
        fontSize: Math.max(23, screenWidth / 94),
        color: '#ffd76b',
        fontStyle: 'bold',
        stroke: '#3c2600',
        strokeThickness: 2
    }).setScrollFactor(0).setDepth(5.2).setShadow(0, 1, '#2c1a00', 3, false, true);

    const statusLines = [
        `潛勢溪流：${activeAlertConfig.streamName}`,
        `警戒狀態：${hasReachedRedAlert() ? '紅色警戒' : hasReachedYellowAlert() ? '黃色警戒' : '正常'}`,
        `應變中心：${activeAlertConfig.responseCenterName}`,
        options.statusLine
    ];

    this.add.text(rightPanelX + 18, rightPanelY + 56, statusLines.join('\n'), {
        fontFamily: '"Microsoft JhengHei", "Noto Sans TC", sans-serif',
        fontSize: Math.max(18, screenWidth / 114),
        color: '#e6f0ff',
        stroke: '#09111b',
        strokeThickness: 2,
        lineSpacing: 10,
        wordWrap: { width: rightColumnWidth - 36 }
    }).setScrollFactor(0).setDepth(5.2).setShadow(0, 1, '#050b13', 3, false, true);

    this.add.image(rightPanelX + rightColumnWidth - 24, rightPanelY + rightPanelHeight - 24, 'castle')
        .setOrigin(1, 1)
        .setScale(screenHeight / 1280)
        .setScrollFactor(0)
        .setDepth(5.2);

    this.add.text(summaryX, panelY + panelHeight - 74, options.footerLine, {
        fontFamily: '"Microsoft JhengHei", "Noto Sans TC", sans-serif',
        fontSize: Math.max(18, screenWidth / 112),
        color: '#b9c8dc',
        stroke: '#09111b',
        strokeThickness: 2,
        wordWrap: { width: leftColumnWidth }
    }).setScrollFactor(0).setDepth(5.2).setShadow(0, 1, '#050b13', 3, false, true);

    this.add.bitmapText(panelX + panelWidth - 132, panelY + panelHeight - 64, 'carrier_command', '> RETRY', screenWidth / 68)
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setInteractive()
        .on('pointerdown', () => location.reload())
        .depth = 5.3;
}

function gameOverScreen() {
    if (this.evacuationCrowd) {
        this.evacuationCrowd.destroy(true, true);
        this.evacuationCrowd = null;
    }

    if (this.evacuationBanner) {
        this.tweens.killTweensOf(this.evacuationBanner);
        this.evacuationBanner.destroy();
        this.evacuationBanner = null;
    }

    createDebriefDashboard.call(this, {
        title: '\u4efb\u52d9\u672a\u5b8c\u6210',
        headerTag: '\u6230\u60c5\u7d50\u7b97\u5100\u8868\u677f',
        educationLine: getFailureReasonText(),
        educationColor: '#ffc1c1',
        statusLine: '\u4efb\u52d9\u5224\u5b9a\uff1a\u672a\u5728\u8b66\u6212\u6642\u9650\u5167\u5b8c\u6210\u901a\u5831',
        footerLine: '\u5ba3\u5c0e\u91cd\u9ede\uff1a\u967d\u964d\u96e8\u91cf\u63a5\u8fd1\u8b66\u6212\u57fa\u6e96\u503c\u6642\uff0c\u61c9\u52a0\u901f\u5b8c\u6210\u9810\u8b66\u3001\u758f\u6563\u8207\u907f\u96e3\u61c9\u8b8a\u3002',
        accentColor: 0xff6b6b
    });
}

function gameOverFunc() {
    this.timeLeftText.stopped = true;
    if (this.rainfallTimerHandle) {
        clearTimeout(this.rainfallTimerHandle);
        this.rainfallTimerHandle = null;
    }

    player.anims.play('hurt', true);
    player.body.enable = false;
    this.finalFlagMast.body.enable = false;

    let goombas = this.goombasGroup.getChildren();
    for (let i = 0; i < goombas.length; i++) {
        goombas[i].anims.stop();
        goombas[i].body.enable = false;
    }

    let platformPieces = this.platformGroup.getChildren();
    for (let i = 0; i < platformPieces.length; i++) {
        platformPieces[i].body.enable = false;
    }

    let blocks = this.blocksGroup.getChildren();
    for (let i = 0; i < blocks.length; i++) {
        blocks[i].body.enable = false;
    }

    let misteryBlocks = this.misteryBlocksGroup.getChildren();
    for (let i = 0; i < misteryBlocks.length; i++) {
        misteryBlocks[i].body.enable = false;
    }

    player.body.setSize(16, 16).setOffset(0);
    player.setVelocityX(0);

    setTimeout(() => {
        player.body.enable = true;
        player.setVelocityY(-velocityY * 1.1);
    }, 500);

    this.musicTheme.stop();
    this.undergroundMusicTheme.stop();
    this.hurryMusicTheme.stop();
    this.gameOverSong.play();

    setTimeout(() => {
        player.depth = 0;
        gameOverScreen.call(this);
        this.physics.pause();
    }, 3000);
}

function winScreen() {
    if (this.rainfallTimerHandle) {
        clearTimeout(this.rainfallTimerHandle);
        this.rainfallTimerHandle = null;
    }

    if (this.evacuationCrowd) {
        this.evacuationCrowd.destroy(true, true);
        this.evacuationCrowd = null;
    }

    if (this.evacuationBanner) {
        this.tweens.killTweensOf(this.evacuationBanner);
        this.evacuationBanner.destroy();
        this.evacuationBanner = null;
    }

    createDebriefDashboard.call(this, {
        title: '\u4efb\u52d9\u5b8c\u6210',
        headerTag: '\u6230\u60c5\u7d50\u7b97\u5100\u8868\u677f',
        educationLine: '\u907f\u96e3\u9ad4\u5236\u6709\u6548\u904b\u4f5c\uff0c\u5df2\u5728\u7d05\u8272\u8b66\u6212\u524d\u5b8c\u6210\u758f\u6563\u3001\u76e3\u6e2c\u8207\u8b66\u5831\u767c\u5e03\u3002',
        educationColor: '#b7f7d4',
        statusLine: '\u4efb\u52d9\u5224\u5b9a\uff1a\u5df2\u5b8c\u6210\u8b66\u5831\u767c\u5e03\u8207\u6c11\u773e\u907f\u96e3',
        footerLine: '\u5ba3\u5c0e\u91cd\u9ede\uff1a\u4f9d\u8b66\u6212\u57fa\u6e96\u503c\u53ca\u65e9\u555f\u52d5\u758f\u6563\u907f\u96e3\uff0c\u53ef\u964d\u4f4e\u571f\u77f3\u6d41\u707d\u5bb3\u4eba\u547d\u98a8\u96aa\u3002',
        accentColor: 0x58d68d
    });
}
