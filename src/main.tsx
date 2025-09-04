import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App"; // Snapthumb editor
import SnapthumbLanding from "./routes/SnapthumbLanding"; // Landing page component
import "./index.css"; // Your global/Tailwind styles
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
