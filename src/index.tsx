import { render } from "solid-js/web";
import { Router, Routes, Route } from "@solidjs/router";
import "./index.css";
import { emotes } from "./emotes";
import overlay from "./pages/overlay";
import cam from "./pages/cam";
import physics from "./pages/physics";
import { Show, createContext, createResource } from "solid-js";
import { custom } from "zod";

export const EmotesContext =
  createContext<Awaited<ReturnType<typeof emotes>>>();

render(() => {
  const [customEmotes] = createResource(emotes);

  return (
    <Show when={customEmotes()}>
      {(customEmotes) => (
        <EmotesContext.Provider value={customEmotes()}>
          <Router>
            <Routes>
              <Route path="/overlay" component={overlay} />
              <Route path="/cam" component={cam} />
              <Route path="/physics" component={physics} />
            </Routes>
          </Router>
        </EmotesContext.Provider>
      )}
    </Show>
  );
}, document.getElementById("root") as HTMLElement);
