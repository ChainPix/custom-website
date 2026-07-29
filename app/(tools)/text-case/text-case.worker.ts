/// <reference lib="webworker" />

import { convertTextWithLineMode, type CaseType, type ConverterOptions } from "./convert";

const ctx = self as DedicatedWorkerGlobalScope;

ctx.onmessage = (event) => {
  const { id, text, keys, options } = event.data as {
    id: number;
    text: string;
    keys: CaseType[];
    options: ConverterOptions;
  };
  const outputs = keys.map((key) => [key, convertTextWithLineMode(text, key, options)] as const);
  ctx.postMessage({ id, outputs });
};
