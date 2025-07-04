import {Button, Slider, Tooltip} from "@blueprintjs/core";
import {useEffect, useState} from "react";
import {emit} from "@tauri-apps/api/event";
import {defaultAppDataSettings, getAppDataSettings, writeAppDataSettings} from "../services/storage/settingsService.js";

const Volume = () => {
    const [muted, setMuted] = useState(defaultAppDataSettings.muted);
    const [volume, setVolume] = useState(defaultAppDataSettings.volume);

    const muteHandler = async () => {
        setMuted(!muted);
        await writeAppDataSettings({muted: !muted});
    }

    const volumeHandler = async (value) => {
        setVolume(value);
        await writeAppDataSettings({volume: value});
    }

    useEffect(() => {
        const setData = async () => {
            const settings = await getAppDataSettings()
            setMuted(settings.muted)
            setVolume(settings.volume)
        }

        setData()
    }, []);

    useEffect(() => {
        emit("backend_event", {muted});
    }, [muted]);

    useEffect(() => {
        emit("backend_event", {volume});
    }, [volume]);

    return (
        <span className={"volume"}>
            <span style={{paddingRight: 12}}>
                <Tooltip content={!muted && volume < 0.1 ? "Volume Off" : muted ? "Unmute" : "Mute"}>
                    <Button onClick={muteHandler} icon={muted || volume < 0.1 ? "volume-off" : "volume-up"}/>
                </Tooltip>
            </span>

            <Slider
                min={0.0}
                max={2.0}
                value={volume}
                stepSize={0.1}
                onChange={volumeHandler}
                labelRenderer={false}
                labelStepSize={0.1}
            />
        </span>
    )
}

export default Volume;