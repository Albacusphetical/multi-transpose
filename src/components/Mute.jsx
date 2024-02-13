import {Button, Tooltip} from "@blueprintjs/core";
import {useEffect, useState} from "react";
import {emit} from "@tauri-apps/api/event";

const Mute = () => {
    const [muted, setMuted] = useState(false);

    const muteHandler = () => {
        setMuted(!muted);
        localStorage.setItem("muted", !muted)
    }

    useEffect(() => {
        setMuted(Boolean(localStorage.getItem("muted")) || false)
    }, []);

    useEffect(() => {
        emit("backend_event", {muted});
    }, [muted]);

    return (
        <Tooltip content={muted ? "Unmute" : "Mute"}>
            <Button onClick={muteHandler} icon={muted ? "volume-off" : "volume-up"}/>
        </Tooltip>
    )
}

export default Mute;