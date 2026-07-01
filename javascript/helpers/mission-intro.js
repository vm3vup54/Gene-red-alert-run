function hideMissionIntro() {
    const intro = document.getElementById('mission-intro');
    if (!intro) {
        return;
    }

    window.missionIntroStartRequested = true;
    intro.classList.add('is-hidden');

    if (typeof window.startMissionFromIntro === 'function') {
        window.startMissionFromIntro();
    }

    if (window.game && window.game.sound && window.game.sound.context && window.game.sound.context.state === 'suspended') {
        window.game.sound.context.resume();
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const startButton = document.getElementById('mission-intro-start');
    if (!startButton) {
        return;
    }

    startButton.addEventListener('click', hideMissionIntro);
});
