import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, MemoryRouter } from "react-router";
import { IS_PREVIEW } from "@/lib/preview";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.tsx";

const queryClient = new QueryClient();

const Router = IS_PREVIEW ? MemoryRouter : BrowserRouter;

if ("serviceWorker" in navigator && import.meta.env.PROD && !IS_PREVIEW) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  }, { once: true });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </Router>
  </StrictMode>,
);
