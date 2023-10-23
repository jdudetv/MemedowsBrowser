import { render } from "solid-js/web";
import "./index.css";
import App from "./App";
import { emotes } from "./emotes";

export const CustomEmotes = await emotes();

render(App, document.getElementById("root") as HTMLElement);
