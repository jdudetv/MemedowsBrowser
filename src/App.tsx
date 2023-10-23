import { render } from "solid-js/web";
import { createStore, produce } from "solid-js/store";
import { For, Index, createSignal } from "solid-js";
import { z } from "zod";

import "xp.css";
import { startWS } from "./websocket";
import { CustomEmotes } from ".";
import { emotes } from "./emotes";

type UserType = "B" | "VIP" | "MOD" | "SUB";

const userTypeClasses = {
  B: "text-[#ff0000]",
  VIP: "text-[#ff00e1]",
  MOD: "text-[#00c903]",
  SUB: "text-[#058bf2]",
} satisfies Record<UserType, string>;

type Message = {
  from?: {
    name: string;
    color: string;
    userType?: UserType;
  };
  contents: Array<
    | {
        type: "text";
        text: string;
      }
    | {
        type: "emote";
        src: string;
      }
  >;
};

const INCOMING_CHAT_MESSAGE = z.object({
  type: z.literal("chatMessage"),
  username: z.string(),
  message: z.string(),
  colour: z.string(),
  emotes: z.record(z.array(z.string())),
  userType: z.string(),
});

export default function () {
  const [time, setTime] = createSignal<string>("");
  const [width, setWidth] = createSignal<number>(400);
  const [newMessages, setNewMessages] = createStore<Message[]>([
    { contents: [{ type: "text", text: "Microsoft<R> Windows DOS" }] },
    {
      contents: [
        { type: "text", text: "<C> Copyright Microsoft Corp 1990-2001." },
      ],
    },
  ]);

  const ws = startWS("ws://localhost:1890");

  ws.addEventListener("open", (event) => {
    console.log("open");
  });

  ws.addEventListener("message", (data) => {
    const { type, username, message, emotes, colour, userType } =
      INCOMING_CHAT_MESSAGE.parse(JSON.parse(data.data));

    const WIDTH_CMD = "!width ";
    if (message.startsWith(WIDTH_CMD) && userType === "B") {
      setWidth(Number(message.substring(WIDTH_CMD.length)));
    }

    type IndexData = {
      index: number;
    } & (
      | { emoteId: string; source: "twitch" }
      | { src: string; source: "custom" }
    );

    let indexes = new Map<number, IndexData>();

    message
      .split(" ")
      .reduce((acc, word) => {
        const prev = acc.at(-1);

        if (!prev) {
          return [{ text: word, startIndex: 0 }];
        }

        return [
          ...acc,
          {
            text: word,
            startIndex: prev.startIndex + prev.text.length + 1,
          },
        ];
      }, [] as { text: string; startIndex: number }[])
      .forEach(({ text, startIndex }) => {
        if (CustomEmotes[text]) {
          let end = text.length - 1;
          indexes.set(startIndex, {
            index: startIndex + end,
            src: CustomEmotes[text].url,
            source: "custom",
          });
        }
      });

    Object.entries(emotes).forEach(([key, data]) => {
      data.forEach((element: string) => {
        let indexArray = element.split("-");
        indexes.set(Number(indexArray[0]), {
          index: Number(indexArray[1]),
          emoteId: key,
          source: "twitch",
        });
      });
    });

    let contents: Message["contents"] = [];

    for (let i = 0; i < message.length; i++) {
      const entry = indexes.get(i);

      if (entry) {
        if (entry.source === "twitch") {
          contents.push({
            type: "emote",
            src: `https://static-cdn.jtvnw.net/emoticons/v2/${entry.emoteId}/default/dark/1.0`,
          });

          i = Number(entry.index);
          //https://static-cdn.jtvnw.net/emoticons/v2/303888087/default/dark/1.0
        } else {
          if (entry.source === "custom") {
            contents.push({
              type: "emote",
              src: entry.src,
            });
            i = Number(entry.index);
          }
        }
      } else {
        contents.push({ type: "text", text: message[i] });
      }
    }

    setNewMessages(
      produce((messages) => {
        if (messages.length === 40) {
          messages.splice(0, 1);
        }

        messages.push({
          from: {
            name: username,
            color: colour,
            userType: userType === "" ? undefined : (userType as UserType),
          },
          contents,
        });
      })
    );
  });

  setInterval(() => {
    let d = new Date();
    let t = d.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    setTime(t);
  }, 1000);

  return (
    <div>
      <div
        class="window transition-[width,height] duration-1000"
        style={`width: ${width()}px; transform: translateX(100px) translateY(100px)`}
      >
        <div class="title-bar" style={"height: auto"}>
          <div class="title-bar-text">Command Prompt</div>
          <div class="title-bar-controls">
            <button aria-label="Minimize"></button>
            <button aria-label="Maximize"></button>
            <button aria-label="Close"></button>
          </div>
        </div>
        <div class="window-body">
          <pre
            style={
              "max-height: 800px; overflow: hidden; display: flex; flex-direction: column-reverse; margin: -8px -5px;"
            }
          >
            <div>
              <For each={newMessages}>
                {(message) => (
                  <div class="whitespace-normal">
                    {message.from && (
                      <>
                        C:\
                        {message.from.userType && (
                          <>
                            <span
                              class={userTypeClasses[message.from.userType]}
                            >
                              {message.from.userType}
                            </span>
                            \
                          </>
                        )}
                        <span style={`color: ${message.from.color}`}>
                          {message.from.name}
                        </span>
                        {`> `}
                      </>
                    )}
                    <For each={message.contents}>
                      {(msgContent) => {
                        switch (msgContent.type) {
                          case "text":
                            return <>{msgContent.text}</>;
                          case "emote":
                            return (
                              <img src={msgContent.src} class="inline-block" />
                            );
                        }
                      }}
                    </For>
                  </div>
                )}
              </For>
            </div>
          </pre>
        </div>
      </div>
      <img class="bottom-0 absolute" src="./images/taskbarmain.png"></img>
      <img class="bottom-0 absolute" src="./images/startbarup.png"></img>
      <div class="bottom-0 absolute" style={`left: ${6.4}%`}>
        {" "}
        <img src="./images/taskbarup.png"></img>
        <div
          class="bottom-1 absolute text-white text-2xl font-light"
          style={`left: ${15}%; font-family: Tahoma, "Trebuchet MS", sans-serif;`}
        >
          test
        </div>
      </div>

      <img
        class="bottom-0 absolute"
        style={`right: -${57.5}%; font-family: tahoma`}
        src="./images/rightcorneroverlay.png"
      ></img>
      <div
        class=" text-2xl bottom-1 right-5 absolute text-white"
        style={"font-family: tahoma"}
      >
        {time()}
      </div>
    </div>
  );
}
