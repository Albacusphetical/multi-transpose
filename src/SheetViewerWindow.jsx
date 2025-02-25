import {useEffect, useState} from "react";
import {emit, listen} from "@tauri-apps/api/event";
import {
    overlayToasterDefaultProps, preventCaretOnKeydownCallback,
    preventRefreshOnKeydownCallback,
    toastOnPause
} from "./utils.js";
import {Callout, OverlayToaster, Spinner} from "@blueprintjs/core";
import TransposeMonitor from "./components/TransposeMonitor.jsx";

const toaster = OverlayToaster.createAsync({...overlayToasterDefaultProps, position: "top-right"});

function SheetViewer() {
    const [data, setData] = useState({
        paused: undefined,
        selectedIndex: undefined,
        transposes: undefined,
        canTranspose: undefined,
        keybindConfig: undefined,
    });

    const [loading, setLoading] = useState(null)
    const [filePath, setFilePath] = useState("")
    const [content, setContent] = useState()
    const [zoomLevel, setZoomLevel] = useState(0.1);
    const zoomConstant = 0.01;

    const zoomIn = () => setZoomLevel(prev => prev + zoomConstant);
    const zoomOut = () => setZoomLevel(prev =>
        prev - zoomConstant >= 0.2 ? prev - zoomConstant : prev
    );

    const handleWheelEvent = (event) => {
        if (event.ctrlKey) {
            event.preventDefault();
            event.deltaY < 0 ? zoomIn() : zoomOut();
        }
    };

    const handleKeydownEvent = (event) => {
        if (event.ctrlKey) {
            if (event.key === '+') {
                zoomIn();
                event.preventDefault();
            }
            else if (event.key === '-') {
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
        setLoading(true);
        setTimeout(async () => {
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
                // Fallback handling
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
        }, 1);
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

    useEffect(() => {
        const unlisten = listen("sheet_viewer_event", (event) => {
            setData(event.payload)
        })


        document.addEventListener("dragover", handleDragover)
        document.addEventListener("dragleave", handleDragleave)
        document.addEventListener('drop', handleDrop);
        document.addEventListener("paste", handlePaste);

        // signal this window is ready for data
        emit("sheet_viewer_ready", null);

        // prevents window refresh
        document.addEventListener('keydown', preventRefreshOnKeydownCallback);

        // prevents caret
        document.addEventListener('keydown', preventCaretOnKeydownCallback);

        // zoom in/out listeners
        window.addEventListener('wheel', handleWheelEvent);
        window.addEventListener('keydown', handleKeydownEvent);

        return () => {
            unlisten.then(cleanFn => cleanFn());
            removeEventListener("dragover", handleDragover)
            removeEventListener("dragleave", handleDragleave)
            removeEventListener("drop", handleDrop)
            removeEventListener("paste", handlePaste)
            removeEventListener('keydown', preventRefreshOnKeydownCallback);
            removeEventListener('keydown', preventCaretOnKeydownCallback);
            removeEventListener('wheel', handleWheelEvent)
            removeEventListener('keydown', handleKeydownEvent)
        }
    }, []);

    useEffect(() => {
        const body = document.getElementById("sheet-viewer-body")
        if (loading === null) {
            document.documentElement.style = "background: inherit; color: black;"
            body.style = "background: inherit; color: black;";
        }
        else {
            document.documentElement.style = "background: black; color: white; font-family: Verdana;"
            body.style = "background: black; color: white; font-family: Verdana;";
        }
    }, [loading])


    useEffect(() => {
        toastOnPause(toaster, data.paused, data.canTranspose)
    }, [data.paused]);

    return (
        <>
            <div id={"sheet-viewer-container"} style={{minHeight: "100vh", paddingBottom: 130}}>
                <div style={{display: "flex", justifyContent: "center", overflowX: "hidden", height: "100%"}}>
                    {loading === null
                    ? (
                        <Callout
                            title="Paste or Drag & Drop your Sheet"
                            style={{
                                height: "100vh",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                textAlign: "center",
                                background: "rgb(200, 200, 200)"
                            }}
                        >
                            <span>Image/Text or Paste the link</span>
                            <span>(.png, .jpg, .jpeg, .gif, .txt)</span>
                        </Callout>
                    )
                    :
                    loading === true
                        ? <Spinner style={{height: "100vh"}}/>
                    : (
                        <div>
                            {/*<Callout>Zoom {1 + zoomLevel.toFixed(2)}</Callout>*/}
                            <div id="fileViewer" style={{background: "#2d2a32"}}>
                                {filePath && (
                                    (filePath === "pasted_image" || filePath.endsWith(".png") || filePath.endsWith(".jpg") || filePath.endsWith(".jpeg") || filePath.endsWith(".gif"))
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
            </div>

            {loading !== null &&
                <div className="transposes-monitor-sheet-viewer">
                    <TransposeMonitor data={data}/>
                </div>
            }
        </>
    )
}

export default SheetViewer;