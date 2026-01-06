declare module "html-minifier-terser" {
  type MinifyOptions = Record<string, unknown>;
  export function minify(input: string, options?: MinifyOptions): Promise<string> | string;
}
