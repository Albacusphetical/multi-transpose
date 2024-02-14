import {OverlayToaster} from "@blueprintjs/core";
import {WebviewWindow} from "@tauri-apps/api/window";
import {appDataDir} from "@tauri-apps/api/path";
import {exists, readTextFile, writeTextFile} from "@tauri-apps/api/fs";

const defaultAppDataSettings = {muted: false};
export const overlayToasterDefaultProps = {position: "top", maxToasts: 1, canEscapeKeyClear: true}
export const generalAppToastConfig = {isCloseButtonShown: false, icon: 'key'}

export function toastOnPause(toaster, paused, canTranspose) {
    toaster.then(toaster => {
        toaster.clear()
        if (paused) {
            const message = !canTranspose ? "Waiting for keybindings" : "Paused"
            toaster.show({
                ...generalAppToastConfig,
                message: message,
                icon: "pause",
                intent: !canTranspose ? "primary" : "warning",
                timeout: 0,
                isCloseButtonShown: true
            })
        }
    })
}

/**
 * @params label
 * @params options {WindowOptions}
 * @returns {Promise<WebviewWindow>}*/
export function spawnWindow(label, options) {
    return new Promise((resolve, reject) => {
        const webview = new WebviewWindow(label, options);

        // since the webview window is created asynchronously,
        // Tauri emits the `tauri://created` and `tauri://error` to notify you of the creation response
        webview.once('tauri://created', () => {
            // webview window successfully created
            webview.emit()

            console.log('Webview window successfully created');
            resolve(webview)
        });

        webview.once('tauri://error', (e) => {
            // an error occurred during webview window creation
            console.error('Error creating webview window:', e);
            reject("Webview not created")
        });
    })
}

export const onLinkClick = (label, url) => {
    spawnWindow(label, {url: url, title: label});
}

export const getAppDataSettings = async () => {
    const dataDir = await appDataDir();
    const settingsPath = `${dataDir}settings.json`
    const settingsExists = await exists(settingsPath);

    if (!settingsExists) {
        await writeTextFile(settingsPath, JSON.stringify(defaultAppDataSettings))
        return defaultAppDataSettings;
    }

    const contents = await readTextFile(`${dataDir}settings.json`);

    return JSON.parse(contents)
}

export const writeAppDataSettings = async (jsonObj) => {
    const dataDir = await appDataDir();
    const settingsPath = `${dataDir}settings.json`

    const settings = await getAppDataSettings()

    await writeTextFile(settingsPath, JSON.stringify({...settings, ...jsonObj}));
}

export function modOrDefault(num, divisor) {
    const result = num % divisor;
    return isNaN(result) ? 0 : result;
}

