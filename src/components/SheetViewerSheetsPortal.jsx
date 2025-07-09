import {
    Icon,
    IconSize,
    Drawer,
    Position,
    Dialog,
    Button,
    TagInput,
    InputGroup,
    CardList,
    Card, EntityTitle, Tag
} from "@blueprintjs/core";
import {forwardRef, useEffect, useImperativeHandle, useState} from "react";
import TransposeInput from "./TransposeInput.jsx";
import {formatDateForCard, generalAppToastConfig} from "../utils/generalUtils.js";
import {deleteSheetData, getSheetRefs, writeSheetData} from "../services/storage/sheetStorageService.js";

const SheetViewerSheetsPortal = forwardRef(({ sheetData, toaster, transposes, onChange = () => {} }, ref) => {
    // TODO: properly set up editing for each sheet
    const [activeId, setActiveId] = useState(undefined)
    const [isPortalOpen, setIsPortalOpen] = useState(false)
    const [isModifyOpen, setIsModifyOpen] = useState(false)
    const [saveEditTitle, setSaveEditTitle] = useState(undefined)
    const [saveEditLabels, setSaveEditLabels] = useState([])
    const [saveEditTransposes, setSaveEditTransposes] = useState([])

    const [localSheets, setLocalSheets] = useState([])

    useImperativeHandle(ref, () => ({
        openModifyDialog: () => setIsModifyOpen(true)
    }));

    const handleSave = async (id = null) => {
        const date = new Date()

        let newTransposes = saveEditTransposes?.length > 0 ? saveEditTransposes : [0]
        const metadata = {
            dateModified: date.toISOString(),
            title: saveEditTitle ?? "N/A",
            labels: saveEditLabels,
            transposes: newTransposes,
        }

        if (id) metadata.id = id

        const sheet = await writeSheetData({sheetData, metadata})
        localSheets.push(sheet)
        setActiveId(sheet.id)

        onChange(sheet)

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

    const sortedLocalSheets = (localSheets, activeIndex) => {
        if (!Array.isArray(localSheets)) return [];

        const hasValidIndex =
            typeof activeIndex === "number" &&
            activeIndex >= 0 &&
            activeIndex < localSheets.length;

        const selectedSheet = hasValidIndex ? localSheets[activeIndex] : null;

        const sorted = localSheets
            .filter((_, i) => i !== activeIndex)
            .toSorted((a, b) => new Date(b.dateModified) - new Date(a.dateModified));

        if (selectedSheet) {
            sorted.unshift(selectedSheet);
        }

        return sorted;
    };

    useEffect(() => {
        // load local sheets
        getSheetRefs().then((res) => {
            if (!res || !res?.sheets) {
                return
            }

            setLocalSheets(sortedLocalSheets(res.sheets))
        })
    }, []);

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
                style={{padding: 10}}
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

                <CardList>
                    {sortedLocalSheets(localSheets, activeId).map((sheet) => (
                        <Card
                            key={sheet.id}
                            className={"sheets-portal-sheet-card"}
                            interactive={true}
                            onClick={() => {
                                onChange(sheet);
                                setActiveId(sheet.id);
                            }}
                            selected={activeId === sheet.id}
                            style={{position: "relative"}}
                        >
                            <div
                                style={{
                                    position: "absolute",
                                    top: 8,
                                    right: 8,
                                    display: "flex",
                                    gap: 4,
                                    zIndex: 1,
                                }}
                                onClick={(e) => e.stopPropagation()} // prevent parent onClick
                            >
                                <Button
                                    className={"sheets-portal-icon-button"}
                                    icon="edit"
                                    small
                                    minimal
                                    onClick={() => {
                                        setIsModifyOpen(true)
                                    }}
                                />
                                <Button
                                    className={"sheets-portal-icon-button"}
                                    icon="trash"
                                    small
                                    minimal
                                    onClick={() => {
                                        deleteSheetData(sheet.id)
                                        if (activeId === sheet.id) {
                                            setActiveId(undefined)
                                        }

                                        setLocalSheets(localSheets.filter(item => item.id !== sheet.id))
                                    }}
                                />
                            </div>

                            <EntityTitle
                                title={sheet.title}
                                subtitle={<>{formatDateForCard(sheet.dateModified)}</>}
                                tags={sheet?.labels.map((label, idx) => (
                                    <Tag key={idx} intent={"none"} minimal={true}>
                                        {label}
                                    </Tag>
                                ))}

                            />
                        </Card>
                    ))}
                </CardList>
            </Drawer>

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
        </span>
    )
})


export default SheetViewerSheetsPortal