import {v4} from "uuid"
import {getAppDataFilePath, getJSONFile, sanitizeFileName, writeJSONFile} from "../../utils/fileUtils.js";
import {createDir, exists, writeBinaryFile, writeTextFile} from "@tauri-apps/api/fs";

const SHEET_REFS_FILE = "sheets/sheets.json"

export const defaultSheetRefs = {sheets: []}

export const getSheetRefs = async () => {
    return getJSONFile(SHEET_REFS_FILE, defaultSheetRefs)
}

export const writeSheetData = async (data) => {
    const sheetBinId = data.metadata?.id ?? v4()
    const sheetsDirName = await getAppDataFilePath("sheets/")
    const sheetsDirExists = await exists(sheetsDirName)
    if (!sheetsDirExists) {
        await createDir(sheetsDirName)
    }
    const sheetsData = await getJSONFile("sheets/sheets.json", defaultSheetRefs)

    let res;

    data.metadata.id = sheetBinId

    // TODO: support writing to an existing index
    if (!data?.sheetData) {
        // save the transposes without the sheet
        res = {...data.metadata, type: "transposes"}
        sheetsData.sheets.push(res)
    }
    else {
        const sheetFileTitle = sanitizeFileName(data.metadata.title.replaceAll(" ", "-"))
        let path = `${sheetsDirName}${sheetFileTitle}_${sheetBinId}`

        const type = data.sheetData.type
        switch (type) {
            case "image-link":
                res = {...data.metadata, type, url: data.sheetData.content}
                sheetsData.sheets.push(res)
                break
            case "image":
                const blob = await fetch(data.sheetData.content).then(res => res.blob())
                const buffer = await blob.arrayBuffer()
                const uint8 = new Uint8Array(buffer)

                await writeBinaryFile(path, uint8)

                res = {...data.metadata, type, path}
                sheetsData.sheets.push(res)

                break
            case "text":
                path += ".txt"

                await writeTextFile(path, data.sheetData.content)

                res = {...data.metadata, type, path}
                sheetsData.sheets.push(res)

                break
        }
    }

    // finally, add any changes to sheet refs
    await writeJSONFile(SHEET_REFS_FILE, sheetsData)

    return res
}

export const deleteSheetData = async (id) => {
    const sheetsDirName = await getAppDataFilePath("sheets/")
    const sheetsDirExists  = await exists(sheetsDirName)
    if (!sheetsDirExists) {
        await createDir(sheetsDirName)
    }

    let sheetsData = await getJSONFile("sheets/sheets.json", defaultSheetRefs)

    await writeJSONFile(SHEET_REFS_FILE, {sheets: sheetsData.sheets.filter(item => item.id !== id)})
}