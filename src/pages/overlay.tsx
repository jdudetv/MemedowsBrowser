import { render } from "solid-js/web";
import { createStore, produce } from "solid-js/store";
import {
  For,
  Index,
  Show,
  batch,
  createEffect,
  createSignal,
  useContext,
} from "solid-js";
import { object, z } from "zod";

import "xp.css";
import { startWS } from "../websocket";
import { EmotesContext } from "../";
import taskbarMain from "../../images/TaskbarMain.png";
import taskbarUp from "../../images/TaskBarUp.png";
import startBarUp from "../../images/StartBarUp.png";
import rightCorner from "../../images/RightCornerOverlay.png";
const images = import.meta.glob("../../images/*.png", { eager: true });

console.log(images);

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
    id: string;
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
    messageId: z.string(),
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
  z.object({
    type: z.literal("chatDelete"),
    id: z.string(),
  }),
  z.object({
    type: z.literal("chatUserDelete"),
    username: z.string(),
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
  const emotelist = useContext(EmotesContext)!;
  let chatstuff = JSON.parse(
    localStorage.getItem("chatStuff") ??
      JSON.stringify({ height: 800, width: 400, posX: 100, posY: 100 })
  );
  let queue: taskbar[] = [];
  let running = false;
  const [time, setTime] = createSignal<string>("");
  const [chatTransform, setchatTransform] = createSignal<chatProps>(chatstuff);
  const [newEvents, setNewEvent] = createStore<taskbar[]>(
    JSON.parse(
      localStorage.getItem("taskbarEvents") ??
        JSON.stringify([
          { type: "false" },
          {
            event: "follow",
            type: "event",
            username: "testing",
            message: "",
          },
          { type: "placeholder", username: "", message: "", event: "follow" },
        ])
    )
  );
  const [Messages, SetMessage] = createStore<chatMessage[]>(
    JSON.parse(
      localStorage.getItem("messages") ??
        JSON.stringify([
          {
            contents: [{ type: "text", text: "Microsoft<R> Windows DOS" }],
          },
          {
            contents: [
              { type: "text", text: "<C> Copyright Microsoft Corp 1990-2001." },
            ],
          },
        ])
    )
  );

  createEffect(() => {
    localStorage.setItem("taskbarEvents", JSON.stringify(newEvents));
    console.log(newEvents);
  });

  createEffect(() => {
    localStorage.setItem("messages", JSON.stringify(Messages));
    console.log(Messages);
  });

  const ws = startWS("ws://localhost:1890");

  ws.addEventListener("open", (event) => {
    console.log("open");
  });

  const eventLogic = (event: taskbar) => {
    setNewEvent(
      produce((array) => {
        array.shift();
        array.unshift(event);
      })
    );
    localStorage.setItem("eventList", JSON.stringify(newEvents));
    setTimeout(() => {
      setNewEvent([
        { type: "placeholder", username: "", message: "", event: "follow" },
        ...newEvents,
      ]);
      localStorage.setItem("eventList", JSON.stringify(newEvents));
      if (newEvents.length > 10) {
        setNewEvent(produce((array) => array.pop()));
        localStorage.setItem("eventList", JSON.stringify(newEvents));
      }
    }, 500);
  };

  const queueLoop = () => {
    running = true;
    eventLogic(queue.pop()!);
    setTimeout(() => {
      if (queue.length !== 0) queueLoop();
      if (queue.length === 0) running = false;
    }, 550);
  };

  ws.addEventListener("message", (data) => {
    const PARSED = MESSAGE.parse(JSON.parse(data.data));
    batch(() => {
      if (PARSED.type === "event") {
        const { event, type, message, username, amount } = PARSED;
        queue.unshift({ event, type, message, username, amount });
        if (running === false) {
          running = true;
          queueLoop();
          console.log("running");
        }
      }
    });

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

    if (PARSED.type === "chatDelete") {
      const { id } = PARSED;
      Messages.forEach((messages, index) => {
        if (id === messages.from?.id) {
          let array = [...Messages];
          array.splice(index, 1);
          SetMessage(array);
        }
      });
    }

    if (PARSED.type === "chatUserDelete") {
      const { username } = PARSED;
      let newArray: chatMessage[] = [];
      Messages.forEach((message) => {
        if (username.toLowerCase() !== message.from?.name.toLowerCase()) {
          newArray.push(message);
        }
      });
      SetMessage(newArray);
    }

    if (PARSED.type === "chatMessage") {
      const { message, username, userType, emotes, colour, messageId } = PARSED;

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
          if (emotelist[text]) {
            let end = text.length - 1;
            indexes.set(startIndex, {
              index: startIndex + end,
              src: emotelist[text].url,
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

      SetMessage(
        produce((messages) => {
          if (messages.length === 40) {
            messages.splice(0, 1);
          }

          messages.push({
            from: {
              name: username,
              color: colour,
              id: messageId,
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
                <For each={Messages}>
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
      <img class="bottom-0 absolute" src={taskbarMain}></img>
      <div
        class={`overflow-hidden bottom-0 absolute flex-row w-auto inline-flex ${
          newEvents[0].type === "placeholder"
            ? ""
            : "transition-all duration-500"
        }`}
        style={`left: ${newEvents[0].type === "placeholder" ? -5.2 : 6.2}%;`}
        // newEvent()[0] !== ""
        //   ? `animation-name: slide; animation-duration: 2s animation-delay: 2s;`
        //   : ``
      >
        <For each={newEvents}>
          {(event, index) => {
            const Event = () => event;
            return (
              <div
                class="flex-none"
                style={`margin-left: 1px; ${
                  Event().type === "false" ? "display: none" : ""
                }`}
              >
                <Show when={Event().event}>
                  {(event) => (
                    <img
                      class="absolute"
                      style={"bottom: 6px; margin-left: 4px;"}
                      width={24}
                      src={
                        images[
                          `../../images/${
                            event() === "cheer"
                              ? Event()!.amount?.toString()
                              : event() === "sub"
                              ? Event()!.amount?.toString() + "month"
                              : event()
                          }` + ".png"
                        ].default as string
                      }
                    />
                  )}
                </Show>
                <div
                  class="text-white font-light absolute"
                  style={`font-family: Tahoma, "Trebuchet MS", sans-serif; margin-left: 32px; margin-top: 9px; font-size: 14px; max-width: 200px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;`}
                >
                  {Event() ?? Event().username!.length > 12
                    ? Event().username?.substring(0, 12)
                    : Event().username}{" "}
                  {Event().message}
                </div>
                <img class="transition-all" src={taskbarUp}></img>
              </div>
            );
          }}
        </For>
      </div>

      <img
        class="bottom-0 absolute"
        style={`right: -${59}%; font-family: tahoma`}
        src={rightCorner}
      ></img>
      <div
        class="bottom-1 right-4 absolute text-white"
        style={"font-family: tahoma; font-size: 20px"}
      >
        {time()}
      </div>
      <img class="bottom-0 absolute" src={startBarUp}></img>
    </div>
  );
}
