import {Drawer, Icon, IconSize, NumericInput, Position, Slider, Text} from "@blueprintjs/core";
import {useEffect, useState} from "react";

function SheetViewerSettings({onUpdate = () => {}}) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [transparency, setTransparency] = useState(Number(window.localStorage.getItem("transparency")) ?? 50)
    const [zoomStepSize, setZoomStepSize] = useState(Number(
        window.localStorage.getItem("zoomConstant")  // i'm stupid ok, don't judge :~)
        || window.localStorage.getItem("zoomStepSize")) ?? 0.1)

    const transparencyHandler = (val) => {
        setTransparency(val)
        window.localStorage.setItem("transparency", val)
        onUpdate({transparency: val})
    }

    const zoomStepSizeHandler = (val) => {
        setZoomStepSize(val)
        window.localStorage.setItem("zoomStepSize", val)
        onUpdate({zoomStepSize: val})
    }

    useEffect(() => {
        onUpdate({transparency: transparency, zoomStepSize: zoomStepSize})
    }, []);

    return (
        <span id={"sheet-viewer-settings"}>
            <Icon
                id={"sheet-viewer-settings-button"}
                icon={"settings"}
                size={IconSize.LARGE}
                onClick={() => setIsSettingsOpen(true)}
            />

            <Drawer
                title={"Settings"}
                icon={"cog"}
                usePortal={false}
                canEscapeKeyClose={false}
                canOutsideClickClose={true}
                hasBackdrop={false}
                position={Position.BOTTOM}
                size={"30vh"}
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            >
                <div id={"sheet-viewer-settings-content"} className={"user-select"}>
                    <span>
                        <p>Transparency</p>
                        <Slider
                            min={0}
                            max={10}
                            stepSize={0.01}
                            labelStepSize={100}
                            value={transparency}
                            onChange={transparencyHandler}
                        />
                    </span>
                    
                    <span>
                        <p>Zoom Step Size</p>
                        <NumericInput
                            onValueChange={(valAsNum, valAsString, el) => zoomStepSizeHandler(valAsNum)}
                            value={zoomStepSize}
                            min={0.01}
                            max={10}
                            stepSize={0.1}
                        />
                    </span>
                </div>
            </Drawer>
        </span>
    )
}

export default SheetViewerSettings;