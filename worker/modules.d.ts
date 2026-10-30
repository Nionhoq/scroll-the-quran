declare module "*.wasm" {
  const module: WebAssembly.Module;
  export default module;
}

declare module "*.ttf" {
  const data: ArrayBuffer;
  export default data;
}

declare module "harfbuzzjs/hb.js" {
  const createHarfBuzz: (options?: Record<string, unknown>) => Promise<unknown>;
  export default createHarfBuzz;
}

declare module "harfbuzzjs/hbjs.js" {
  const hbjs: (module: unknown) => unknown;
  export default hbjs;
}
