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

export const extractTransposeNumbers = (text) => {
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = text.split('\n');

    // Helper: extract numbers from a cleaned string, require at least 2
    function extractNumbersFromStr(str) {
        // Remove unwanted chars except numbers, signs, spaces, and line breaks
        const cleaned = str.replace(/[^\d\-+\s]/g, ' ');
        const matches = cleaned.match(/[-+]?\d+/g);

        console.log(matches)
        if (matches && matches.length >= 2) {
            return matches.map(Number);
        }
        return null;
    }

    // Step 1: Bulk detection within first 10 lines (look for transpos line + block)
    for (let i = 0; i < Math.min(10, lines.length); i++) {
        if (/\btranspos\w*/i.test(lines[i])) {
            let blockLines = [lines[i]];
            let hasSeenNumberLine = false;

            for (let j = i + 1; j < lines.length; j++) {
                const line = lines[j];
                const trimmed = line.trim();

                // Stop if it's an empty line and we’ve already seen numbers
                if (trimmed === '' && hasSeenNumberLine) break;

                // If line contains at least one digit, set flag
                if (/\d/.test(trimmed)) {
                    hasSeenNumberLine = true;
                }

                // Include all non-empty lines (even formatting) until stop
                if (trimmed !== '' || !hasSeenNumberLine) {
                    blockLines.push(line);
                }
            }

            const blockText = blockLines.join(' ');
            console.log("Candidate block:", blockText);

            const nums = extractNumbersFromStr(blockText);
            console.log(nums)
            if (nums) {
                return nums;
            }
        }
    }

    // Step 2: Fallback inline detection anywhere in text (less priority)
    const inlineRegex = /\btranspos\w*[^-\d\n]{0,20}?([-+]?\d+)/gi;
    const matches = [];
    let match;
    while ((match = inlineRegex.exec(text)) !== null) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num)) matches.push(num);
    }

    return matches;
};
