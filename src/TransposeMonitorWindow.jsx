import {useEffect, useState} from "react";
import {emit, listen} from "@tauri-apps/api/event";
import {
    overlayToasterDefaultProps, preventCaretOnKeydownCallback,
    preventDefaultEventCallback,
    preventRefreshOnKeydownCallback,
    toastOnPause
} from "./utils/generalUtils.js";
import {OverlayToaster} from "@blueprintjs/core";
import TransposeMonitor from "./components/TransposeMonitor.jsx";


const monitorToaster = OverlayToaster.createAsync({...overlayToasterDefaultProps, position: "bottom"});

function TransposeMonitorWindow() {
    const [data, setData] = useState({
        paused: undefined,
        selectedIndex: undefined,
        transposes: undefined,
        canTranspose: undefined,
        keybindConfig: undefined,
    });

    useEffect(() => {
        const unlisten = listen("transpose_monitor_event", (event) => {
            setData(event.payload)
        })

        // signal this window is ready for data
        emit("transpose_monitor_ready", null);

        // prevents window refresh
        document.addEventListener('keydown', preventRefreshOnKeydownCallback);
        document.addEventListener('contextmenu', preventDefaultEventCallback);

        // prevents caret
        document.addEventListener('keydown', preventCaretOnKeydownCallback);

        return () => {
            unlisten.then((cleanFn) => cleanFn());
            removeEventListener('keydown', preventRefreshOnKeydownCallback);
            removeEventListener('contextmenu', preventDefaultEventCallback);
            removeEventListener('keydown', preventCaretOnKeydownCallback);
        }
    }, []);

    useEffect(() => {
        toastOnPause(monitorToaster, data.paused, data.canTranspose)
    }, [data.paused]);

    return (
        <div className={"container"}>
            <TransposeMonitor data={data} />
        </div>
    )
}

export default TransposeMonitorWindow;