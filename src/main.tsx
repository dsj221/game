import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./style.css";
import { load } from "./systems/persistence";
const ModelReview = React.lazy(() => import('./components/ModelReview'));
const reviewing = new URLSearchParams(location.search).has('model-review');
// Restore the saved world before the first React render.
load();
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {reviewing ? <React.Suspense fallback={<p>正在加载建筑模型…</p>}><ModelReview /></React.Suspense> : <App />}
  </React.StrictMode>,
);
