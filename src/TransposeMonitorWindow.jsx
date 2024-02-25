import {useEffect, useState} from "react";
import {emit, listen} from "@tauri-apps/api/event";
import {
    overlayToasterDefaultProps,
    preventDefaultEventCallback,
    preventRefreshOnKeydownCallback,
    toastOnPause
} from "./utils.js";
import {OverlayToaster} from "@blueprintjs/core";
import TransposeMatrixItem from "./components/TransposeMatrixItem.jsx";
import BlankTransposeMatrixItem from "./components/BlankTransposeMatrixItem.jsx";

const monitorToaster = OverlayToaster.createAsync({...overlayToasterDefaultProps, position: "bottom"});

function TransposeMonitorWindow() {
    const [data, setData] = useState({
        paused: undefined,
        selectedIndex: undefined,
        transposes: undefined,
        canTranspose: undefined,
        keybindConfig: undefined,
    });

    const PrevTransposeItem = () => {
        if (data?.selectedIndex === undefined || data?.transposes === undefined) return <BlankTransposeMatrixItem/>

        const index = (data.selectedIndex + data.transposes.length - 1) % data.transposes.length;
        const transpose = data.transposes[index];

        return (
            index !== data.selectedIndex && transpose !== undefined
                ?
                <TransposeMatrixItem index={index} transpose={transpose} selected={false} />
                :
                <BlankTransposeMatrixItem/>
        )
    }

    const CurrentTransposeItem = () => {
        if (data?.selectedIndex === undefined || data?.transposes === undefined) return <BlankTransposeMatrixItem/>

        const transpose = data.transposes[data.selectedIndex];

        return (
            transpose !== undefined
                ?
                <TransposeMatrixItem index={data.selectedIndex} transpose={transpose} selected={true} />
                :
                <BlankTransposeMatrixItem/>
        )    }

    const NextTransposeItem = () => {
        if (data?.selectedIndex === undefined || data?.transposes === undefined) return <BlankTransposeMatrixItem/>

        const index = (data.selectedIndex + 1) % data.transposes.length;
        const transpose = data.transposes[index];

        return (
            index !== data.selectedIndex && transpose !== undefined
                ?
                <TransposeMatrixItem index={index} transpose={transpose} selected={false} />
                :
                <BlankTransposeMatrixItem/>
        )
    }

    useEffect(() => {
        const unlisten = listen("transpose_monitor_event", (event) => {
            setData(event.payload)
        })

        // signal this window is ready for data
        emit("transpose_monitor_ready", null);

        // prevents window refresh
        document.addEventListener('keydown', preventRefreshOnKeydownCallback);
        document.addEventListener('contextmenu', preventDefaultEventCallback);

        return () => {
            unlisten.then((cleanFn) => cleanFn());
            removeEventListener('keydown', preventRefreshOnKeydownCallback);
            removeEventListener('contextmenu', preventDefaultEventCallback);
        }
    }, []);

    useEffect(() => {
        toastOnPause(monitorToaster, data.paused, data.canTranspose)
    }, [data.paused]);

    return (
        <div className={"container"}>
            <span className={"transposes-monitor transpose-matrix-content"}>
                <PrevTransposeItem/>
                <CurrentTransposeItem/>
                <NextTransposeItem/>
            </span>
        </div>
    )
}

export default TransposeMonitorWindow;