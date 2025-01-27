import KeyBind from "./KeyBind.jsx";
import {emit, listen, once} from "@tauri-apps/api/event";
import {useEffect, useState} from "react";
import {Section, SectionCard} from "@blueprintjs/core";
import {useDatabase} from "./DatabaseProvider.jsx";
import {getKeybindConfig, updateKeybindConfig} from "../queries.js";
import {appToaster} from "../App.jsx";

const defaultConfig = {
    version: 3,
    keys: {
        "pause": {
            "purpose": "Pause All Binds",
            "desc": "Prevents the app from simulating keys.",
            "value": null,
            "required": true
        },
        "transpose_up": {
            "purpose": "Transpose Up",
            "desc": "The key used in your piano app to transpose +1. They must match!",
            "value": null,
            "required": true
        },
        "transpose_down": {
            "purpose": "Transpose Down",
            "desc": "The key used in your piano app to transpose -1. They must match!",
            "value": null,
            "required": true
        },
        "next_transpose": {
            "purpose": "Next Transpose",
            "desc": "The key you prefer to change the highlighted transpose to the next one, e.g. Tab. Presses the keys set for Transpose Up/Down in your piano app x times.",
            "value": null,
            "required": true
        },
        "previous_transpose": {
            "purpose": "Previous Transpose",
            "desc": "The key you prefer to change the highlighted transpose to the previous one, e.g. CapsLock. Presses the keys set for Transpose Up/Down in your piano app x times.",
            "value": null,
            "required": true
        },
        "scroll_down": {
            "purpose": "Scroll",
            "desc": "The key you want to use to scroll down when hovering over the scroll area of your sheet.",
            "value": null,
            "required": false
        }
    }
}

const generalKeyBindToastConfig = {timeout:  3000, isCloseButtonShown: true, icon: 'key'}
const restrictedKeys = new Set("1!2@34$5%6^78*9(0)qwertyuiopQWERTYUIOPasdfghjklASDFGHJKLzxcvbnmZXCVBNM");

const KeyBindManager = ({onListen = (isListening) => {}, onKeybindSet = (e) => {}}) => {
    const {database} = useDatabase();
    const [config, setConfig] = useState({...defaultConfig.keys});//s
    const [configName, setConfigName] = useState("default");
    const [hasFetchedDefaultConfig, setHasFetchedDefaultConfig] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [whoIsListening, setWhoIsListening] = useState("");
    const [keysInUse, setKeysInUse] = useState(new Set());
    const [isAbleToTranspose, setIsAbleToTranspose] = useState(false);
    const [isManagerOpen, setIsManagerOpen] = useState(false);

    const listenForKey = (name) => {
        // already listening
        if (isListening) return;

        onListen(true);
        setIsListening(true);
        setWhoIsListening(name);

        // emit key_listen to backend, start listening for a key_consume event, emit the bind as usual
        emit("backend_event", {key_listen: true})
        once("key_consume", async (event) => {
            emit("backend_event", {key_listen: false})

            const {key, keycode} = JSON.parse(event.payload.message)
            onListen(false);
            setIsListening(false);
            setWhoIsListening("");

            const valid = await validateKeyToUse(key);
            if (valid === "in_use") {
                // deletes current key selected used in the other keybind before setting it
                const currKeybindUsingKey = getKeybindCfgNameOfKeycode(keycode)
                if (currKeybindUsingKey === name) {
                    return;
                }

                keysInUse.delete(config[currKeybindUsingKey].value?.key)
                config[currKeybindUsingKey] = {...defaultConfig.keys[currKeybindUsingKey]}

                // reset key in backend
                emit("backend_event", {bind: {name: currKeybindUsingKey, keycode: keycode}})
            }
            else if (!valid) {
                return;
            }

            keysInUse.delete(config[name].value?.key);
            config[name].value = {key: key, keyCode: keycode};
            keysInUse.add(key)

            setKeysInUse(new Set(keysInUse));

            // send keycode to backend
            emit("backend_event", {bind: {name: name, keycode: keycode}});

            // update DB with updated config
            database.execute(updateKeybindConfig(configName, config, configName === "default"))
        })
    }

    const validateKeyToUse = async (key) => {
        const toaster = await appToaster;

        if (keysInUse.has(key)) {
            // toaster.clear()
            // toaster.show({
            //     ...generalKeyBindToastConfig,
            //     message: 'This key is already in use',
            //     intent: 'danger',
            // })

            return "in_use";
        }


        if (key.startsWith("Num") || (key.startsWith("Key") && isNaN(key.slice(3)))) {
            /** for letters, isNaN is checked for Key* since Key* may include an unknown key by keycode */

            // known key: letter or number
            key = key.slice(3)
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

    const getKeybindCfgNameOfKeycode = (keycode) => {
        for (const key of Object.keys(config)) {
            if (config[key].value?.keyCode === keycode) {
                return key
            }
        }

        return false
    }

    useEffect(() => {
        // get the default config on first render
        database.select(getKeybindConfig(configName))
        .then((result) => {
            const newKeysInUseSet = new Set();

            if (result.length > 0) {
                try {
                    const keys = JSON.parse(result[0].json)?.keys ?? defaultConfig.keys;
                    const prevConfig = {...defaultConfig.keys, ...keys};
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
        })
        .catch(err => console.error(err))
        .finally(() => {
            setHasFetchedDefaultConfig(true)
        })
    }, []);

    useEffect(() => {
        if (hasFetchedDefaultConfig) {
            let canTranspose = Object.values(config).every(key => !key.required || key.value !== null);

            setIsAbleToTranspose(canTranspose)
            onKeybindSet({config, canTranspose})
        }
    }, [keysInUse]);

    return (
        hasFetchedDefaultConfig &&
        <Section
            className={"keybind-manager-container"}
            title={"Keybinds"}
            defaultIsOpen={true}
            collapsible={isAbleToTranspose}
            icon={"key"}
            onClick={() => setIsManagerOpen(isAbleToTranspose === false ? true : !isManagerOpen)}
        >
            <SectionCard>
                <span className={"keybind-manager-content"}>
                    {Object.entries(config).map(([name, data]) => (
                        ((data?.required === undefined || data.required === true) || (data.required === false && isAbleToTranspose))
                        &&
                        <KeyBind
                            value={data.value}
                            key={name}
                            name={name}
                            purpose={data.purpose}
                            desc={defaultConfig.keys[name].desc}
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