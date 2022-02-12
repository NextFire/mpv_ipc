import { readLines } from "https://deno.land/std@0.125.0/io/mod.ts";

export interface MpvCommandResponse {
  error: string;
  data: any;
  request_id?: number;
}

export interface MpvEvent {
  event: string;
  name?: string;
  data?: any;
  id?: number;
  [key: string]: any;
}

interface PromiseController {
  resolve: CallableFunction;
  reject: CallableFunction;
}

export class MpvIPC {
  #socket: Deno.Conn | Deno.File;
  #cmdsCallbacks = new Map<number, PromiseController>();
  #eventsIterators = new Set<ReadableStreamDefaultController<MpvEvent>>();
  #lastId = 0;
  #encoder = new TextEncoder();

  constructor(socket: Deno.Conn | Deno.File) {
    this.#socket = socket;
    this.#startEventLoop();
  }

  static async connectSocket(path: string) {
    const socket = await Deno.connect({ path, transport: "unix" });
    return new this(socket);
  }

  static async connectFd(id: number | string) {
    const socket = await Deno.open(`/dev/fd/${id}`);
    return new this(socket);
  }

  async #startEventLoop() {
    for await (const line of readLines(this.#socket)) {
      const payload = JSON.parse(line);
      if ("error" in payload) {
        const handle = this.#cmdsCallbacks.get(payload.request_id);
        if (handle) {
          (payload.error === "success" ? handle.resolve : handle.reject)(
            payload
          );
          this.#cmdsCallbacks.delete(payload.request_id);
        }
      } else {
        for (const ctrlr of this.#eventsIterators) {
          ctrlr.enqueue(payload);
        }
      }
    }
  }

  #getId() {
    return ++this.#lastId;
  }

  sendCommand(
    command: string,
    ...args: (string | number | boolean)[]
  ): Promise<MpvCommandResponse> {
    return new Promise((resolve, reject) => {
      const requestID = this.#getId();
      // resp callback
      this.#cmdsCallbacks.set(requestID, { resolve, reject });
      // send req
      const payload = {
        command: [command, ...args],
        request_id: requestID,
        async: true,
      };
      const payloadString = JSON.stringify(payload) + "\n";
      this.#socket.write(this.#encoder.encode(payloadString)).catch(reject);
    });
  }

  observeProperty(event: string) {
    const observerID = this.#getId();
    return this.sendCommand("observe_property", observerID, event);
  }

  [Symbol.asyncIterator]() {
    let ctrlr: ReadableStreamDefaultController<MpvEvent>;
    return new ReadableStream<MpvEvent>({
      start: (controller) => {
        ctrlr = controller;
        this.#eventsIterators.add(ctrlr);
      },
      cancel: () => {
        this.#eventsIterators.delete(ctrlr);
      },
    })[Symbol.asyncIterator]();
  }
}
