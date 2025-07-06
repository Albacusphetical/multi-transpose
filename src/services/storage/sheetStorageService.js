import {getAppDataFilePath, getJSONFile, writeJSONFile} from "../../utils/fileUtils.js";

const SHEET_REFS_FILE = "sheetRefs.json"

export const defaultSheetRefs = {}

export const getSheetRefs = async () => {
    return getJSONFile(SHEET_REFS_FILE, defaultSheetRefs)
}

const writeSheetRefs = async (jsonObj) => {
    await writeJSONFile(SHEET_REFS_FILE, jsonObj);
}

export const writeSheetData = async (data) => {
    const sheetsPath = await getAppDataFilePath("sheets/")

    // depending on the sheet saved, we would need to create either a text or image file
    console.log(sheetsPath, data)

    if (!data?.sheetData) {
        // save the transposes without the sheet
    }
    else {

    }
}
