import {WebviewWindow} from "@tauri-apps/api/window";
import Tesseract from "tesseract.js";

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

export const onLinkClick = (label, url, title = label) => {
    spawnWindow(label, {url: url, title: title});
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

export function modOrDefault(num, divisor) {
    const result = num % divisor;
    return isNaN(result) ? 0 : result;
}

export const formatDateForCard = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();

    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeString = date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,  // 24-hour format
    });

    if (isToday) {
        return `Today ${timeString}`;
    }
    else if (isYesterday) {
        return `Yesterday ${timeString}`;
    }
    else {
        const dateString = date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        return `${dateString} ${timeString}`;
    }
}

export const extractTransposeNumbers = (text) => {
    // big shout out to chatgpt for saving me from painful regex! ask it about this hell beneath


    // Normalize line endings
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    const lines = text.split('\n');
    const first10 = lines.slice(0, 10);

    const isLikelyBulkTrigger = (line) => {
        if (!/\btran\w*/i.test(line)) return false;
        if (/\[.*?\]\(.*?\)/.test(line) || /https?:\/\//i.test(line)) return false;
        if (/[,.()]/.test(line) && !/\d/.test(line)) return false;
        return true;
    }

    // Step 1: Bulk detection in the first 10 lines
    for (let i = 0; i < first10.length; i++) {
        const line = first10[i];
        if (isLikelyBulkTrigger(line)) {
            for (let j = i + 1; j < first10.length; j++) {
                const raw = first10[j].trim();
                if (!raw) continue;

                const cleaned = raw.replace(/\\(?=[-+]?\d)/g, '');

                // Stop parsing at the first non-number/space character
                const bulkMatch = cleaned.match(/^([ \t]*[-+]?\d+\b[ \t]*)+/);
                if (!bulkMatch) break;

                const numbers = bulkMatch[0].match(/[-+]?\d+/g);
                if (numbers && numbers.length >= 2) {
                    return numbers.map(n => parseInt(n, 10));
                }
                break; // Only one line is allowed after trigger
            }
        }
    }

    // Step 2: Inline fallback
    const inlineRegex = /\btran\w*[^-\d\n]{0,20}?([-+]?\d+)/gi;
    const matches = [];
    let match;
    while ((match = inlineRegex.exec(text)) !== null) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num)) matches.push(num);
    }

    return matches;
};

export const extractImageLinks = (text) => {
    const imageRegex = /https?:\/\/[^\s"']+\.(?:jpg|jpeg|png|gif|webp|bmp|svg|tiff|ico)(\?[^ \n\r\t"'<>]*)?/gi;
    return text.match(imageRegex) || [];
};

export const extractImageText = async (imgData) => {
    try {
        const { data: { text } } = await Tesseract.recognize(
            imgData.path,
            "eng",
            {
                logger: (m) => console.log(m)
            }
        )
        return text
    }
    catch (e) {
        console.error(e)
        return ""
    }
}