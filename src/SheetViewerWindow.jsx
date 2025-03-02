import {useEffect, useState} from "react";
import {emit, listen} from "@tauri-apps/api/event";
import {
    overlayToasterDefaultProps, preventCaretOnKeydownCallback, preventDefaultEventCallback,
    preventRefreshOnKeydownCallback,
    toastOnPause
} from "./utils.js";
import {Callout, Icon, IconSize, OverlayToaster, Spinner, Tag, Tooltip} from "@blueprintjs/core";
import TransposeMonitor from "./components/TransposeMonitor.jsx";
import SheetViewerSettings from "./components/SheetViewerSettings.jsx";
import {invoke} from "@tauri-apps/api";
import {appWindow, LogicalPosition, LogicalSize, WebviewWindow} from "@tauri-apps/api/window";
import TransposeInput from "./components/TransposeInput.jsx";

const toaster = OverlayToaster.createAsync({...overlayToasterDefaultProps, position: "top-right"});

function SheetViewer() {
    const [data, setData] = useState({
        paused: undefined,
        selectedIndex: undefined,
        transposes: undefined,
        canTranspose: undefined,
        keybindConfig: undefined,
    });

    const mainWindow = WebviewWindow.getByLabel("main") // for communicating transposes

    const [loading, setLoading] = useState(null)
    const [isWindowFocused, setIsWindowFocused] = useState(true)
    const [isInKeyboardArea, setIsInKeyboardArea] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [filePath, setFilePath] = useState("")
    const [content, setContent] = useState()
    const [isContentHidden, setIsContentHidden] = useState(false)
    const [isTransposesInputHidden, setIsTransposesInputHidden] = useState(true)
    const [zoomLevel, setZoomLevel] = useState(0.1);
    const [zoomStepSize, setZoomStepSize] = useState(0.01);

    const zoomIn = () => {
        showZoomInfo()
        setZoomLevel(prev => prev + zoomStepSize);
    }
    const zoomOut = () => {
        showZoomInfo()
        setZoomLevel(prev =>
            prev - zoomStepSize >= 0.2 ? prev - zoomStepSize : 0.2
        );
    }

    const showZoomInfo = () => {
        const zoomInfoEl = document.getElementById("zoom-info")

        if (zoomInfoEl.classList.contains("display-none")) {
            zoomInfoEl.classList.remove("display-none")
            setTimeout(() => {
                zoomInfoEl.classList.add("display-none")
            }, 1000)
        }
    }

    const handleZoomWheelEvent = (event) => {
        if (event.ctrlKey) {
            event.preventDefault();
            event.deltaY < 0 ? zoomIn() : zoomOut();
        }
    };

    const handleZoomKeydownEvent = (event) => {
        if (event.ctrlKey) {
            if (event.key === '+' || event.key === "=") {
                zoomIn();
                event.preventDefault();
            }
            else if (event.key === '-' || event.key === "_") {
                zoomOut();
                event.preventDefault();
            }
        }
    };

    const processImageContent = (blob) => {
        const imageUrl = URL.createObjectURL(blob);
        if (content) URL.revokeObjectURL(content);
        setContent(imageUrl);
        setFilePath("pasted_image");
    };

    function isImageSource(str) {
        const urlPattern = /\.(jpeg|jpg|png|gif)(\?.*)?$/i;
        const base64Pattern = /^data:image\/(jpeg|jpg|png|gif);base64,/i;

        return urlPattern.test(str) || base64Pattern.test(str);
    }

    const processTextContent = async (item) => {
        const text = await item.getType("text/plain");
        const textData = await text.text();
        if (content) URL.revokeObjectURL(content);

        if (isImageSource(textData)) {
            setContent(textData)
            setFilePath("pasted_image")
        }
        else {
            setContent(textData);
            setFilePath("text");
        }
    };

    const handlePaste = async (event) => {
        // note: for macos/safari, clipboard must be accessed synchronously via a transient user action

        if (document.getElementById("transposes-input")?.ariaExpanded === "true") {
            // transpose input focused
            return;
        }

        setLoading(true);
        try {
            if (navigator.clipboard?.read) {
                const clipboardItems = await navigator.clipboard.read();
                const lastItem = clipboardItems[clipboardItems.length - 1];

                if (["image/png", "image/jpeg", "image/gif"].some(type =>
                    lastItem.types.includes(type))
                ) {
                    const blob = await lastItem.getType("image/png") ||
                        await lastItem.getType("image/jpeg") ||
                        await lastItem.getType("image/gif");

                    processImageContent(blob);
                }
                else if (lastItem.types.includes("text/plain")) {
                    await processTextContent(lastItem);
                }
            }
            else if (event.clipboardData?.items) {
                const items = event.clipboardData.items;
                const lastItem = items[items.length - 1];

                if (lastItem.type.startsWith("image/")) {
                    processImageContent(lastItem.getAsFile());
                }
                else if (lastItem.type === "text/plain") {
                    lastItem.getAsString(text => {
                        if (content) URL.revokeObjectURL(content);

                        setContent(text);
                        setFilePath(isImageSource(text) ? "pasted_image" : "text");
                    });
                }
            }
            else {
                setLoading(null)
                return;
            }

            setLoading(false);
            setZoomLevel(0.2);
            window.scroll(0, 0);
        }
        catch (e) {
            setLoading(null)
        }
    };

    const handleDrop = async (event) => {
        event.preventDefault();
        document.documentElement.style.borderStyle = "unset";

        const items = event.dataTransfer.items;

        if (!items?.length) return;

        const item = items[items.length - 1];

        if (item.kind === 'file') {
            const file = item.getAsFile();

            if (content) URL.revokeObjectURL(content);

            if (file.type === "text/plain") {
                setContent(await file.text());
                setFilePath("text");
            }
            else {
                if (file.name.endsWith(".url")) {
                    setLoading(null)
                    return;
                }
                setContent(URL.createObjectURL(file));
                setFilePath("pasted_image");
            }
            setLoading(false);
            setZoomLevel(0.2);
            window.scroll(0, 0);
        }
        else {
            setLoading(null)
        }

    };

    const handleDragover = (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "copy"
        document.documentElement.style.borderStyle = "dotted";
    }

    const handleDragleave = (e) => {
        e.preventDefault()
        document.documentElement.style.borderStyle = "unset";
    }

    const isFilePathImage = (filePath) => {
        return filePath === "pasted_image" || filePath.endsWith(".png") || filePath.endsWith(".jpg") || filePath.endsWith(".jpeg") || filePath.endsWith(".gif")
    }

    const resetWindowDecorations = async () => {
        await appWindow.setDecorations(false)
        await appWindow.setDecorations(true)
    }

    const setClickthrough = async (enabled) => {
        if (enabled) {
            await appWindow.setIgnoreCursorEvents(true)
        }
        else {
            await appWindow.setIgnoreCursorEvents(false)
        }

        invoke("set_window_focusable", {focusable: isWindowFocused})
    }

    useEffect(() => {
        // set decorations to true (transparent bug workaround)
        resetWindowDecorations()

        const unlisten = listen("sheet_viewer_event", (event) => {
            setData(event.payload)
        })

        // const customMaximize = async () => {
        //     try {
        //         await appWindow.maximize();
        //
        //         const maximizedSize = await appWindow.outerSize();
        //
        //         await appWindow.unmaximize();
        //
        //         const newWidth = maximizedSize.width;
        //         const newHeight = maximizedSize.height - 10;
        //         await appWindow.setSize(new LogicalSize(newWidth, newHeight));
        //
        //         await appWindow.setPosition(new LogicalPosition(0, 0));
        //     }
        //     catch (error) {
        //         console.error('Failed to resize or reposition the window:', error);
        //     }
        // };

        const unlistenResize = appWindow.onResized(async () => {
            // if (await appWindow.isMaximized()) {
            //     await customMaximize();
            // }
        });

        // signal this window is ready for data
        emit("sheet_viewer_ready", null);

        // prevents window refresh
        document.addEventListener('keydown', preventRefreshOnKeydownCallback);

        // prevents caret
        document.addEventListener('keydown', preventCaretOnKeydownCallback);

        // zoom in/out listeners
        window.addEventListener('wheel', handleZoomWheelEvent);
        window.addEventListener('keydown', handleZoomKeydownEvent);

        // prevent context menu for zoom out
        window.addEventListener("contextmenu", preventDefaultEventCallback);

        // drag & drop / clipboard listeners
        document.addEventListener("dragover", handleDragover)
        document.addEventListener("dragleave", handleDragleave)
        document.addEventListener('drop', handleDrop);
        document.addEventListener("paste", handlePaste);

        return () => {
            unlisten.then(cleanFn => cleanFn());
            unlistenResize.then(cleanFn => cleanFn())
            removeEventListener("dragover", handleDragover)
            removeEventListener("dragleave", handleDragleave)
            removeEventListener("drop", handleDrop)
            removeEventListener("paste", handlePaste)
            removeEventListener('keydown', preventRefreshOnKeydownCallback);
            removeEventListener('keydown', preventCaretOnKeydownCallback);
            removeEventListener('wheel', handleZoomWheelEvent)
            removeEventListener("contextmenu", preventDefaultEventCallback)
            removeEventListener('keydown', handleZoomKeydownEvent)
        }
    }, []);

    useEffect(() => {
        const body = document.getElementById("sheet-viewer-body")

        if (loading === null) {
            document.documentElement.color = "black"
            body.style.color = "black";
        }
        else {
            document.documentElement.style.color = "white"
            body.style.color = "white"
            setIsInKeyboardArea(false)
        }

        if (!data.paused) {
            setClickthrough(false)
        }
        else {
            setClickthrough(true)
        }

        setIsContentHidden(false)
    }, [loading])

    useEffect(() => {
        toastOnPause(toaster, data.paused, data.canTranspose)
        if (loading === null) {
            setClickthrough(false)
        }
        else if (data.paused) {
            setClickthrough(true)
        }
        else {
            setClickthrough(false)
        }
    }, [data.paused]);

    useEffect(() => {
        invoke("set_window_focusable", {focusable: isWindowFocused})
    }, [isWindowFocused])

    useEffect(() => {
        if (isInKeyboardArea) {
            invoke("set_window_focusable", {focusable: true})
            appWindow.setFocus(true)
        }
        else {
            invoke("set_window_focusable", {focusable: isWindowFocused})
        }
    }, [isInKeyboardArea])

    const keyboardAreaUseEffect = (elementId, reactOn, condition) => {
        useEffect(() => {
            const focusIn = (e) => {
                setIsInKeyboardArea(true)
            }

            const focusOut = (e) => {
                setIsInKeyboardArea(false)
            }

            if (condition) {
                document.getElementById(elementId).addEventListener("focusin", focusIn)
                document.getElementById(elementId).addEventListener("focusout", focusOut)
            }

            return () => {
                document.getElementById(elementId)?.removeEventListener("focusin", focusIn)
                document.getElementById(elementId)?.removeEventListener("focusOut", focusOut)
            }
        }, [reactOn])
    }

    keyboardAreaUseEffect("transposes-input", isTransposesInputHidden, !isTransposesInputHidden)
    keyboardAreaUseEffect("zoom-step", isSettingsOpen, isSettingsOpen)

    return (
        <>
            <div id={"sheet-viewer-container"} style={{minHeight: "100vh", paddingBottom: loading !== null && 130}}>
                <div id={"file-display-container"} style={{width: loading !== null ? "fit-content" : "100%"}}>
                    {loading === null
                    ? (
                        <Callout
                            title="Paste or Drag & Drop your Sheet"
                            style={{
                                height: "100vh",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                                textAlign: "center",
                                background: "rgb(200, 200, 200)"
                            }}
                        >
                            <span>Image/Text or Paste the link</span>
                            <span>(.png, .jpg, .jpeg, .gif, .txt)</span>

                            <Icon
                                style={{marginTop: 25, marginBottom: 5}}
                                icon={"info-sign"}
                                size={IconSize.LARGE}
                                color={"gray"}
                            />
                            <span style={{color: "dimgray"}}>
                               <Tag minimal={true}>Pause All Binds</Tag> to enable click-through
                            </span>
                        </Callout>
                    )
                    :
                    loading === true
                        ? <Spinner style={{height: "100vh"}}/>
                    : (
                        <div>
                            <Callout id={"zoom-info"} className={"display-none"}>
                                x{(1 + zoomLevel - 0.2).toFixed(2)}
                            </Callout>
                            <div
                                id="fileViewer"
                                className={`user-select ${isContentHidden && "display-none"}`}
                                style={{background: "#2d2a32", cursor: "zoom-in"}}
                                onClick={zoomIn}
                                onContextMenu={zoomOut}
                            >
                                {filePath && (
                                    (isFilePathImage(filePath))
                                    ? (
                                        <img id="data" src={content} style={{ zoom: zoomLevel }} />
                                    )
                                    : (
                                        <span
                                            id="data"
                                            style={{
                                                zoom: zoomLevel,
                                                whiteSpace: "break-spaces",
                                            }}
                                        >
                                            {content}
                                      </span>
                                    )
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {!isTransposesInputHidden && loading !== null &&
                    <span className={"sheet-viewer-transpose-input"}>
                        <TransposeInput
                            toaster={toaster}
                            mainWindowTransposes={data.transposes}
                            canTranspose={true}
                            backend={false}
                            onUpdate={(transposes) => {
                                // transfer it to the main window, which will go update its transposes input, updating the backend
                                if (JSON.stringify(data?.transposes ?? "[]") != JSON.stringify(transposes))
                                    mainWindow.emit("sheet-viewer", {transposes})
                            }}
                        />
                    </span>
                }

            </div>


            {loading !== null &&
                <div className="sheet-viewer-footer">
                    <div className={"transposes-monitor-sheet-viewer"}>
                        <span style={{display: "flex", flexDirection: "column", gap: 5}}>
                            <Icon
                                className={"sheet-viewer-visibility-btn"}
                                icon={isContentHidden ? "eye-open" : "eye-off"}
                                size={IconSize.STANDARD}
                                onClick={() => {setIsContentHidden(!isContentHidden)}}
                            />
                            <Tooltip
                                content={
                                    isWindowFocused
                                    ?
                                    "Unfocus: to allow clicking on this window without taking away focus from other apps"
                                    :
                                    "Focus: for pasting, editing transposes or settings in this window"
                                }
                                compact={true}
                                usePortal={false}
                            >
                                <Icon
                                    className={"sheet-viewer-visibility-btn"}
                                    icon={"locate"}
                                    size={IconSize.STANDARD}
                                    color={isWindowFocused ? "red" : isInKeyboardArea ? "#2d72d2" : null}
                                    onClick={() => setIsWindowFocused(!isWindowFocused)}
                                />
                            </Tooltip>
                        </span>
                        <TransposeMonitor data={data}/>
                        <Icon
                            className={"sheet-viewer-visibility-btn"}
                            icon={"array-numeric"}
                            size={IconSize.STANDARD}
                            color={!isTransposesInputHidden && "black"}
                            onClick={() => setIsTransposesInputHidden(!isTransposesInputHidden)}
                        />
                    </div>

                    <SheetViewerSettings
                        isOpen={setIsSettingsOpen}
                        onUpdate={(settings) => {
                           if (settings?.transparency !== undefined) {
                               const background = `rgba(0, 0, 0, ${1 - settings.transparency / 10})`
                               document.documentElement.style.background = background
                               document.body.style.background = background
                           }

                           if (settings?.zoomStepSize !== undefined) {
                               setZoomStepSize(settings.zoomStepSize)
                           }
                        }}
                    />
                </div>
            }
        </>
    )
}

export default SheetViewer;