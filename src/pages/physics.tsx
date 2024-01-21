import OBSWebSocket, { EventSubscription } from "obs-websocket-js";
import p2, { Body, Box } from "p2";

export default function () {
  let world = new p2.World({
    gravity: [0, 9.81],
  });

  const sceneItems = new Map<number, any>();
  let physicsScene = "";

  function toDegrees(value: number) {
    return value * (180 / Math.PI);
  }

  function toRadians(value: number) {
    return value * (Math.PI / 180);
  }

  const obs = new OBSWebSocket();

  obs.connect("ws://localhost:4455", "", {
    eventSubscriptions:
      EventSubscription.All |
      EventSubscription.SceneItemTransformChanged |
      EventSubscription.InputActiveStateChanged |
      EventSubscription.InputShowStateChanged,
  });

  obs.on("ConnectionOpened", async () => {
    console.log("connected");
    setTimeout(async () => {
      let sceneList = await obs.call("GetSceneList");
      sceneList.scenes.forEach((scene) => {
        if (scene.sceneName.includes("[world]")) {
          physicsScene = scene.sceneName;
        }
      });
      let returnData = await obs.call("GetSceneItemList", {
        sceneName: physicsScene,
      });
      returnData.sceneItems.forEach((item) => {
        if (item.sourceName.includes("[p]")) {
          if (sceneItems.get(item.sceneItemId) === undefined) {
            let body = new p2.Body({
              mass: 5,
              position: [
                item.sceneItemTransform.positionX / 100,
                item.sceneItemTransform.positionY / 100,
              ],
              angle: toRadians(item.sceneItemTransform.rotation),
            });
            let shape = new p2.Box({
              height:
                ((item.sceneItemTransform.sourceHeight -
                  (item.sceneItemTransform.cropTop +
                    item.sceneItemTransform.cropBottom)) *
                  item.sceneItemTransform.scaleY) /
                100,
              width:
                ((item.sceneItemTransform.sourceWidth -
                  (item.sceneItemTransform.cropRight +
                    item.sceneItemTransform.cropLeft)) *
                  item.sceneItemTransform.scaleX) /
                100,
            });
            body.addShape(shape);

            world.addBody(body);
            sceneItems.set(item.sceneItemId, {
              body,
              shape,
              id: item.sceneItemId,
            });
          }
        }
      });
    }, 500);
  });

  obs.on("SceneItemRemoved", async (item) => {
    if (item.sceneName === physicsScene) {
      let physics = sceneItems.get(item.sceneItemId);
      world.removeBody(physics.body);
      sceneItems.delete(item.sceneItemId);
    }
  });

  obs.on("SceneItemCreated", async (data) => {
    console.log(data);
    if (data.sourceName.includes("[p]")) {
      if (sceneItems.get(data.sceneItemId) === undefined) {
        let item = await obs.call("GetSceneItemTransform", {
          sceneName: physicsScene,
          sceneItemId: data.sceneItemId,
        });
        let body = new p2.Body({
          mass: 5,
          position: [
            item.sceneItemTransform.positionX / 100,
            item.sceneItemTransform.positionY / 100,
          ],
          angle: toRadians(item.sceneItemTransform.rotation),
        });
        let shape = new p2.Box({
          height:
            ((item.sceneItemTransform.sourceHeight -
              (item.sceneItemTransform.cropTop +
                item.sceneItemTransform.cropBottom)) *
              item.sceneItemTransform.scaleY) /
            100,
          width:
            ((item.sceneItemTransform.sourceWidth -
              (item.sceneItemTransform.cropRight +
                item.sceneItemTransform.cropLeft)) *
              item.sceneItemTransform.scaleX) /
            100,
        });
        body.addShape(shape);

        world.addBody(body);
        sceneItems.set(data.sceneItemId, {
          body,
          shape,
          id: data.sceneItemId,
        });
      }
    }
  });

  obs.on("InputCreated", async (data) => {
    console.log("creates");
    if (data.inputName.includes("[p]")) {
      let returnData = await obs.call("GetSceneItemList", {
        sceneName: physicsScene,
      });
      returnData.sceneItems.forEach((item) => {
        if (item.sourceName === data.inputName) {
          if (sceneItems.get(item.sceneItemId) === undefined) {
            let body = new p2.Body({
              mass: 5,
              position: [
                item.sceneItemTransform.positionX / 100,
                item.sceneItemTransform.positionY / 100,
              ],
              angle: toRadians(item.sceneItemTransform.rotation),
            });
            let shape = new p2.Box({
              height:
                ((item.sceneItemTransform.sourceHeight -
                  (item.sceneItemTransform.cropTop +
                    item.sceneItemTransform.cropBottom)) *
                  item.sceneItemTransform.scaleY) /
                100,
              width:
                ((item.sceneItemTransform.sourceWidth -
                  (item.sceneItemTransform.cropRight +
                    item.sceneItemTransform.cropLeft)) *
                  item.sceneItemTransform.scaleX) /
                100,
            });
            body.addShape(shape);

            world.addBody(body);
            sceneItems.set(item.sceneItemId, {
              body,
              shape,
              id: item.sceneItemId,
            });
          }
        }
      });
    } else {
      if (data.oldInputName.includes("[p]")) {
        let returnData = await obs.call("GetSceneItemList", {
          sceneName: physicsScene,
        });
        returnData.sceneItems.forEach((item) => {
          if (item.sourceName === data.inputName) {
            let physics = sceneItems.get(item.sceneItemId);
            world.removeBody(physics.body);
            sceneItems.delete(item.sceneItemId);
          }
        });
      }
    }
  });

  obs.on("InputNameChanged", async (data) => {
    console.log(data);
    if (data.inputName.includes("[p]")) {
      let returnData = await obs.call("GetSceneItemList", {
        sceneName: physicsScene,
      });
      returnData.sceneItems.forEach(async (item) => {
        console.log(item);
        if (item.inputKind === null) {
          let returnScene = await obs.call("GetSceneItemList", {
            sceneName: item.sourceName,
          });
          returnScene.sceneItems.forEach(async (sceneitem) => {
            if (sceneitem.sourceName === data.inputName) {
              if (sceneItems.get(item.sceneItemId) === undefined) {
                let body = new p2.Body({
                  mass: 5,
                  position: [
                    item.sceneItemTransform.positionX / 100,
                    item.sceneItemTransform.positionY / 100,
                  ],
                  angle: toRadians(item.sceneItemTransform.rotation),
                });
                let shape = new p2.Box({
                  height:
                    ((sceneitem.sceneItemTransform.sourceHeight -
                      (sceneitem.sceneItemTransform.cropTop +
                        sceneitem.sceneItemTransform.cropBottom)) *
                      sceneitem.sceneItemTransform.scaleY) /
                    100,
                  width:
                    ((sceneitem.sceneItemTransform.sourceWidth -
                      (sceneitem.sceneItemTransform.cropRight +
                        sceneitem.sceneItemTransform.cropLeft)) *
                      sceneitem.sceneItemTransform.scaleX) /
                    100,
                });
                body.addShape(shape);

                world.addBody(body);
                sceneItems.set(item.sceneItemId, {
                  body,
                  shape,
                  id: item.sceneItemId,
                });
              }
            }
          });
        }
        if (item.sourceName === data.inputName) {
          if (sceneItems.get(item.sceneItemId) === undefined) {
            let body = new p2.Body({
              mass: 5,
              position: [
                item.sceneItemTransform.positionX / 100,
                item.sceneItemTransform.positionY / 100,
              ],
              angle: toRadians(item.sceneItemTransform.rotation),
            });
            let shape = new p2.Box({
              height:
                ((item.sceneItemTransform.sourceHeight -
                  (item.sceneItemTransform.cropTop +
                    item.sceneItemTransform.cropBottom)) *
                  item.sceneItemTransform.scaleY) /
                100,
              width:
                ((item.sceneItemTransform.sourceWidth -
                  (item.sceneItemTransform.cropRight +
                    item.sceneItemTransform.cropLeft)) *
                  item.sceneItemTransform.scaleX) /
                100,
            });
            body.addShape(shape);

            world.addBody(body);
            sceneItems.set(item.sceneItemId, {
              body,
              shape,
              id: item.sceneItemId,
            });
          }
        }
      });
    } else {
      if (data.oldInputName.includes("[p]")) {
        let returnData = await obs.call("GetSceneItemList", {
          sceneName: physicsScene,
        });
        returnData.sceneItems.forEach(async (item) => {
          console.log(item);
          if (item.inputKind === null) {
            let returnScene = await obs.call("GetSceneItemList", {
              sceneName: item.sourceName,
            });
            returnScene.sceneItems.forEach(async (subItem) => {
              if (subItem.sourceName === data.inputName) {
                let physics = sceneItems.get(item.sceneItemId);
                world.removeBody(physics.body);
                sceneItems.delete(item.sceneItemId);
              }
            });
          }
          if (item.sourceName === data.inputName) {
            let physics = sceneItems.get(item.sceneItemId);
            world.removeBody(physics.body);
            sceneItems.delete(item.sceneItemId);
          }
        });
      }
    }
  });

  obs.on("InputNameChanged", async (data) => {
    console.log(data);
    if (data.inputName.includes("[p]")) {
      let returnData = await obs.call("GetSceneItemList", {
        sceneName: physicsScene,
      });
      returnData.sceneItems.forEach((item) => {
        if (item.sourceName === data.inputName) {
          if (sceneItems.get(item.sceneItemId) === undefined) {
            let body = new p2.Body({
              mass: 5,
              position: [
                item.sceneItemTransform.positionX / 100,
                item.sceneItemTransform.positionY / 100,
              ],
              angle: toRadians(item.sceneItemTransform.rotation),
            });
            let shape = new p2.Box({
              height:
                ((item.sceneItemTransform.sourceHeight -
                  (item.sceneItemTransform.cropTop +
                    item.sceneItemTransform.cropBottom)) *
                  item.sceneItemTransform.scaleY) /
                100,
              width:
                ((item.sceneItemTransform.sourceWidth -
                  (item.sceneItemTransform.cropRight +
                    item.sceneItemTransform.cropLeft)) *
                  item.sceneItemTransform.scaleX) /
                100,
            });
            body.addShape(shape);

            world.addBody(body);
            sceneItems.set(item.sceneItemId, {
              body,
              shape,
              id: item.sceneItemId,
            });
          }
        }
      });
    } else {
      if (data.oldInputName.includes("[p]")) {
        let returnData = await obs.call("GetSceneItemList", {
          sceneName: physicsScene,
        });
        returnData.sceneItems.forEach((item) => {
          if (item.sourceName === data.inputName) {
            let physics = sceneItems.get(item.sceneItemId);
            world.removeBody(physics.body);
            sceneItems.delete(item.sceneItemId);
          }
        });
      }
    }
  });

  const borders: { width: number; height: number; x: number; y: number }[] = [
    {
      width: 19.2,
      height: 10,
      x: 19.2 / 2,
      y: 10.8 + 4.6,
    },
    {
      width: 19.2,
      height: 1,
      x: 19.2 / 2,
      y: -30,
    },
    {
      width: 10,
      height: 10.8,
      x: 19.2 + 5,
      y: 10.8 / 2,
    },
    {
      width: 10,
      height: 10.8,
      x: -5,
      y: 10.8 / 2,
    },
  ];

  borders.forEach(({ width, height, x, y }) => {
    let shape = new Box({
      width,
      height,
    });

    let body = new Body({
      position: [x, y],
    });

    body.addShape(shape);
    world.addBody(body);
  });

  let fixedTimeStep = 1 / 60; // seconds
  let maxSubSteps = 10; // Max sub steps to catch up with the wall clock
  let lastTime: number;

  function animate(time) {
    requestAnimationFrame(animate);

    // Compute elapsed time since last render frame
    var deltaTime = lastTime ? (time - lastTime) / 1000 : 0;

    // Move bodies forward in time
    world.step(fixedTimeStep, deltaTime, maxSubSteps);
    for (let [key, value] of sceneItems) {
      obs.call("SetSceneItemTransform", {
        sceneName: physicsScene,
        sceneItemId: key,
        sceneItemTransform: {
          positionX: value.body.position[0] * 100,
          positionY: value.body.position[1] * 100,
          rotation: toDegrees(value.body.angle) % 360,
        },
      });
    }

    lastTime = time;
  }

  // Start the animation loop
  requestAnimationFrame(animate);

  return <div>test</div>;
}
