/** Metro resolves these to asset ids at build time; TS needs to be told they exist. */
declare module '*.png' {
  const asset: number;
  export default asset;
}

declare module '*.ttf' {
  const asset: number;
  export default asset;
}
