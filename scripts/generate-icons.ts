// Generates app icons from the church logo: gold dove + open Bible on plum.
// Usage: bun icons
import sharp from "sharp";

const SOURCE = "public/brand/icon-gold.png";
const PLUM = { r: 0x5b, g: 0x2c, b: 0x5e, alpha: 1 };

async function icon(size: number, logoScale: number, out: string) {
  const logoWidth = Math.round(size * logoScale);
  const logo = await sharp(SOURCE).resize({ width: logoWidth }).png().toBuffer();
  const { height = logoWidth } = await sharp(logo).metadata();
  await sharp({ create: { width: size, height: size, channels: 4, background: PLUM } })
    .composite([
      {
        input: logo,
        left: Math.round((size - logoWidth) / 2),
        top: Math.round((size - height) / 2),
      },
    ])
    .png()
    .toFile(out);
  console.log(`✓ ${out}`);
}

await icon(192, 0.66, "public/icons/icon-192.png");
await icon(512, 0.66, "public/icons/icon-512.png");
// Maskable: keep the logo inside the 80% safe zone (Android crops to a circle/squircle).
await icon(512, 0.5, "public/icons/icon-maskable-512.png");
// Next.js file conventions: favicon/icon and Apple touch icon.
await icon(180, 0.62, "src/app/apple-icon.png");
await icon(64, 0.72, "src/app/icon.png");
