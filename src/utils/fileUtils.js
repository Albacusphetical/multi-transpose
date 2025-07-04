import {exists, readTextFile, writeTextFile} from "@tauri-apps/api/fs";
import {appDataDir} from "@tauri-apps/api/path";

export const getAppDataFilePath = async (filename) => {
    const dataDir = await appDataDir();
    return `${dataDir}${filename}`
}

export const getJSONFile = async (filename, defaultData = {}) => {
    const appDataFilePath = await getAppDataFilePath(filename)
    const fileExists = await exists(appDataFilePath)

    if (!fileExists) {
        await writeTextFile(appDataFilePath, JSON.stringify(defaultData))
        return defaultData
    }

    const contents = await readTextFile(appDataFilePath)

    return JSON.parse(contents)
}

export const writeJSONFile = async (filename, data = {}) => {
    const appDataFilePath = await getAppDataFilePath(filename)
    const currData = await getJSONFile(filename)
    await writeTextFile(appDataFilePath, JSON.stringify({...currData, ...data}));
}