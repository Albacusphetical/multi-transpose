import {Button, Tooltip} from "@blueprintjs/core";

const KeyBind = ({value = null, name, purpose, desc, isListening = false, listener = () => {}}) => {
    return (
        <span className={"keybind-container"}>
            <span className={"keybind-purpose"}>
                <Tooltip compact={true} content={desc}>
                    <span style={{margin: 5, fontWeight: "bold", opacity: 0.2}}>?</span>
                </Tooltip>
                {purpose}
            </span>
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