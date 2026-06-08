let ws = null;

export function connectWS() {
  if (ws) return ws;
  ws = new WebSocket("wss://cloud.xpengvisionnight.co.id/");
  return ws;
}

export function sendWS(data) {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      reject(new Error("WebSocket not connected"));
      return;
    }

    const handler = (event) => {
      const message = JSON.parse(event.data);

      console.log("WS MESSAGE:", message);

      if (
        message.status === "success" &&
        message.type === "registered"
      ) {
        ws.removeEventListener("message", handler);
        resolve(message);
      }
    };

    ws.addEventListener("message", handler);

    ws.send(JSON.stringify(data));
  });
}