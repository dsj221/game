import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./style.css";
import { load } from "./systems/persistence";
// Restore the saved world before the first React render.
load();
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
