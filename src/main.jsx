import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import "normalize.css";
import "@blueprintjs/core/lib/css/blueprint.css";
// include blueprint-icons.css for icon font support
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "./styles.css";
import {DatabaseProvider} from "./components/DatabaseProvider.jsx";


ReactDOM.createRoot(document.getElementById("root")).render(
    // only enable StrictMode while developing
// <React.StrictMode>
    <DatabaseProvider>
          <App />
      </DatabaseProvider>
  // </React.StrictMode>,
);
