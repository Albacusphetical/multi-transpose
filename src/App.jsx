import pkg from "../package.json";
import "./App.css";
import {WebviewWindow} from "@tauri-apps/api/window";
import {useContext, useEffect, useRef, useState} from "react";
import {listen, emit, TauriEvent} from "@tauri-apps/api/event";
import {
  Button,
  Card, Divider,
  EditableText, Icon, IconSize,
  InputGroup,
  NumericInput,
  OverlayToaster,
  Tab,
  Tabs,
  Tooltip
} from "@blueprintjs/core";
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
} from "./utils/generalUtils.js";
import Volume from "./components/Volume.jsx";
import TransposeInput from "./components/TransposeInput.jsx";

export const appToaster = OverlayToaster.createAsync(overlayToasterDefaultProps);

function App() {
  const {isDatabaseReady} = useDatabase();
  const [keybindManagerIsListening, setKeybindManagerIsListening] = useState(false);
  const [keybindConfig, setKeybindConfig] = useState({});
  const [paused, setIsPaused] = useState(true);
  const transposesInputRef = useRef()
  const [transposes, setTransposes] = useState([]);
  const [canTranspose, setCanTranspose] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [transposeMonitorWebview, setTransposeMonitorWebview] = useState(null)
  const [sheetViewerWebview, setSheetViewerWebview] = useState(null)
  const [scrollVal, setScrollVal] = useState(Number(window.localStorage.getItem("scrollDownVal")) ?? 0)

  const [eventFromBackend, setEventFromBackend] = useState({}) // for debugging

  const spawnSheetViewerWindow = () => {
      const options = {
          url: "../sheet-viewer-window.html",
          title: "Sheet Viewer",
          alwaysOnTop: true,
          maximizable: true,
          resizable: true,
          focus: true,
          transparent: true,
          decorations: false, // set to true using tauri window api on window load (workaround for transparent bug)
          fileDropEnabled: false,
          minWidth: 350,
          minHeight: 200,
      }

      return spawnWindow('sheet-viewer', options)
  }

  /** @returns {Promise<WebviewWindow>}*/ 
  const spawnTransposeMonitor = () => {
    const options = {
      url: '../transpose-monitor-window.html',
      title: "",
      alwaysOnTop: true,
      maximizable: false,
      width: 200,
      height: 100,
      maxWidth: 300,
      maxHeight: 200,
      minWidth: 200,
      minHeight: 100
    }

    return spawnWindow('transpose-monitor', options);
  }

  const getRequiredDataForExternalWindows = () => {
    return {keybindConfig, canTranspose, transposes, selectedIndex, paused}
  }

  const sendEventToExternalWindows = (event) => {
    // send event to external windows, if available
    if (transposeMonitorWebview !== null) {
      transposeMonitorWebview.emit("transpose_monitor_event", event);
    }

    if (sheetViewerWebview !== null) {
      sheetViewerWebview.emit("sheet_viewer_event", event);
    }
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

    const unlistenSheetViewer = listen("sheet-viewer", (event) => {
        transposesInputRef.current.value = event.payload.transposes.join(" ")
        emit("backend_event", event.payload)
        setTransposes(event.payload.transposes)
    })

    // prevents window refresh
    document.addEventListener('keydown', preventRefreshOnKeydownCallback);
    document.addEventListener('contextmenu', preventDefaultEventCallback);

    // prevents caret 
    document.addEventListener('keydown', preventCaretOnKeydownCallback);

    return () => {
      unlisten.then((cleanFn) => cleanFn());
      unlistenSheetViewer.then((cleanFn) => cleanFn());
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
        transposeMonitorWebview.emit("transpose_monitor_event", getRequiredDataForExternalWindows())
      })

      transposeMonitorWebview.once(TauriEvent.WINDOW_CLOSE_REQUESTED, () => {
        setTransposeMonitorWebview(null);
      })
    }
  }, [transposeMonitorWebview]);

  useEffect(() => {
      if (sheetViewerWebview !== null) {
          sheetViewerWebview.once("sheet_viewer_ready", () => {
              // on window ready, send current data it requires
              sheetViewerWebview.emit("sheet_viewer_event", getRequiredDataForExternalWindows())
          })

          sheetViewerWebview.once(TauriEvent.WINDOW_CLOSE_REQUESTED, () => {
              setSheetViewerWebview(null);
          })
      }
  }, [sheetViewerWebview]);

  useEffect(() => {
    sendEventToExternalWindows(getRequiredDataForExternalWindows())
  }, [keybindConfig, canTranspose, transposes, selectedIndex, paused]);

  useEffect(() => {
    window.localStorage.setItem("scrollDownVal", scrollVal)
    emit("backend_event", {scroll_value: scrollVal})
  }, [scrollVal])

  return (
    isDatabaseReady &&
      <div className={"container"}>
        <TransposeInput ref={transposesInputRef} toaster={appToaster} canTranspose={canTranspose} onUpdate={setTransposes}/>

        <div style={{display: "flex", gap: 10, justifyContent: "center"}}>
          <span style={{display: "flex", alignItems: "center"}}>Tools</span>
          <Divider />
          <Tooltip content={"See sheets while playing"}>
              <Button
                  disabled={!canTranspose}
                  icon={"search-template"}
                  onClick={async () => {
                      const webview = await spawnSheetViewerWindow();
                      setSheetViewerWebview(webview)
                  }}
              >
                  Sheet Viewer
              </Button>
          </Tooltip>

          <Tooltip content={"View transposes while playing"}>
            <Button
                disabled={!canTranspose}
                icon={"desktop"}
                onClick={async () => {
                  const webview = await spawnTransposeMonitor();
                  setTransposeMonitorWebview(webview)
                }}
            >
              Monitor
            </Button>
          </Tooltip>
        </div>

        <span className={"transposes-header"}>
          <div className={"transpose-helper-items"}>
            <a
              className={"guide-link"}
              onClick={() => {onLinkClick("Tutorial", "https://github.com/Albacusphetical/multi-transpose/wiki/Usage-Guide")}}
            >
              Tutorial
            </a>

            <div style={{display: "flex"}}>
                <span style={{display: "flex", alignItems: "center", gap: 10}}>
                  <Icon icon={"sort"} size={IconSize.LARGE} color={"gray"}/>
                  <p style={{color: "gray", marginTop: "auto", marginBottom: "auto"}}>Scroll</p>
                  <NumericInput
                      disabled={keybindConfig.config?.scroll_down?.value == null}
                      inputClassName={"scroll-amount"}
                      buttonPosition={"left"}
                      placeholder={"Scroll"}
                      onValueChange={(valAsNum, valAsString, el) => setScrollVal(~~valAsNum)}
                      value={keybindConfig.config?.scroll_down?.value == null ? null : scrollVal}
                      min={0}
                      max={200}
                  />
                </span>
              <Volume/>
            </div>
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

              if (!paused && !e.canTranspose) {
                emit("backend_event", {pause: true})
                setIsPaused(true)
                setCanTranspose(false)
              }

              setKeybindConfig(e);
            }}
        />

      </div>
  );
}

export default App;
