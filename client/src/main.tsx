// Add explicit import for React
import React from 'react';
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Console log to debug
console.log('Main.tsx is running');

// Make sure root element exists before rendering
const rootElement = document.getElementById("root");
if (rootElement) {
  console.log('Root element found, rendering app');
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error('Root element not found!');
}
