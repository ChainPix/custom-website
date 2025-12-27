interface DedicatedWorkerGlobalScope extends WorkerGlobalScope {
  onmessage: ((this: DedicatedWorkerGlobalScope, ev: MessageEvent) => unknown) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
}

declare var self: DedicatedWorkerGlobalScope;
