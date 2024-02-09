CREATE TABLE IF NOT EXISTS KeyBindConfig (
    name TEXT PRIMARY KEY,
    json TEXT,
    isDefault BOOLEAN DEFAULT false
);