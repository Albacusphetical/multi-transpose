import KeyBind from "./KeyBind.jsx";
import {emit} from "@tauri-apps/api/event";
import {useEffect, useState} from "react";
import {Section, SectionCard} from "@blueprintjs/core";
import {useDatabase} from "./DatabaseProvider.jsx";
import {getKeybindConfig, updateKeybindConfig} from "../queries.js";
import {appToaster} from "../App.jsx";

const defaultConfig = {
    "pause": {
        "purpose": "Pause All Binds",
        "value": null
    },
    "transpose_up": {
        "purpose": "Transpose Up",
        "value": null
    },
    "transpose_down": {
        "purpose": "Transpose Down",
        "value": null
    },
    "next_transpose": {
        "purpose": "Next Transpose",
        "value": null
    },
    "previous_transpose": {
        "purpose": "Previous Transpose",
        "value": null
    }
}

const generalKeyBindToastConfig = {timeout:  3000, isCloseButtonShown: true, icon: 'key'}
const restrictedKeys = new Set("1!2@34$5%6^78*9(0)qwertyuiopQWERTYUIOPasdfghjklASDFGHJKLzxcvbnmZXCVBNM");

const KeyBindManager = ({onListen = (isListening) => {}, onKeybindSet = (e) => {}}) => {
    const {database} = useDatabase();
    const [config, setConfig] = useState(defaultConfig);
    const [configName, setConfigName] = useState("default");
    const [hasFetchedDefaultConfig, setHasFetchedDefaultConfig] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [whoIsListening, setWhoIsListening] = useState("");
    const [keysInUse, setKeysInUse] = useState(new Set());
    const [isAbleToTranspose, setIsAbleToTranspose] = useState(false);

    const listenForKey = (name) => {
        // already listening
        if (isListening) return;

        onListen(true);
        setIsListening(true);
        setWhoIsListening(name);
        document.addEventListener("keydown", async (e) => {
            onListen(false);
            setIsListening(false);
            setWhoIsListening("");

            const valid = await validateKeyToUse(e.key);
            if (!valid) {
                return;
            }

            keysInUse.delete(config[name].value?.key);
            config[name].value = {key: e.key, keyCode: e.keyCode};
            keysInUse.add(e.key)

            setKeysInUse(new Set(keysInUse));

            // send keycode to backend
            emit("backend_event", {bind: {name: name, keycode: e.keyCode}});

            // update DB with updated config
            database.execute(updateKeybindConfig(configName, config, configName === "default"))
        }, {once: true})
    }

    const validateKeyToUse = async (key) => {
        const toaster = await appToaster;

        if (keysInUse.has(key)) {
            toaster.clear()
            toaster.show({
                ...generalKeyBindToastConfig,
                message: 'This key is already in use',
                intent: 'danger',
            })

            return false;
        }

        if (restrictedKeys.has(key)) {
            toaster.clear()
            toaster.show({
                ...generalKeyBindToastConfig,
                message: 'This key is restricted from use',
                intent: 'danger',
            })

            return false;
        }

        return true;
    }

    useEffect(() => {
        // get the default config on first render
        database.select(getKeybindConfig(configName))
        .then((result) => {
            const newKeysInUseSet = new Set();

            if (result.length > 0) {
                try {
                    const prevConfig = {...defaultConfig, ...JSON.parse(result[0].json)};
                    setConfig(prevConfig);

                    // register keys with backend, and here as in use
                    Object.entries(prevConfig).map(([name, value]) => {
                        const keyObj = value.value;

                        if (keyObj?.key) {
                            newKeysInUseSet.add(keyObj.key);
                            emit("backend_event", {bind: {name: name, keycode: keyObj.keyCode}})
                        }
                    })

                    setKeysInUse(new Set(newKeysInUseSet));
                }
                catch (err) {console.error(err)}
            }

            setIsAbleToTranspose(newKeysInUseSet.size === Object.keys(defaultConfig).length)
        })
        .catch(err => console.error(err))
        .finally(() => {
            setHasFetchedDefaultConfig(true)
        })
    }, []);

    useEffect(() => {
        if (hasFetchedDefaultConfig) {
            let canTranspose = keysInUse.size === Object.keys(defaultConfig).length;

            setIsAbleToTranspose(canTranspose)
            onKeybindSet({config, canTranspose})
        }
    }, [keysInUse]);

    return (
        hasFetchedDefaultConfig &&
        <Section
            className={"keybind-manager-container"}
            title={"Keybinds"}
            collapsible={true}
            collapseProps={{defaultIsOpen: !isAbleToTranspose}}
            icon={"key"}
        >
            <SectionCard>
                <span className={"keybind-manager-content"}>
                    {Object.entries(config).map(([name, data]) => (
                        <KeyBind
                            value={data.value}
                            key={name}
                            name={name}
                            purpose={data.purpose}
                            listener={listenForKey}
                            isListening={isListening && whoIsListening === name}
                        />
                    ))}
                </span>
            </SectionCard>
        </Section>
    )
}

export default KeyBindManager;