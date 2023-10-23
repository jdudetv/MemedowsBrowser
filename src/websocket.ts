export function startWS(url: string) {
  const ws = new WebSocket(url);

  return ws;
}
