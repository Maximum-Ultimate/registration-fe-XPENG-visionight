let ws = null;

export function connectWS() {
  if (ws) return ws;
  ws = new WebSocket("wss://cloud.xpengvisionnight.co.id");
  ws.onopen = () => {
    console.log("GLOBAL WS OPEN");
  };
  ws.onerror = (err) => {
    console.log("GLOBAL WS ERROR", err);
  };
  return ws;
}

export function getWS() {
  return ws;
}
export function sendWS(data) {
  return new Promise((resolve, reject) => {
    if (!ws) {
      return reject(new Error("WS not initialized"));
    }

    const send = () => {
      const handler = (event) => {
        const message = JSON.parse(event.data);
        if (
          ![
            "registered",
            "registered-plus-one",
            "dummy-users-generated",
          ].includes(message.type) &&
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
    };
    if (ws.readyState === WebSocket.OPEN) {
      send();
    } else {
      ws.addEventListener("open", send, { once: true });
    }
  });
}