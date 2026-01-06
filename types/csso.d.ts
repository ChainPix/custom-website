declare module "csso" {
  type MinifyOptions = Record<string, unknown>;
  type MinifyResult = { css: string };
  export function minify(input: string, options?: MinifyOptions): MinifyResult;
}
