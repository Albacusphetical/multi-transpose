import {Button} from "@blueprintjs/core";

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