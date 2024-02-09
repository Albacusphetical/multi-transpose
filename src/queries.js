export const initTables = `
    CREATE TABLE IF NOT EXISTS KeyBindConfig (
         name TEXT PRIMARY KEY,
         json TEXT,
         isDefault BOOLEAN DEFAULT false
    );
`

export const getKeybindConfig = (name) => {
    return `
        SELECT * FROM KeyBindConfig WHERE name = '${name}';
    `
}

export const updateKeybindConfig = (name, jsonObj, isDefault = false) => {
    return `
        INSERT OR REPLACE INTO KeyBindConfig (name, json, isDefault) VALUES ('${name}', '${JSON.stringify(jsonObj)}', ${isDefault});
    `
}