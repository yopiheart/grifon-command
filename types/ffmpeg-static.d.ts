// ffmpeg-static ships no type declarations. Its default export is the absolute
// path to the bundled ffmpeg binary (or null if the platform is unsupported).
// Phases 1–2 of the render pipeline (audioExtract, final render) use this too.
declare module 'ffmpeg-static' {
  const ffmpegPath: string | null;
  export default ffmpegPath;
}
