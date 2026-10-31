import { Navigate, Route, Routes, useLocation } from "react-router";
import { useDailyPing } from "@/hooks/useDailyPing";
import Home from "./pages/Home";
import Privacy from "./pages/Privacy";
import Feel from "./pages/Feel";
import SharedSet from "./pages/SharedSet";
import { parseSetFragment } from "@/lib/ayahSet";
import { versesCount } from "@/lib/versesCount";

/** /13/28 is one ayah; /13/28#set=… is a set someone shared (the set never reaches the server). */
function AyahRoute() {
  const { hash } = useLocation();
  const set = parseSetFragment(hash, versesCount);
  return set ? <SharedSet key={hash} verses={set} /> : <Home />;
}

export default function App() {
  useDailyPing();

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/feel" element={<Feel />} />
      <Route path="/:surah" element={<Home />} />
      <Route path="/:surah/:ayah" element={<AyahRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
