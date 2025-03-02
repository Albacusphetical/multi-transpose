import {InputGroup, Tooltip} from "@blueprintjs/core";
import {generalAppToastConfig} from "../utils.js";
import {emit} from "@tauri-apps/api/event";
import {forwardRef, useEffect, useRef, useState} from "react";

const TransposeInput = forwardRef(
    (
        {
            toaster,
            mainWindowTransposes = null,
            canTranspose,
            backend = true,
            onUpdate = () => {},
        },
        ref
    ) => {
        const inputRef = useRef();

        const getTransposesFromText = (text) => {
            const regex = /-?\d+/g;
            const matches = text.match(regex);

            return matches ? matches.map((match) => parseInt(match, 10)) : [];
        };

        const sendTransposesHandler = (transposes) => {
            if (!transposes || transposes.length === 0 || transposes === mainWindowTransposes) {
                return;
            }

            // limited from -50 to 50
            if (!transposes.every((num) => num >= -50 && num <= 50)) {
                toaster.then((toaster) => {
                    toaster.clear();

                    toaster.show({
                        ...generalAppToastConfig,
                        message: "Transposes must not exceed or fall below -/+50",
                        icon: "numerical",
                        intent: "danger",
                        timeout: 2000,
                        isCloseButtonShown: true,
                    });
                });

                return;
            }

            if (backend) emit("backend_event", { transposes });

            onUpdate(transposes);
        };

        useEffect(() => {
            if (ref) {
                // Forward the ref to the parent component
                ref.current = inputRef.current;
            }
        }, [ref]);

        useEffect(() => {
            if (!backend) inputRef.current.value = mainWindowTransposes?.join(" ") ?? "";
        }, [mainWindowTransposes]);

        return (
            <span className={"transpose-input"}>
                <Tooltip
                    defaultIsOpen={backend}
                    content={canTranspose ? "Example: 0 -1 +1 1" : "Keybinds must be set first!"}
                >
                  <InputGroup
                      id={"transposes-input"}
                      onInput={(e) => sendTransposesHandler(getTransposesFromText(e.target.value))}
                      disabled={!canTranspose}
                      fill={true}
                      leftIcon={"array-numeric"}
                      placeholder={"Enter your transposes"}
                      inputRef={inputRef}
                  />
                </Tooltip>
            </span>
        );
    }
);

export default TransposeInput;