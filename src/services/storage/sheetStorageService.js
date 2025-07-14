import {v4 as uuidv4} from "uuid"
import {getAppDataFilePath, getJSONFile, sanitizeFileName, writeJSONFile} from "../../utils/fileUtils.js";
import {createDir, exists, removeFile, writeBinaryFile, writeTextFile} from "@tauri-apps/api/fs";
import {appDataDir} from "@tauri-apps/api/path";

const SHEET_REFS_FILE = "sheets/sheets.json"

export const defaultSheetRefs = {sheets: {}}

export const getSheetRefs = async () => {
    return getJSONFile(SHEET_REFS_FILE, defaultSheetRefs)
}

export const writeSheetData = async (data) => {
    const sheetBinId = data.metadata?.id ?? uuidv4()
    const sheetsDirName = await getAppDataFilePath("sheets/")
    const sheetsDirExists = await exists(sheetsDirName)
    if (!sheetsDirExists) {
        await createDir(sheetsDirName)
    }

    const sheetsData = await getJSONFile("sheets/sheets.json", defaultSheetRefs)

    let res;

    data.metadata.id = sheetBinId

    if (!data?.sheetData) {
        // save the transposes without the sheet
        res = {...data.metadata, type: "transposes"}
    }
    else {
        let path = `${sheetsDirName}${sheetBinId}`

        const type = data.sheetData.type
        switch (type) {
            case "image-link":
                res = {...data.metadata, type, url: data.sheetData.content}
                break
            case "image":
                const blob = await fetch(data.sheetData.content).then(res => res.blob())
                const buffer = await blob.arrayBuffer()
                const uint8 = new Uint8Array(buffer)

                await writeBinaryFile(path, uint8)

                res = {...data.metadata, type, path: `sheets/${sheetBinId}`}

                break
            case "text":
                path += ".txt"

                await writeTextFile(path, data.sheetData.content)

                res = {...data.metadata, type, path: `sheets/${sheetBinId}.txt`}
                break
        }
    }

    sheetsData.sheets[sheetBinId] = res

    // finally, add any changes to sheet refs
    await writeJSONFile(SHEET_REFS_FILE, sheetsData)

    return res
}

export const deleteSheetData = async (id) => {
    const dataPath = await appDataDir()
    const sheetsDirName = await getAppDataFilePath("sheets/")
    const sheetsDirExists  = await exists(sheetsDirName)
    if (!sheetsDirExists) {
        await createDir(sheetsDirName)
    }

    let sheetsData = await getJSONFile("sheets/sheets.json", defaultSheetRefs)

    const sheetFilePath = sheetsData.sheets[id]?.path
    delete sheetsData.sheets[id]

    await writeJSONFile(SHEET_REFS_FILE, sheetsData)

    if (sheetFilePath) {
        await removeFile(`${dataPath}${sheetFilePath}`)
    }
}