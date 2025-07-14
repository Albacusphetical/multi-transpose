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
import {forwardRef, useEffect, useImperativeHandle, useRef, useState} from "react";
import TransposeInput from "./TransposeInput.jsx";
import {formatDateForCard, generalAppToastConfig} from "../utils/generalUtils.js";
import {deleteSheetData, getSheetRefs, writeSheetData} from "../services/storage/sheetStorageService.js";

const SheetViewerSheetsPortal = forwardRef(({ sheetData, toaster, transposes, onChange = () => {} }, ref) => {
    const [activeId, setActiveId] = useState(undefined)
    const [isPortalOpen, setIsPortalOpen] = useState(false)
    const [isModifyOpen, setIsModifyOpen] = useState(false)
    const [saveEditTitle, setSaveEditTitle] = useState(undefined)
    const [saveEditLabels, setSaveEditLabels] = useState([])
    const [saveEditTransposes, setSaveEditTransposes] = useState([])
    const saveEditTitleRef = useRef(null)
    const saveEditLabelsRef = useRef(null)
    const saveEditTransposesRef = useRef()
    const [sheetSelected, setSheetSelected] = useState()

    const [localSheets, setLocalSheets] = useState({})

    useImperativeHandle(ref, () => ({
        openModifyDialog: () => {
            if (sheetSelected) {
                setIsModifyOpen({id: sheetSelected.id})
            }
            else {
                setIsModifyOpen(true)
            }
        }
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
        localSheets[sheet.id] = sheet
        setActiveId(sheet.id)

        onChange(sheet)
        setSheetSelected(sheet)

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
        localSheets = Object.values(localSheets)
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

    const setupEditDialogInputs = (sheet) => {
        setTimeout(() => {
            saveEditTitleRef.current.value = sheet.title
            setSaveEditTitle(sheet.title)
            setSaveEditLabels(sheet.labels)
            setSaveEditTransposes(sheet.transposes)
            saveEditTransposesRef.current.value = sheet.transposes.join(" ")
        }, 0)
    }

    useEffect(() => {
        // load local sheets
        setTimeout(() => {
            getSheetRefs().then((res) => {
                if (!res || !res?.sheets) {
                    return
                }

                setLocalSheets(sortedLocalSheets(res.sheets))
            })
        }, 0)
    }, [localSheets]);

    useEffect(() => {
        if (!isModifyOpen) setSaveEditTransposes(transposes)
    }, [transposes])

    useEffect(() => {
        if (isModifyOpen?.id) {
            // edit mode
            const sheet = localSheets.find((s) => s.id === isModifyOpen.id);
            requestAnimationFrame(() => {setupEditDialogInputs(sheet)})
        }
    }, [isModifyOpen]);


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
                <Button onClick={() => setIsModifyOpen(true)}/>

                <CardList>
                    {sortedLocalSheets(localSheets, activeId).map((sheet) => (
                        <Card
                            key={sheet.id}
                            className={"sheets-portal-sheet-card"}
                            interactive={true}
                            onClick={() => {
                                onChange(sheet);
                                setActiveId(sheet.id);
                                setSheetSelected(sheet)
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
                                        setIsModifyOpen({id: sheet.id})
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

                                        setLocalSheets(localSheets.filter((item) => item.id !== sheet.id))
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
                    inputRef={(ref) => {saveEditTitleRef.current = ref}}
                    onInput={(e) => setSaveEditTitle(e.target.value)}
                    fill={true}
                    leftIcon={"new-drawing"}
                    placeholder={"Enter title"}
                />

                <TagInput
                    inputRef={(ref) => {saveEditLabelsRef.current = ref}}
                    leftIcon={"tag"}
                    placeholder={"Labels"}
                    values={saveEditLabels}
                    onChange={setSaveEditLabels}
                />

                <TransposeInput
                    ref={saveEditTransposesRef}
                    toaster={toaster}
                    parentWindowTransposes={transposes}
                    canTranspose={true}
                    backend={false}
                    onUpdate={setSaveEditTransposes}
                />

                <Button onClick={() => handleSave(isModifyOpen?.id)}>Submit</Button>
            </Dialog>
        </span>
    )
})


export default SheetViewerSheetsPortal