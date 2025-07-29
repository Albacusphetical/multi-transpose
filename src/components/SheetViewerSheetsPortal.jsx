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
    Card, EntityTitle, Tag, Tabs, Tab, TabsExpander, SegmentedControl, Spinner
} from "@blueprintjs/core";
import {forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState} from "react";
import TransposeInput from "./TransposeInput.jsx";
import {formatDateForCard, generalAppToastConfig, onLinkClick} from "../utils/generalUtils.js";
import {deleteSheetData, getSheetRefs, writeSheetData} from "../services/storage/sheetStorageService.js";
import SheetPortalEditButton from "./SheetPortalEditButton.jsx";
import {invoke} from "@tauri-apps/api";
import SheetsPortalSearchBar from "./SheetsPortalSearchBar.jsx";

const SheetViewerSheetsPortal = forwardRef(({ sheetData, toaster, transposes, onChange = () => {} }, ref) => {
    const [mode, setMode] = useState("saved") // "saved", "arijan"
    const [activeId, setActiveId] = useState(undefined)
    const [isPortalOpen, setIsPortalOpen] = useState(false)
    const [isModifyOpen, setIsModifyOpen] = useState(false)
    const [saveEditTitle, setSaveEditTitle] = useState(undefined)
    const [saveEditLabels, setSaveEditLabels] = useState([])
    const [saveEditTransposes, setSaveEditTransposes] = useState([])
    const saveEditTitleRef = useRef(null)
    const saveEditLabelsRef = useRef(null)
    const saveEditTransposesRef = useRef()

    const [sheetsLoading, setSheetsLoading] = useState(true)
    const [sheetSelected, setSheetSelected] = useState()
    const [localSheets, setLocalSheets] = useState({})
    const [arijanSheets, setArijanSheets] = useState({})
    const trelloCardURL = "https://trello.com/c"

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

    const sortedSheets = (sheets, activeIndex, type = "saved") => {
        sheets = Object.values(sheets)
        if (!Array.isArray(sheets)) return [];

        const hasValidIndex =
            typeof activeIndex === "number" &&
            activeIndex >= 0 &&
            activeIndex < sheets.length;

        const selectedSheet = hasValidIndex ? sheets[activeIndex] : null;

        const comparator = (a, b) => {
            if (type === "saved") return new Date(b.dateModified) - new Date(a.dateModified)

            // arijan
            return b.favs - a.favs
        }

        const sorted = sheets
            .filter((_, i) => i !== activeIndex)
            .toSorted(comparator);

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

    const searchVpSheets = useCallback(( {title, label, trello} ) => {
        setSheetsLoading(true)
        const endpoint = `/api/search?title=${encodeURIComponent(title)}&label=${encodeURIComponent(label?.join(" "))}&board=${encodeURIComponent(trello)}`;

        invoke("proxy_vp_sheets", { opts: { endpoint } })
        .then(response => {
            const formatted = response.map(sheet => ({
                id: sheet.shortlink,
                labels: [sheet.lname],
                ...sheet,
            }));

            setArijanSheets(formatted);
        })
        .catch(error => {
            console.error("Search error:", error);
        })
        .finally(() => {
            setSheetsLoading(false)
        })
    }, [])

    const searchLocalSheets = useCallback(({title = "", label = []}) => {
        setSheetsLoading(true)
        getSheetRefs().then((res) => {
            if (!res || !res?.sheets) {
                return
            }
            const filtered = Object.fromEntries(
                Object.entries(res?.sheets).filter(([key, sheet]) => {
                    console.log(title)
                    const titleMatch =
                        title === "" || sheet.title?.toLowerCase().includes(title?.toLowerCase());

                    const labelsMatch =
                        label.length === 0 ||
                        (Array.isArray(sheet.labels) &&
                            label.every(l => sheet.labels.includes(l)));

                    return titleMatch && labelsMatch;
                })
            );

            setLocalSheets(sortedSheets(filtered))
        })
        .finally(() => {
            setSheetsLoading(false)
        })
    }, [])

    useEffect(() => {
        // load sheets
        setTimeout(() => {
            if (mode === "saved") {
                searchLocalSheets()
            }
            else {
                searchVpSheets()
            }
        }, 0)
    }, [mode]); // TODO: needs to react more to user changes

    useEffect(() => {
        if (!isModifyOpen) setSaveEditTransposes(transposes)
    }, [transposes])

    useEffect(() => {
        if (isModifyOpen?.id) {
            // edit mode
            const sheet = mode === "saved" ? localSheets.find((s) => s.id === isModifyOpen.id) : arijanSheets.find((s) => s.id === isModifyOpen.id);
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
                title={
                    <div style={{display: "flex", alignItems: "center", gap: 7}}>
                        Sheets Portal
                        <SheetPortalEditButton
                            onClick={() => {
                                if (sheetSelected?.id) {
                                    setIsModifyOpen({id: sheetSelected.id})
                                }
                                else {
                                    setIsModifyOpen(true)
                                }
                            }}
                        />
                    </div>
                }
                usePortal={true}
                canEscapeKeyClose={false}
                canOutsideClickClose={true}
                hasBackdrop={false}
                position={Position.BOTTOM}
                isOpen={isPortalOpen}
                onClose={(e) => setIsPortalOpen(false)}
            >
                <div>
                    <SegmentedControl
                        options={[
                            {
                                label: "Saved",
                                value: "saved",
                                icon: "saved"
                            },
                            {
                                label: "Online",
                                value: "arijan",
                                icon: "globe-network"
                            },
                        ]}
                        defaultValue="saved"
                        onValueChange={(val, _) => {
                            setMode(val)
                        }}
                        style={{width: "fit-content", margin: 15}}
                    />

                    <SheetsPortalSearchBar
                        style={{marginLeft: 15}}
                        onSearch={mode === "saved" ? searchLocalSheets : searchVpSheets}
                    />
                </div>

                <CardList bordered={false}>
                    {sheetsLoading ? <Spinner/>
                        :
                        (mode === "saved" ? sortedSheets(localSheets, activeId) : sortedSheets(arijanSheets, activeId, "arijan")).map((sheet) => (
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
                                    <SheetPortalEditButton
                                        small={true}
                                        onClick={() => {
                                            // TODO: sheet editing bug, if you didnt select the sheet content in the portal, it will overwrite it with pasted content, not intended
                                            setIsModifyOpen({id: sheet.id})
                                        }}
                                        mainIcon={mode === "arijan"}
                                    />

                                    {mode === "saved" &&
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
                                    }

                                    {mode === "arijan" &&
                                        <Button
                                            className={"sheets-portal-icon-button"}
                                            icon="globe-network"
                                            small
                                            minimal
                                            onClick={() => {
                                                const link = `${trelloCardURL}/${sheet.shortlink}`
                                                onLinkClick(`c/${sheet.shortlink}`, link, `${sheet.board} - ${link}`)
                                            }}
                                        />
                                    }
                                </div>

                                <EntityTitle
                                    title={sheet.title}
                                    subtitle={
                                        <>
                                            {mode === "saved"
                                                ?
                                                formatDateForCard(sheet.dateModified)
                                                :
                                                <div style={{display: "flex", alignItems: "center", gap: 5}}>
                                                    <Icon icon={"heart"} color={"lightgray"} />
                                                    <span>{sheet.favs}</span>
                                                </div>
                                            }
                                        </>
                                    }
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