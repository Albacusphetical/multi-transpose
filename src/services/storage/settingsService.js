import {getJSONFile} from "../../utils/fileUtils.js";

const SETTINGS_FILE = "settings.json"

export const defaultAppDataSettings = {muted: false, volume: 0.3};

export const getAppDataSettings = async () => {
    return getJSONFile(SETTINGS_FILE, defaultAppDataSettings)
}

export const writeAppDataSettings = async (jsonObj) => {
    await writeJSaONFile(SETTINGS_FILE, jsonObj)
}