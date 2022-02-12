import { MpvIPC } from "../mod.ts";

// connect to socket
// mpv file.mkv --input-ipc-server=/tmp/mpvsocket
const client = await MpvIPC.connectSocket("/tmp/mpvsocket");

// send a command and await the response
const resp1 = await client.sendCommand("screenshot");
console.log(resp1);

// subscribe to specific events
const resp2 = await client.observeProperty("volume");
console.log(resp2);

// read events
for await (const event of client) {
  console.log(event);
}
