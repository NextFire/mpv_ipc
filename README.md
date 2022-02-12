# mpv_ipc

[mpv-player/mpv](https://github.com/mpv-player/mpv) [JSON IPC](https://mpv.io/manual/stable/#json-ipc) wrapper for [Deno](https://deno.land).

## Usage

The module can be imported from https://deno.land/x/mpv_ipc/mod.ts

You will need to run your scripts with the `--unstable --allow-read --allow-write` flags.

## Example

```typescript
// replace 0.1.0 with the latest tag available
import { MpvIPC } from "https://deno.land/x/mpv_ipc@0.1.0/mod.ts";

// connect to socket
// mpv file.mkv --input-ipc-server=/tmp/mpvsocket
const client = await MpvIPC.connectSocket("/tmp/mpvsocket");

// send a command and await the response
const resp1 = client.sendCommand("screenshot");
console.log(resp1);

// subscribe to specific events
const resp2 = await client.observeProperty("volume");
console.log(resp2);

// read events
for await (const event of client) {
  console.log(event);
}
```
