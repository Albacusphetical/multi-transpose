import {WebviewWindow} from "@tauri-apps/api/window";

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

// export const extractTransposeNumbers = (text) => {
//     // Define a regular expression to match the patterns
//     const regex = /(transpose\s(?:by:\s?|\+?[-]?\d+|[^\s]+?\s?\d+))/gi;
//
//     // Find all matches
//     const matches = text.match(regex);
//     if (!matches) return []; // Return an empty array if no matches
//
//     // Extract the numbers from the matches
//     const numbers = matches.map(match => {
//         // For "transpose by: -1" or "transpose by: 1", we capture the number after "by:"
//         const numberMatch = match.match(/[-+]?\d+/);
//         return numberMatch ? parseInt(numberMatch[0], 10) : null;
//     });
//
//     // Return only the numbers
//     return numbers.filter(number => number !== null);
// }


export const extractTransposeNumbers = (text) => {
    // Normalize line endings
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Split first 10 lines to check for bulk transpose block at the start
    const firstLines = text.split('\n').slice(0, 10).join('\n');

    // Regex to detect "transpose(s|d|ion)" keyword followed closely by a sequence of numbers
    // Allow optional newlines between keyword and numbers, but only one or two lines max
    // Capture the numbers sequence (numbers separated by spaces, possibly negative)
    const bulkRegex = /transpose(?:s|d|ion)?[^\d\-+]*\n?\s*([-+]?\d+(?:\s+[-+]?\d+)*)/im;

    const bulkMatch = bulkRegex.exec(firstLines);
    if (bulkMatch) {
        const numbersStr = bulkMatch[1];
        const numbers = numbersStr.trim().split(/\s+/).map(n => parseInt(n, 10)).filter(n => !isNaN(n));
        if (numbers.length > 0) {
            return numbers;
        }
    }

    // If no bulk transpose block detected at start, search whole text for inline transpose numbers

    const inlineRegex = /transpose(?:s|d|ion)?(?:\s+by:?\s*|\s+is\s+)?([-+]?\d+)/gi;
    const matches = [];
    let match;

    while ((match = inlineRegex.exec(text)) !== null) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num)) {
            matches.push(num);
        }
    }

    return matches;
}
