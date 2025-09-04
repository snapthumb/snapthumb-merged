import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App"; // Your existing Snapthumb tool UI
import SnapthumbLanding from "./routes/SnapthumbLanding"; // Ensure this file exists
import NotFound from "./routes/NotFound"; // Optional (see below)
import "./index.css"; // Tailwind or your global styles

const RootRouter: React.FC = () => (
  <BrowserRouter>
    <Routes>
      {/* Public homepage → Forge */}
      <Route path="/" element={<SnapthumbLanding />} />

      {/* Private/staging tool → only accessible via direct link */}
      <Route path="/app" element={<App />} />

      {/* 404 fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RootRouter />
  </React.StrictMode>
);