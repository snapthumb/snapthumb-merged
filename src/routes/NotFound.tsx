import React from "react";
const NotFound: React.FC = () => (
  <div className="min-h-svh grid place-items-center p-8 text-center">
    <div>
      <h1 className="text-3xl font-bold">404</h1>
      <p className="mt-2 opacity-70">That page doesn’t exist.</p>
      <a href="/" className="inline-block mt-6 underline">Go home</a>
    </div>
  </div>
);
export default NotFound;