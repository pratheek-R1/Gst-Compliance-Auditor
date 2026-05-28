import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      richColors
      toastOptions={{
        className: "!border !border-white/10 !bg-slate-950/90 !text-slate-100",
      }}
    />
  </React.StrictMode>
);
