/**
 * Typed request/response wrapper around a Web Worker.
 *
 * Most tool workers follow the same shape: post a message with a `type` and
 * payload, receive either a result message or an `{ type: "ERROR" }` message.
 * This wrapper normalizes that into promises with timeouts so clients don't
 * hand-roll onmessage/onerror plumbing.
 *
 * const client = createWorkerClient(() => new Worker(new URL("./my.worker", import.meta.url)));
 * const result = await client.request({ type: "FORMAT", payload }, { timeoutMs: 10_000 });
 * client.terminate();
 */

export type WorkerClientOptions = {
  /** Reject the request after this many ms (default 30s). */
  timeoutMs?: number;
  /**
   * Predicate deciding whether an incoming message answers this request.
   * Defaults to accepting the first message received.
   */
  match?: (data: unknown) => boolean;
};

export type WorkerClient = {
  /** Post a message and resolve with the first (matching) response. */
  request: <TResponse = unknown>(
    message: unknown,
    options?: WorkerClientOptions
  ) => Promise<TResponse>;
  /** Fire-and-forget post. */
  post: (message: unknown) => void;
  /** The underlying worker (lazily created on first use). */
  worker: () => Worker;
  terminate: () => void;
};

const DEFAULT_TIMEOUT_MS = 30_000;

export function createWorkerClient(factory: () => Worker): WorkerClient {
  let instance: Worker | null = null;

  const worker = () => {
    if (!instance) instance = factory();
    return instance;
  };

  const request = <TResponse = unknown>(
    message: unknown,
    options: WorkerClientOptions = {}
  ): Promise<TResponse> => {
    const { timeoutMs = DEFAULT_TIMEOUT_MS, match } = options;
    const target = worker();

    return new Promise<TResponse>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        target.removeEventListener("message", onMessage);
        target.removeEventListener("error", onError);
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Worker request timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      const onMessage = (event: MessageEvent) => {
        if (match && !match(event.data)) return;
        cleanup();
        const data = event.data as { type?: string; payload?: unknown };
        if (data && typeof data === "object" && data.type === "ERROR") {
          reject(new Error(typeof data.payload === "string" ? data.payload : "Worker error"));
        } else {
          resolve(event.data as TResponse);
        }
      };

      const onError = (event: ErrorEvent) => {
        cleanup();
        reject(new Error(event.message || "Worker crashed"));
      };

      target.addEventListener("message", onMessage);
      target.addEventListener("error", onError);
      target.postMessage(message);
    });
  };

  return {
    request,
    post: (message: unknown) => worker().postMessage(message),
    worker,
    terminate: () => {
      instance?.terminate();
      instance = null;
    },
  };
}
