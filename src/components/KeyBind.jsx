import {useState} from "react";
import {Button} from "@blueprintjs/core";
import {emit} from "@tauri-apps/api/event";

const KeyBind = ({value = null, name, purpose, isListening = false, listener = () => {}}) => {
    return (
        <span className={"keybind-container"}>
            <span className={"keybind-purpose"}>{purpose}</span>
            <Button disabled={isListening} onClick={() => listener(name)}>
                {isListening || !value?.key
                    ?
                    "..."
                    :
                    value.key
                }

            </Button>
        </span>
    )
}

export default KeyBind;