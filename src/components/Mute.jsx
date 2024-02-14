import {Button, Tooltip} from "@blueprintjs/core";
import {useEffect, useState} from "react";
import {emit} from "@tauri-apps/api/event";
import {getAppDataSettings, writeAppDataSettings} from "../utils.js";

const Mute = () => {
    const [muted, setMuted] = useState(false);

    const muteHandler = async () => {
        setMuted(!muted);
        await writeAppDataSettings({muted: !muted});
    }

    useEffect(() => {
        const setData = async () => {
            const settings = await getAppDataSettings()
            setMuted(settings.muted)
        }

        setData()
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