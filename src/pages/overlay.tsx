import { render } from "solid-js/web";
import { createStore, produce } from "solid-js/store";
import { For, Index, createSignal } from "solid-js";
import { object, z } from "zod";

import "xp.css";
import { startWS } from "../websocket";
import { CustomEmotes } from "..";
import { emotes } from "../emotes";

type UserType = "B" | "VIP" | "MOD" | "SUB";

const userTypeClasses = {
  B: "text-[#ff0000]",
  VIP: "text-[#ff00e1]",
  MOD: "text-[#00c903]",
  SUB: "text-[#058bf2]",
} satisfies Record<UserType, string>;

type chatMessage = {
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

const MESSAGE = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("chatMessage"),
    username: z.string(),
    message: z.string(),
    colour: z.string(),
    emotes: z.record(z.array(z.string())),
    userType: z.string(),
  }),
  z.object({
    type: z.literal("chatSize"),
    width: z.number().optional(),
    height: z.number().optional(),
    posX: z.number().optional(),
    posY: z.number().optional(),
  }),
  z.object({
    type: z.literal("event"),
    event: z.string(),
    username: z.string(),
    message: z.string(),
    amount: z.optional(z.number()),
  }),
]);

type chatProps = {
  height: number;
  width: number;
  posX: number;
  posY: number;
};

type taskbar = {
  type: string;
  event?: string;
  username?: string;
  message?: string;
  amount?: number;
};

export default function () {
  let chatstuff = JSON.parse(
    localStorage.getItem("chatStuff") ??
      `{"height": 800, "width": 400, "posX": 100, "posY": 100}`
  );
  let queue: taskbar[] = [];
  let running = false;
  const [time, setTime] = createSignal<string>("");
  const [chatTransform, setchatTransform] = createSignal<chatProps>(chatstuff);
  const [newEvent, setNewEvent] = createStore<taskbar[]>([
    { type: "false" },
    {
      event: "follow",
      type: "event",
      username: "testing",
      message: "",
    },
    { type: "placeholder", username: "", message: "", event: "follow" },
  ]);
  const [newMessages, setNewMessages] = createStore<chatMessage[]>([
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

  const eventLogic = (event: taskbar) => {
    let data = [...newEvent];
    data.splice(-1);
    setNewEvent([...data, event]);
    console.log(newEvent);
    localStorage.setItem("eventList", JSON.stringify(newEvent));
    setTimeout(() => {
      setNewEvent([
        ...newEvent,
        { type: "placeholder", username: "", message: "", event: "follow" },
      ]);
      localStorage.setItem("eventList", JSON.stringify(newEvent));
      if (newEvent.length > 10) {
        let array = [...newEvent];
        array.splice(1, 1);
        setNewEvent([...array]);
        localStorage.setItem("eventList", JSON.stringify(newEvent));
      }
    }, 500);
  };

  const queueLoop = () => {
    running = true;
    eventLogic(queue.shift());
    setTimeout(() => {
      if (queue.length !== 0) queueLoop();
      if (queue.length === 0) running = false;
    }, 550);
  };

  ws.addEventListener("message", (data) => {
    const PARSED = MESSAGE.parse(JSON.parse(data.data));

    if (PARSED.type === "event") {
      const { event, type, message, username, amount } = PARSED;
      queue.push({ event, type, message, username, amount });
      if (running === false) {
        running = true;
        queueLoop();
        console.log("running");
      }
    }

    if (PARSED.type === "chatSize") {
      let data = { ...chatTransform() };
      const { height, width, posX, posY } = PARSED;
      if (height) {
        data.height = height;
      }
      if (width) {
        data.width = width;
      }
      if (posX) {
        data.posX = posX;
      }
      if (posY) {
        data.posY = posY;
      }
      setchatTransform(data);
      localStorage.setItem("chatStuff", JSON.stringify(data));
    }

    if (PARSED.type === "chatMessage") {
      const { message, username, userType, emotes, colour } = PARSED;

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

      let contents: chatMessage["contents"] = [];

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
    }
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
      <div>
        <div
          class="window transition-all duration-1000"
          style={`width: ${chatTransform().width}px; transform: translateX(${
            chatTransform().posX
          }px) translateY(${chatTransform().posY}px)`}
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
              class="duration-1000 transition-all"
              style={`max-height: ${
                chatTransform().height
              }px; overflow: hidden; display: flex; flex-direction: column-reverse; margin: -8px -5px;`}
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
                                <img
                                  src={msgContent.src}
                                  class="inline-block"
                                />
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
      </div>
      <img class="bottom-0 absolute" src="./images/taskbarmain.png"></img>
      <div
        class={`overflow-hidden bottom-0 absolute flex-row w-auto inline-flex ${
          newEvent[newEvent.length - 1].type === "placeholder"
            ? ""
            : "transition-all duration-500"
        }`}
        style={`left: ${
          newEvent[newEvent.length - 1].type === "placeholder" ? -5.2 : 6.25
        }%;`}
        // newEvent()[0] !== ""
        //   ? `animation-name: slide; animation-duration: 2s animation-delay: 2s;`
        //   : ``
      >
        <For each={newEvent}>
          {(events, index) => (
            <div
              class="flex-none"
              style={`margin-left: 1px; ${
                newEvent[newEvent.length - index() - 1].type === "false"
                  ? "display: none"
                  : ""
              }`}
            >
              {newEvent[newEvent.length - index() - 1].event ? (
                <img
                  class="absolute"
                  style={"bottom: 6px; margin-left: 4px;"}
                  width={24}
                  src={
                    `./images/${
                      newEvent[newEvent.length - index() - 1].event === "cheer"
                        ? newEvent[
                            newEvent.length - index() - 1
                          ]!.amount?.toString()
                        : newEvent[newEvent.length - index() - 1].event ===
                          "sub"
                        ? newEvent[
                            newEvent.length - index() - 1
                          ]!.amount?.toString() + "month"
                        : newEvent[newEvent.length - index() - 1].event
                    }` + ".png"
                  }
                ></img>
              ) : (
                <></>
              )}
              <div
                class="text-white font-light absolute"
                style={`font-family: Tahoma, "Trebuchet MS", sans-serif; margin-left: 32px; margin-top: 9px; font-size: 14px; max-width: 200px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;`}
              >
                {newEvent[newEvent.length - index() - 1] ??
                newEvent[newEvent.length - index() - 1].username!.length > 12
                  ? newEvent[newEvent.length - index() - 1].username?.substring(
                      0,
                      12
                    )
                  : newEvent[newEvent.length - index() - 1].username}{" "}
                {newEvent[newEvent.length - index() - 1].message}
              </div>
              <img class="transition-all" src="./images/taskbarup.png"></img>
            </div>
          )}
        </For>
      </div>

      <img
        class="bottom-0 absolute"
        style={`right: -${59}%; font-family: tahoma`}
        src="./images/rightcorneroverlay.png"
      ></img>
      <div
        class="bottom-1 right-4 absolute text-white"
        style={"font-family: tahoma; font-size: 20px"}
      >
        {time()}
      </div>
      <img class="bottom-0 absolute" src="./images/startbarup.png"></img>
    </div>
  );
}
