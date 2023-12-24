import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./ui/Game";

const root = createRoot(document.getElementById("root")!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
