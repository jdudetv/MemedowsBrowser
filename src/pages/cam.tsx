import { createStore, produce } from "solid-js/store";
import { For, createSignal } from "solid-js";

import "xp.css";
import OBSWebSocket, { EventSubscription } from "obs-websocket-js";

interface SceneItemTransform {
  sourceWidth: number;
  sourceHeight: number;

  positionX: number;
  positionY: number;

  rotation: number;

  scaleX: number;
  scaleY: number;

  width: number;
  height: number;

  alignment: number;

  boundsAlignment: number;
  boundsWidth: number;
  boundsHeight: number;

  cropLeft: number;
  cropTop: number;
  cropRight: number;
  cropBottom: number;
}

type camMove = {
  sx: number;
  sy: number;
  yCrop: number;
  xCrop: number;
};

export default function () {
  const [camTransform, setCamTransform] = createStore<camMove>({
    sy: 0.5,
    sx: 0.5,
    yCrop: 0,
    xCrop: 0,
  });

  const obs = new OBSWebSocket();

  obs
    .connect("ws://localhost:4455", "", {
      eventSubscriptions:
        EventSubscription.All |
        EventSubscription.SceneItemTransformChanged |
        EventSubscription.InputActiveStateChanged |
        EventSubscription.InputShowStateChanged,
    })
    .then(async () => {
      await obs
        .call("GetSceneItemTransform", {
          sceneItemId: 3,
          sceneName: "CAMFORMAIN",
        })
        .then((data) => {
          // @ts-ignore
          let transform = data.sceneItemTransform as SceneItemTransform;
          setCamTransform({
            sx: (transform.scaleX * 2) as number,
            sy: (transform.scaleY * 2) as number,
            xCrop: transform.cropLeft / 2 + transform.cropRight / 2,
            yCrop: transform.cropBottom / 2 + transform.cropTop / 2,
          });
        });
    });

  obs.on("SceneItemTransformChanged", (data) => {
    console.log(data);
    if (data.sceneItemId === 3 && data.sceneName === "CAMFORMAIN") {
      // @ts-ignore
      let t = data.sceneItemTransform as SceneItemTransform;
      if (t) {
        console.log(t);
        setCamTransform({
          sx: t.scaleX * 2,
          sy: t.scaleY * 2,
          xCrop: t.cropLeft / 2 + t.cropRight / 2,
          yCrop: t.cropBottom / 2 + t.cropTop / 2,
        });
      }
    }
  });

  return (
    <div>
      <div class="absolute">
        <div
          class="window"
          style={`width: ${Math.min(
            1920,
            1920 * camTransform.sx - camTransform.xCrop * camTransform.sx
          )}px; background: none; transform: translateX(${Math.max(
            0,
            960 -
              960 * camTransform.sx +
              (camTransform.xCrop * camTransform.sx) / 2
          )}px) translateY(${Math.max(
            0,
            526 -
              526 * camTransform.sy +
              (camTransform.yCrop * camTransform.sy) / 2
          )}px);`}
        >
          <div class="title-bar" style={"height: 28px"}>
            <div class="title-bar-text">Camera</div>
            <div class="title-bar-controls">
              <button aria-label="Minimize"></button>
              <button aria-label="Maximize"></button>
              <button aria-label="Close"></button>
            </div>
          </div>
          <div
            class="window-body"
            style={`height: ${Math.min(
              1049,
              1049 * camTransform.sy -
                14 * (1 - camTransform.sy) -
                camTransform.yCrop * camTransform.sy
            )}px; overflow: hidden; margin: 0px; opacity: 0.0`}
          ></div>
        </div>
      </div>
    </div>
  );
}
