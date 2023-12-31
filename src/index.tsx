import { render } from "solid-js/web";
import { Router, Routes, Route } from "@solidjs/router";
import "./index.css";
import { emotes } from "./emotes";
import overlay from "./pages/overlay";
import cam from "./pages/cam";

export const CustomEmotes = await emotes();

render(
  () => (
    <Router>
      <Routes>
        <Route path="/overlay" component={overlay} />
        <Route path="/cam" component={cam} />
      </Routes>
    </Router>
  ),
  document.getElementById("root") as HTMLElement
);
