export async function emotes() {
  const bttvEmotes = await fetch(
    "https://api.betterttv.net/3/cached/users/twitch/25118940"
  ).then((value) => value.json());

  const bttvGlobalEmotes = await fetch(
    "https://api.betterttv.net/3/cached/emotes/global"
  ).then((value) => value.json());

  const ffzEmotes = await fetch(
    "https://api.frankerfacez.com/v1/room/id/25118940"
  ).then((value) => value.json());

  const ffzGlobalEmotes = await fetch(
    "https://api.frankerfacez.com/v1/set/global"
  ).then((value) => value.json());

  console.log(ffzEmotes);

  const customEmotes: Record<string, { url: string }> = {};
  bttvEmotes.channelEmotes.forEach((value: any) => {
    customEmotes[value.code] = {
      url: `https://cdn.betterttv.net/emote/${value.id}/1x`,
    };
  });
  bttvEmotes.sharedEmotes.forEach((value: any) => {
    customEmotes[value.code] = {
      url: `https://cdn.betterttv.net/emote/${value.id}/1x`,
    };
  });
  bttvGlobalEmotes.forEach((value: any) => {
    customEmotes[value.code] = {
      url: `https://cdn.betterttv.net/emote/${value.id}/1x`,
    };
  });

  for (const [key, value] of Object.entries(ffzEmotes["sets"])) {
    // @ts-ignore
    value["emoticons"].forEach((value: any) => {
      customEmotes[value.name] = {
        url: value.urls["1"],
      };
    });
  }

  for (const [key, value] of Object.entries(ffzGlobalEmotes["sets"])) {
    // @ts-ignore
    value["emoticons"].forEach((value: any) => {
      customEmotes[value.name] = {
        url: value.urls["1"],
      };
    });
  }

  console.log(customEmotes);

  return customEmotes;
}
