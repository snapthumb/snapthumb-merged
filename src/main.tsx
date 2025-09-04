import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App"; // Your Snapthumb editor
import SnapthumbLanding from "./routes/SnapthumbLanding"; // Make sure path is correct
import "./index.css"; // Tailwind or global styles
import { Analytics } from "@vercel/analytics/react";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Homepage → Landing */}
        <Route path="/" element={<SnapthumbLanding />} />

        {/* Editor → App */}
        <Route path="/app" element={<App />} />

        {/* Catch-all → back to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    <Analytics />
  </React.StrictMode>
);
