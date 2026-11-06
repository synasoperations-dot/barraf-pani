/**
 * Sticker tilt that mirrors in RTL: `--dir` is 1 in LTR and −1 under [dir=rtl] (globals.css).
 * Use for inline `rotate` / `transform` on decorative stickers, never on body text or inputs.
 */
export const tilt = (deg: number) => `calc(${deg}deg * var(--dir, 1))`;
