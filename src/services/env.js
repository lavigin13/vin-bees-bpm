// Environment detection and configuration for dual-mode operation:
// - Telegram Mini App: auth via initData, direct API URL
// - Standalone Web: auth via Basic Auth (login page), proxied API URL

/**
 * Check if the app is running inside a Telegram Mini App.
 */
export const isTelegram = () => !!window.Telegram?.WebApp?.initData;

/**
 * Get the API base URL depending on the environment.
 * - Telegram: direct URL to TelegramAPI endpoint
 * - Standalone: proxied path through Vite dev server
 */
export const getApiBaseUrl = () => {
    if (isTelegram()) {
        return '/VinBeesTelegram/hs/TelegramAPI';
    }
    return '/VinBeesERP/hs/API';
};
