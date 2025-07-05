import {Icon, IconSize, Drawer, Position, Dialog, Button} from "@blueprintjs/core";
import {useState} from "react";

function SheetViewerSheetsPortal() {
    const [isPortalOpen, setIsPortalOpen] = useState(false)
    const [isModifyOpen, setIsModifyOpen] = useState(false)

    return (
        <span id={"sheet-viewer-settings"}>
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

                </Dialog>
            </Drawer>

        </span>
    )
}


export default SheetViewerSheetsPortal