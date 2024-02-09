import Database from "tauri-plugin-sql-api";
import {createContext, useContext, useEffect, useState} from "react";
import {initTables} from "../queries.js";

const DatabaseContext = createContext(null);

export const DatabaseProvider = ({children}) => {
    const [isDatabaseReady, setIsDatabaseReady] = useState(false);
    const [database, setDatabase] = useState();

    useEffect(() => {
        Database.load("sqlite:multi_transpose.db").then((db) => {
            // ideally, this would be done in the backend, but since its desktop and migrations aren't working, probably ok
            db.execute(initTables).then(() => {
                setDatabase(db);
                setIsDatabaseReady(true);
            })
        })
    }, []);


    return (
        <DatabaseContext.Provider value={{database, isDatabaseReady}}>
            {children}
        </DatabaseContext.Provider>
    )
}

/** @returns {{Database, isDatabaseReady}} */
export const useDatabase = () => {
    return useContext(DatabaseContext);
};
