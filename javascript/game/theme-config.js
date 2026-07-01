const DEFAULT_THEME_MODE = 'custom';
const THEME_MODE = (window.localStorage.getItem('theme-mode') || DEFAULT_THEME_MODE).toLowerCase() === 'custom'
    ? 'custom'
    : DEFAULT_THEME_MODE;

const THEME_ASSET_OVERRIDES = {
    classic: {},
    custom: {
        'mistery-block': 'assets/custom/blocks/overworld/misteryBlock.png?v=phase7-alert-theme-4',
        'coin': 'assets/custom/collectibles/coin.png?v=phase7-alert-theme-4',
        'castle': 'assets/custom/scenery/castle.png?v=phase11-alert-theme-1',
        'final-flag': 'assets/custom/scenery/final-flag.png?v=phase11-alert-theme-3',
        'flag-mast': 'assets/custom/scenery/flag-mast.png?v=phase7-alert-theme-5',
        'vertical-extralarge-tube': 'assets/custom/scenery/vertical-large-tube.png?v=phase7-alert-theme-5',
        'vertical-large-tube': 'assets/custom/scenery/vertical-large-tube.png?v=phase7-alert-theme-5',
        'vertical-medium-tube': 'assets/custom/scenery/vertical-medium-tube.png?v=phase7-alert-theme-5',
        'vertical-small-tube': 'assets/custom/scenery/vertical-small-tube.png?v=phase7-alert-theme-5',
        'floorbricks': 'assets/custom/scenery/overworld/floorbricks.png?v=phase7-alert-theme-5',
        'start-floorbricks': 'assets/custom/scenery/overworld/floorbricks.png?v=phase7-alert-theme-5',
        'cloud1': 'assets/custom/scenery/overworld/cloud1.png?v=phase8-alert-weather-1',
        'cloud2': 'assets/custom/scenery/overworld/cloud2.png?v=phase8-alert-weather-1',
        'block': 'assets/custom/blocks/overworld/block.png?v=phase8-alert-theme-3',
        'emptyBlock': 'assets/custom/blocks/overworld/emptyBlock.png?v=phase8-alert-theme-3',
        'immovableBlock': 'assets/custom/blocks/overworld/immovableBlock.png?v=phase8-alert-theme-3',
        'horizontal-tube': 'assets/custom/scenery/horizontal-tube.png?v=phase8-alert-theme-2',
        'horizontal-final-tube': 'assets/custom/scenery/horizontal-final-tube.png?v=phase8-alert-theme-2',
        'sign': 'assets/custom/scenery/sign.png?v=phase8-alert-theme-2',
        'fence': 'assets/custom/scenery/overworld/fence.png?v=phase8-alert-theme-2',
        'mountain1': 'assets/custom/scenery/overworld/mountain1.png?v=phase8-alert-landscape-1',
        'mountain2': 'assets/custom/scenery/overworld/mountain2.png?v=phase8-alert-landscape-1',
        'bush1': 'assets/custom/scenery/overworld/bush1.png?v=phase8-alert-landscape-1',
        'bush2': 'assets/custom/scenery/overworld/bush2.png?v=phase8-alert-landscape-1',
        'fire-flower': 'assets/custom/collectibles/fire-flower.png?v=phase9-player-theme-1',
        'super-mushroom': 'assets/custom/collectibles/super-mushroom.png?v=phase9-player-theme-1',
        'live-mushroom': 'assets/custom/collectibles/live-mushroom.png?v=phase8-alert-items-1',
        'ground-coin': 'assets/custom/collectibles/ground-coin.png?v=phase8-alert-items-1',
        'fireball': 'assets/custom/entities/fireball.png?v=phase9-player-theme-2',
        'mario': 'assets/custom/entities/mario.png?v=phase11-player-theme-1',
        'mario-grown': 'assets/custom/entities/mario-grown.png?v=phase10-player-theme-1',
        'mario-fire': 'assets/custom/entities/mario-fire.png?v=phase10-player-theme-1'
    }
};

const THEME_DECORATION_SCALE_ADJUSTMENTS = {
    classic: {},
    custom: {}
};

function resolveThemeAssetPath(assetKey, classicPath) {
    const modeAssets = THEME_ASSET_OVERRIDES[THEME_MODE] || THEME_ASSET_OVERRIDES.classic;
    return modeAssets[assetKey] || classicPath;
}

function resolveThemeDecorationScale(assetKey, baseScale = 1) {
    const modeScales = THEME_DECORATION_SCALE_ADJUSTMENTS[THEME_MODE] || THEME_DECORATION_SCALE_ADJUSTMENTS.classic;
    return baseScale * (modeScales[assetKey] || 1);
}

window.themeConfig = {
    defaultMode: DEFAULT_THEME_MODE,
    mode: THEME_MODE,
    assets: THEME_ASSET_OVERRIDES,
    decorationScales: THEME_DECORATION_SCALE_ADJUSTMENTS,
    resolveThemeAssetPath,
    resolveThemeDecorationScale,
    setThemeMode(themeMode) {
        const nextThemeMode = themeMode === 'custom' ? 'custom' : DEFAULT_THEME_MODE;
        window.localStorage.setItem('theme-mode', nextThemeMode);
        return nextThemeMode;
    }
};
