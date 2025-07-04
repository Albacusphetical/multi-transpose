import {OverlayToaster} from "@blueprintjs/core";
import {WebviewWindow} from "@tauri-apps/api/window";
import {appDataDir} from "@tauri-apps/api/path";
import {exists, readTextFile, writeTextFile} from "@tauri-apps/api/fs";

export const defaultAppDataSettings = {muted: false, volume: 0.3};
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

/** https://github.com/tauri-apps/tauri/discussions/3844 **/
export const preventRefreshOnKeydownCallback = (event) => {
    // Prevent F5 or Ctrl+R (Windows/Linux) and Command+R (Mac) from refreshing the page
    if (event.key === 'F5' || (event.ctrlKey && event.key === 'r') || (event.metaKey && event.key === 'r')) {
        event.preventDefault();
    }
}

export const preventCaretOnKeydownCallback = (event) => {
    if (event.key === "F7") {
        event.preventDefault();
    }
}

export const preventDefaultEventCallback = (event) => {
    event.preventDefault();
}
/****/

export const getJSONFile = async (filename, defaultData = {}) => {
    const appDataFilePath = await getAppDataFilePath(filename)
    const fileExists = await exists(appDataFilePath)

    if (!fileExists) {
        await writeTextFile(appDataFilePath, JSON.stringify(defaultData))
        return defaultData
    }

    const contents = await readTextFile(appDataFilePath)

    return JSON.parse(contents)
}

export const writeJSONFile = async (filename, data = {}) => {
    const appDataFilePath = await getAppDataFilePath(filename)
    const currData = await getJSONFile(filename)
    await writeTextFile(appDataFilePath, JSON.stringify({...currData, ...data}));
}

export const getAppDataFilePath = async (filename) => {
    const dataDir = await appDataDir();
    return `${dataDir}${filename}`
}

export const getAppDataSettings = async () => {
    return getJSONFile("settings.json", defaultAppDataSettings)
}

export const writeAppDataSettings = async (jsonObj) => {
    await writeJSONFile("settings.json", jsonObj)
}



export function modOrDefault(num, divisor) {
    const result = num % divisor;
    return isNaN(result) ? 0 : result;
}

