import React from "react";
import ReactDOM from "react-dom/client";

import "core-js";
import "normalize.css";
import "@blueprintjs/core/lib/css/blueprint.css";
// include blueprint-icons.css for icon font support
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "./App.css";
import "./styles.css";
import SheetViewerWindow from "./SheetViewerWindow.jsx";
import {OverlaysProvider} from "@blueprintjs/core";


ReactDOM.createRoot(document.getElementById("sheet-viewer-root")).render(
    // only enable StrictMode while developing
// <React.StrictMode>
    <OverlaysProvider>
        <SheetViewerWindow/>
    </OverlaysProvider>
    // </React.StrictMode>,
);
