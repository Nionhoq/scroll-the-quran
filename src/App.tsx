import { Navigate, Route, Routes } from "react-router";
import { useDailyPing } from "@/hooks/useDailyPing";
import Home from "./pages/Home";
import Privacy from "./pages/Privacy";
import Feel from "./pages/Feel";

export default function App() {
  useDailyPing();

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/feel" element={<Feel />} />
      <Route path="/:surah" element={<Home />} />
      <Route path="/:surah/:ayah" element={<Home />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
