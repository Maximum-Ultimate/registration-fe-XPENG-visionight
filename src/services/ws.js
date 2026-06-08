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

      // hanya tangkap response REGISTER
      if (
        message.type !== "registered" &&
        message.status !== "error"
      ) {
        return;
      }

      ws.removeEventListener("message", handler);

      if (message.status === "error") {
        reject(new Error(message.message));
        return;
      }

      resolve(message);
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify(data));
  });
}