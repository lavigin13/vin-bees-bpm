export const getTelegramWebApp = () => {
    if (window.Telegram && window.Telegram.WebApp) {
        return window.Telegram.WebApp;
    }
    return null;
};

export const readyTelegramWebApp = () => {
    const tg = getTelegramWebApp();
    if (tg) {
        tg.ready();
        tg.expand();
    }
};
