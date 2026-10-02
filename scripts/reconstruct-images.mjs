import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const chunksDir = path.join(root, "image-bundle", "chunks");
const imagesDir = path.join(root, "public", "images");
const expected = {
  "home-hero-dr-ken-mountain.webp": 100000,
  "service-individual-therapy.webp": 35000,
  "service-consultation.webp": 35000,
  "service-support-group.webp": 40000,
  "service-telehealth.webp": 30000,
  "service-couples-therapy.webp": 35000,
  "service-child-family-therapy.webp": 40000,
  "service-trauma-anxiety-mood.webp": 35000,
  "service-general-counseling-alt.webp": 30000,
};

let base64 = "";
for (let i = 0; i < 58; i++) {
  const stem = String(i).padStart(3, "0");
  const txt = path.join(chunksDir, `${stem}.txt`);
  const hex = path.join(chunksDir, `${stem}.hex`);
  if (fs.existsSync(txt)) {
    base64 += fs.readFileSync(txt, "utf8").trim();
  } else if (fs.existsSync(hex)) {
    const encoded = fs.readFileSync(hex, "utf8").trim();
    base64 += Buffer.from(encoded, "hex").toString("utf8");
  } else {
    throw new Error(`Missing image bundle chunk ${stem}`);
  }
}

fs.mkdirSync(imagesDir, { recursive: true });
const archive = path.join(os.tmpdir(), "indiancreek-site-images.tar.gz");
fs.writeFileSync(archive, Buffer.from(base64, "base64"));
execFileSync("tar", ["-xzf", archive, "-C", imagesDir], { stdio: "inherit" });
fs.rmSync(archive, { force: true });

for (const [name, minBytes] of Object.entries(expected)) {
  const file = path.join(imagesDir, name);
  if (!fs.existsSync(file)) throw new Error(`Missing reconstructed image: ${name}`);
  const size = fs.statSync(file).size;
  if (size < minBytes) throw new Error(`Reconstructed image too small: ${name} (${size} bytes)`);
  console.log(`verified ${name}: ${size} bytes`);
}
