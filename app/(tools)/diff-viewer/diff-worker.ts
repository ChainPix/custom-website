type DiffLine = {
  type: "same" | "add" | "remove" | "change";
  leftText?: string;
  rightText?: string;
  leftLine?: number;
  rightLine?: number;
};

type DiffOp = {
  type: "equal" | "insert" | "delete";
  leftIndex?: number;
  rightIndex?: number;
};

type WhitespaceOptions = {
  ignoreTrailingWhitespace: boolean;
  ignoreAllWhitespace: boolean;
  ignoreIndentation: boolean;
  normalizeLineEndings: boolean;
  useTabWidth: boolean;
  tabWidth: number;
};

function normalizeLineEndings(text: string, enabled: boolean) {
  if (!enabled) {
    return text;
  }
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function normalizeLineForCompare(line: string, options: WhitespaceOptions) {
  let value = line;
  if (options.useTabWidth) {
    value = value.replace(/\t/g, " ".repeat(options.tabWidth));
  }
  if (options.ignoreAllWhitespace) {
    return value.replace(/\s+/g, "");
  }
  if (options.ignoreIndentation) {
    value = value.replace(/^\s+/, "");
  }
  if (options.ignoreTrailingWhitespace) {
    value = value.replace(/\s+$/, "");
  }
  return value;
}

function myersDiffOps(leftCompare: string[], rightCompare: string[]): DiffOp[] {
  const n = leftCompare.length;
  const m = rightCompare.length;
  const max = n + m;
  const offset = max;
  const v = new Array(2 * max + 1).fill(0);
  const trace: number[][] = [];

  for (let d = 0; d <= max; d += 1) {
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])) {
        x = v[offset + k + 1];
      } else {
        x = v[offset + k - 1] + 1;
      }
      let y = x - k;
      while (x < n && y < m && leftCompare[x] === rightCompare[y]) {
        x += 1;
        y += 1;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        trace.push(v.slice());
        return backtrackDiff(trace, leftCompare, rightCompare, offset);
      }
    }
    trace.push(v.slice());
  }

  return [];
}

function backtrackDiff(trace: number[][], leftCompare: string[], rightCompare: string[], offset: number): DiffOp[] {
  let x = leftCompare.length;
  let y = rightCompare.length;
  const ops: DiffOp[] = [];

  for (let d = trace.length - 1; d > 0; d -= 1) {
    const v = trace[d - 1];
    const k = x - y;
    const prevK =
      k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1]) ? k + 1 : k - 1;
    const prevX = v[offset + prevK];
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      ops.push({ type: "equal", leftIndex: x - 1, rightIndex: y - 1 });
      x -= 1;
      y -= 1;
    }

    if (x === prevX) {
      ops.push({ type: "insert", rightIndex: y - 1 });
      y -= 1;
    } else {
      ops.push({ type: "delete", leftIndex: x - 1 });
      x -= 1;
    }
  }

  while (x > 0 && y > 0) {
    ops.push({ type: "equal", leftIndex: x - 1, rightIndex: y - 1 });
    x -= 1;
    y -= 1;
  }

  while (x > 0) {
    ops.push({ type: "delete", leftIndex: x - 1 });
    x -= 1;
  }

  while (y > 0) {
    ops.push({ type: "insert", rightIndex: y - 1 });
    y -= 1;
  }

  return ops.reverse();
}

function diffLinesMyers(leftText: string, rightText: string, options: WhitespaceOptions): DiffLine[] {
  const leftNormalized = normalizeLineEndings(leftText, options.normalizeLineEndings);
  const rightNormalized = normalizeLineEndings(rightText, options.normalizeLineEndings);
  const leftLines = leftNormalized.split(/\r?\n/);
  const rightLines = rightNormalized.split(/\r?\n/);
  const leftCompare = leftLines.map((line) => normalizeLineForCompare(line, options));
  const rightCompare = rightLines.map((line) => normalizeLineForCompare(line, options));
  const ops = myersDiffOps(leftCompare, rightCompare);
  const result: DiffLine[] = [];
  let leftLine = 1;
  let rightLine = 1;

  for (let i = 0; i < ops.length; ) {
    const op = ops[i];
    if (op.type === "equal") {
      const leftTextValue = op.leftIndex !== undefined ? leftLines[op.leftIndex] : "";
      result.push({
        type: "same",
        leftText: leftTextValue,
        rightText: leftTextValue,
        leftLine,
        rightLine,
      });
      leftLine += 1;
      rightLine += 1;
      i += 1;
      continue;
    }

    const deletes: string[] = [];
    const inserts: string[] = [];
    while (i < ops.length && ops[i].type !== "equal") {
      if (ops[i].type === "delete") {
        const idx = ops[i].leftIndex ?? -1;
        deletes.push(leftLines[idx] ?? "");
      } else {
        const idx = ops[i].rightIndex ?? -1;
        inserts.push(rightLines[idx] ?? "");
      }
      i += 1;
    }

    const blockSize = Math.max(deletes.length, inserts.length);
    for (let j = 0; j < blockSize; j += 1) {
      const leftValue = deletes[j];
      const rightValue = inserts[j];
      if (leftValue !== undefined && rightValue !== undefined) {
        result.push({
          type: "change",
          leftText: leftValue,
          rightText: rightValue,
          leftLine,
          rightLine,
        });
        leftLine += 1;
        rightLine += 1;
      } else if (leftValue !== undefined) {
        result.push({ type: "remove", leftText: leftValue, leftLine });
        leftLine += 1;
      } else if (rightValue !== undefined) {
        result.push({ type: "add", rightText: rightValue, rightLine });
        rightLine += 1;
      }
    }
  }

  return result;
}

self.onmessage = (event: MessageEvent<{ requestId: number; left: string; right: string; options: WhitespaceOptions }>) => {
  const { requestId, left, right, options } = event.data;
  const diff = diffLinesMyers(left, right, options);
  self.postMessage({ requestId, diff });
};
