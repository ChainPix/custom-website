export type Unit = "px" | "rem" | "em" | "vw" | "vh" | "vmin" | "vmax" | "%" | "ch" | "ex" | "pt" | "pc" | "in" | "cm" | "mm";

export type ConversionContext = {
  rootFont: number;
  elementFont: number;
  vw: number;
  vh: number;
  percentContext: number;
  dpi: number;
  chRatio: number;
  exRatio: number;
};

export const convertToPx = (value: number, unit: Unit, ctx: ConversionContext): number => {
  switch (unit) {
    case "px":
      return value;
    case "rem":
      return value * ctx.rootFont;
    case "em":
      return value * ctx.elementFont;
    case "vw":
      return (value / 100) * ctx.vw;
    case "vh":
      return (value / 100) * ctx.vh;
    case "vmin":
      return (value / 100) * Math.min(ctx.vw, ctx.vh);
    case "vmax":
      return (value / 100) * Math.max(ctx.vw, ctx.vh);
    case "%":
      return (value / 100) * ctx.percentContext;
    case "ch":
      return value * ctx.elementFont * ctx.chRatio;
    case "ex":
      return value * ctx.elementFont * ctx.exRatio;
    case "in":
      return value * ctx.dpi;
    case "pt":
      return (value / 72) * ctx.dpi;
    case "pc":
      return (value / 6) * ctx.dpi;
    case "cm":
      return (value / 2.54) * ctx.dpi;
    case "mm":
      return (value / 25.4) * ctx.dpi;
    default:
      return value;
  }
};

export const convertFromPx = (px: number, unit: Unit, ctx: ConversionContext): number => {
  switch (unit) {
    case "px":
      return px;
    case "rem":
      return px / ctx.rootFont;
    case "em":
      return px / ctx.elementFont;
    case "vw":
      return (px / ctx.vw) * 100;
    case "vh":
      return (px / ctx.vh) * 100;
    case "vmin":
      return (px / Math.min(ctx.vw, ctx.vh)) * 100;
    case "vmax":
      return (px / Math.max(ctx.vw, ctx.vh)) * 100;
    case "%":
      return (px / ctx.percentContext) * 100;
    case "ch":
      return px / (ctx.elementFont * ctx.chRatio);
    case "ex":
      return px / (ctx.elementFont * ctx.exRatio);
    case "in":
      return px / ctx.dpi;
    case "pt":
      return (px / ctx.dpi) * 72;
    case "pc":
      return (px / ctx.dpi) * 6;
    case "cm":
      return (px / ctx.dpi) * 2.54;
    case "mm":
      return (px / ctx.dpi) * 25.4;
    default:
      return px;
  }
};

export const convert = (value: number, from: Unit, to: Unit, ctx: ConversionContext): number => {
  if (from === to) return value;
  const px = convertToPx(value, from, ctx);
  return convertFromPx(px, to, ctx);
};
