import fs from "fs";
import path from "path";
import sharp from "sharp";

const src = path.join("public", "mimo-widgets.png");
const outDir = path.join("public", "widgets");
fs.mkdirSync(outDir, { recursive: true });

const meta = await sharp(src).metadata();
const cols = 5;
const rows = 5;
const cellW = Math.floor(meta.width / cols);
const cellH = Math.floor(meta.height / rows);

console.log({ width: meta.width, height: meta.height, cellW, cellH });

for (let i = 0; i < 25; i++) {
  const col = i % cols;
  const row = Math.floor(i / cols);
  const n = String(i + 1).padStart(2, "0");
  await sharp(src)
    .extract({ left: col * cellW, top: row * cellH, width: cellW, height: cellH })
    .png()
    .toFile(path.join(outDir, `bg-${n}.png`));
}

console.log("sliced 25");
