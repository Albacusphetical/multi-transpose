import {Icon, IconSize, Drawer, Position, Dialog, Button, TagInput, InputGroup} from "@blueprintjs/core";
import {useEffect, useState} from "react";
import TransposeInput from "./TransposeInput.jsx";
import {generalAppToastConfig} from "../utils/generalUtils.js";
import {writeSheetData} from "../services/storage/sheetStorageService.js";

function SheetViewerSheetsPortal({sheetData, toaster, transposes, onChange = () => {}}) {
    const [isPortalOpen, setIsPortalOpen] = useState(false)
    const [isModifyOpen, setIsModifyOpen] = useState(false)
    const [saveEditTitle, setSaveEditTitle] = useState(undefined)
    const [saveEditLabels, setSaveEditLabels] = useState([])
    const [saveEditTransposes, setSaveEditTransposes] = useState([])

    const handleSave = async () => {
        const date = new Date()

        const metadata = {
            dateModified: date.toISOString(),
            title: saveEditTitle ?? "N/A",
            labels: saveEditLabels,
            transposes: saveEditTransposes.length > 0 ? saveEditTransposes : [0],
        }

        await writeSheetData({sheetData, metadata})

        onChange(metadata)

        toaster.then((toaster) => {
            toaster.clear();

            toaster.show({
                ...generalAppToastConfig,
                message: "Saved successfully!",
                icon: "saved",
                intent: "success",
                timeout: 2000,
                isCloseButtonShown: false,
            });

            setSaveEditTransposes(transposes)
            setSaveEditLabels([])
            setSaveEditTitle(undefined)

            setIsModifyOpen(false)
        });
    }

    useEffect(() => {
        if (!isModifyOpen) setSaveEditTransposes(transposes)
    }, [transposes])

    return (
        <span id={"sheet-viewer-sheets-portal"}>
            <Icon
                id={"sheet-viewer-sheets-portal-button"}
                className={"sheet-viewer-footer-side-button"}
                icon={"document-open"}
                size={IconSize.LARGE}
                onClick={() => {setIsPortalOpen(!isPortalOpen)}}
            />

            <Drawer
                title={"Sheets Portal"}
                icon={"document"}
                usePortal={true}
                canEscapeKeyClose={false}
                canOutsideClickClose={true}
                hasBackdrop={false}
                position={Position.BOTTOM}
                isOpen={isPortalOpen}
                onClose={(e) => setIsPortalOpen(false)}
            >
                <Button onClick={() => setIsModifyOpen(true)}></Button>
                <Dialog
                    className={"sheets-save"}
                    title={"Save/Edit"}
                    icon={"document-share"}
                    usePortal={true}
                    canEscapeKeyClose={false}
                    canOutsideClickClose={false}
                    hasBackdrop={false}
                    position={Position.BOTTOM}
                    isOpen={isModifyOpen}
                    onClose={(e) => setIsModifyOpen(false)}
                >
                    <InputGroup
                        onInput={(e) => setSaveEditTitle(e.target.value)}
                        fill={true}
                        leftIcon={"new-drawing"}
                        placeholder={"Enter title"}
                    />

                    <TagInput
                        leftIcon={"tag"}
                        placeholder={"Labels"}
                        values={saveEditLabels}
                        onChange={setSaveEditLabels}
                    />

                    <TransposeInput
                        toaster={toaster}
                        parentWindowTransposes={transposes}
                        canTranspose={true}
                        backend={false}
                        onUpdate={setSaveEditTransposes}
                    />

                    <Button onClick={handleSave}>Submit</Button>
                </Dialog>
            </Drawer>

        </span>
    )
}


export default SheetViewerSheetsPortal