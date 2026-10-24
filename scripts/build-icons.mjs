// Technical size/format exports from the generated master, with no redraw.
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const master = path.join(root, "public/brand/agrosentinel-mark.png");
const paper = "#F4F3EE";
const targets = [
  ["public/brand/agrosentinel-icon.png", 1024],
  ["public/icons/icon-192.png", 192],
  ["public/icons/icon-512.png", 512],
  ["public/icons/icon-maskable-512.png", 512],
  ["app/icon.png", 512],
  ["app/apple-icon.png", 180],
  ["apps/mobile/assets/icon.png", 1024],
  ["apps/mobile/assets/favicon.png", 48],
];
for (const [name, size] of targets) {
  const destination = path.join(root, name);
  await mkdir(path.dirname(destination), { recursive: true });
  await sharp(master).resize(size, size).flatten({ background: paper }).png().toFile(destination);
}
// Adaptive/themed icons use the transparent shape; Android supplies the background.
for (const name of ["android-icon-foreground.png", "android-icon-monochrome.png"]) {
  await sharp(master).resize(1024, 1024).png().toFile(path.join(root, "apps/mobile/assets", name));
}
await sharp({ create: { width: 1024, height: 1024, channels: 3, background: paper } })
  .png().toFile(path.join(root, "apps/mobile/assets/android-icon-background.png"));

// An ICO directory with PNG entries at each browser/Windows size.
const sizes = [16, 32, 48, 64, 256];
const images = await Promise.all(sizes.map(size => sharp(master).resize(size, size).flatten({ background: paper }).ensureAlpha().png().toBuffer()));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
images.forEach((bytes, i) => {
  const entry = 6 + i * 16;
  header[entry] = sizes[i] === 256 ? 0 : sizes[i];
  header[entry + 1] = header[entry];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(bytes.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += bytes.length;
});
await writeFile(path.join(root, "app/favicon.ico"), Buffer.concat([header, ...images]));
console.log("Exported web favicons, PWA icons and Android/iOS source icons.");
