import pkg from "../package.json";
import "./App.css";
import {WebviewWindow} from "@tauri-apps/api/window";
import {useContext, useEffect, useState} from "react";
import {listen, emit, TauriEvent} from "@tauri-apps/api/event";
import {Button, Card, EditableText, InputGroup, OverlayToaster, Tab, Tabs, Tooltip} from "@blueprintjs/core";
import KeyBindManager from "./components/KeyBindManager.jsx";
import {useDatabase} from "./components/DatabaseProvider.jsx";
import TransposeMatrix from "./components/TransposeMatrix.jsx";
import {
  generalAppToastConfig,
  modOrDefault,
  onLinkClick,
  overlayToasterDefaultProps,
  preventCaretOnKeydownCallback,
  preventDefaultEventCallback,
  preventRefreshOnKeydownCallback,
  spawnWindow,
  toastOnPause
} from "./utils.js";
import Volume from "./components/Volume.jsx";

export const appToaster = OverlayToaster.createAsync(overlayToasterDefaultProps);

function App() {
  const {isDatabaseReady} = useDatabase();
  const [keybindManagerIsListening, setKeybindManagerIsListening] = useState(false);
  const [keybindConfig, setKeybindConfig] = useState({});
  const [paused, setIsPaused] = useState(true);
  const [transposes, setTransposes] = useState([]);
  const [canTranspose, setCanTranspose] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [transposeMonitorWebview, setTransposeMonitorWebview] = useState(null)

  const [eventFromBackend, setEventFromBackend] = useState({}) // for debugging

  /** @returns {Promise<WebviewWindow>}*/
  const spawnTransposeMonitor = () => {
    const options = {
      url: '../transpose-monitor-window.html',
      title: "",
      alwaysOnTop: true,
      maximizable: false,
      width: 200,
      height: 75,
      maxWidth: 300,
      maxHeight: 200,
      minWidth: 200,
      minHeight: 75
    }

    return spawnWindow('transpose-monitor', options);
  }

  const getRequiredDataForMonitorWindow = () => {
    return {keybindConfig, canTranspose, transposes, selectedIndex, paused}
  }

  const sendEventToTransposeMonitor = (event) => {
    // send event to transpose monitor window, if available
    if (transposeMonitorWebview !== null) {
      transposeMonitorWebview.emit("transpose_monitor_event", event);
    }
  }

  const getTransposesFromText = (text) => {
    const regex = /-?\d+/g;
    const matches = text.match(regex);

    return matches ? matches.map(match => parseInt(match, 10)) : [];
  }

  const sendTransposesHandler = (transposes) => {
    if (!transposes || transposes.length === 0) {
      return;
    }

    // limited from -50 to 50
    if (!transposes.every(num => num >= -50 && num <= 50)) {
      appToaster.then(toaster => {
        toaster.clear();

        toaster.show({
          ...generalAppToastConfig,
          message: "Transposes must not exceed or fall below -/+50",
          icon: "numerical",
          intent: "danger",
          timeout: 2000,
          isCloseButtonShown: true
        })
      })

      return;
    }

    emit("backend_event", {transposes});
    setTransposes(transposes);
  }

  useEffect(() => {
    const unlisten = listen("frontend_event", (event) => {
      try {
        const json = JSON.parse(event.payload.message);

        if (json?.paused !== undefined) {
          setIsPaused(json.paused)
        }
        else if (json?.current_index !== undefined) {
          const newIndex = json.current_index
          setSelectedIndex(newIndex)

          // scroll to selected
          const selected = document.getElementById(`transpose-matrix-item-${newIndex}`);
          if (selected) {
            selected.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            });
          }
        }
      }
      catch (ignored) {}

      setEventFromBackend(event)
    })

    // prevents window refresh
    document.addEventListener('keydown', preventRefreshOnKeydownCallback);
    document.addEventListener('contextmenu', preventDefaultEventCallback);

    // prevents caret
    document.addEventListener('keydown', preventCaretOnKeydownCallback);

    return () => {
      unlisten.then((cleanFn) => cleanFn());
      removeEventListener('keydown', preventRefreshOnKeydownCallback);
      removeEventListener('contextmenu', preventDefaultEventCallback);
      removeEventListener('keydown', preventCaretOnKeydownCallback);
    }
  }, []);

  useEffect(() => {
    toastOnPause(appToaster, paused, canTranspose)
  }, [paused]);

  useEffect(() => {
    if (transposeMonitorWebview !== null) {
      transposeMonitorWebview.once("transpose_monitor_ready", () => {
        // on window ready, send current data it requires
        transposeMonitorWebview.emit("transpose_monitor_event", getRequiredDataForMonitorWindow())
      })

      transposeMonitorWebview.once(TauriEvent.WINDOW_CLOSE_REQUESTED, () => {
        setTransposeMonitorWebview(null);
      })
    }
  }, [transposeMonitorWebview]);

  useEffect(() => {
    sendEventToTransposeMonitor(getRequiredDataForMonitorWindow())
  }, [keybindConfig, canTranspose, transposes, selectedIndex, paused]);


  return (
    isDatabaseReady &&
      <div className={"container"}>
        <span className={"transpose-input"}>
          <Tooltip content={canTranspose ? "Example: 0 -1 +1 1" : "Keybinds must be set first!"}>
            <InputGroup
                onInput={(e) => sendTransposesHandler(getTransposesFromText(e.target.value))}
                disabled={!canTranspose}
                fill={true}
                leftIcon={"array-numeric"}
                placeholder={"Enter your transposes"}
            />
          </Tooltip>
        </span>

        <Tooltip content={"View transposes while playing"}>
          <Button
              disabled={!canTranspose}
              onClick={async () => {
                const webview = await spawnTransposeMonitor();
                setTransposeMonitorWebview(webview)
              }}
          >
            Spawn Monitor
          </Button>
        </Tooltip>

        <span className={"transposes-header"}>
          <div className={"transpose-helper-items"}>
            <a
              className={"guide-link"}
              onClick={() => {onLinkClick("Tutorial", "https://github.com/Albacusphetical/multi-transpose/wiki/Usage-Guide")}}
            >
              Tutorial
            </a>

            <Volume/>
          </div>

          <TransposeMatrix index={selectedIndex} transposes={transposes}/>
        </span>

        <span className={"version"}>
          <span>Version {pkg.version}</span>
          <span>Made by Albacusphetical</span>
        </span>

        <KeyBindManager
            onListen={(isListening) => setKeybindManagerIsListening(isListening)}
            onKeybindSet={(e) => {
              if (paused && e.canTranspose) {
                // all keybinds set, you can transpose then

                emit("backend_event", {pause: false})
                setIsPaused(false);
                setCanTranspose(true);
              }

              setKeybindConfig(e);
            }}
        />

      </div>
  );
}

export default App;
