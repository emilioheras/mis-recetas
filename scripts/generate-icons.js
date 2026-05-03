/**
 * Genera todos los iconos a partir de scripts/source-icon.svg.
 *
 * El SVG original es un único <path> con varios subpaths (separados por
 * comandos "M" mayúsculos). Por las coordenadas, los subpaths que empiezan
 * en X≈500 (lado derecho del lienzo) corresponden al tenedor, y el resto
 * al gorro de chef. Aplicamos color terracota solo al tenedor y negro al
 * resto, manteniendo el fill-rule "evenodd" para que los huecos del gorro
 * sigan siendo huecos.
 *
 * Salida:
 *   src/app/icon.png             1024x1024 transparente (favicon, /icon)
 *   src/app/apple-icon.png       1024x1024 fondo cream (iOS)
 *   public/icon-192.png          192x192   fondo cream redondeado
 *   public/icon-512.png          512x512   fondo cream redondeado
 *   public/icon-maskable-512.png 512x512   fondo cream con padding extra
 *
 * Ejecutar: node scripts/generate-icons.js
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SOURCE = path.join(ROOT, "scripts", "source-icon.svg");

const CREAM = "#FAFAF7";
const TERRACOTA = "#AB3E1A";
const BLACK = "#000000";

// Lee el path del SVG fuente y lo separa en subpaths.
function loadSubpaths() {
  const svg = fs.readFileSync(SOURCE, "utf8");
  const dMatch = svg.match(/<path[^>]*\sd="([^"]+)"/);
  if (!dMatch) throw new Error("No se encontró <path> en el SVG fuente.");
  const d = dMatch[1].replace(/\s+/g, " ").trim();
  const subpaths = [];
  let last = 0;
  for (let i = 1; i < d.length; i++) {
    if (d[i] === "M") {
      subpaths.push(d.substring(last, i).trim());
      last = i;
    }
  }
  subpaths.push(d.substring(last).trim());
  return subpaths;
}

// El subpath 8 (M493.0,205.9) rellena el interior del tenedor.
// Los demás (0-7) forman el outline del icono completo + los huecos
// internos del gorro de chef. Se identificó visualmente con
// scripts/debug-subpaths.js.
const FORK_FILL_INDEX = 8;

function buildSvg({ size, padding, bgRadius, bgColor }) {
  const subpaths = loadSubpaths();
  const forkD = subpaths[FORK_FILL_INDEX] ?? "";
  const restD = subpaths
    .filter((_, i) => i !== FORK_FILL_INDEX)
    .join(" ");

  const innerSize = size - 2 * padding;
  const scale = innerSize / 512;

  const bg = bgColor
    ? `<rect width="${size}" height="${size}" rx="${bgRadius}" fill="${bgColor}"/>`
    : "";

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    ${bg}
    <g transform="translate(${padding}, ${padding}) scale(${scale})">
      <path d="${restD}" fill="${BLACK}" fill-rule="evenodd"/>
      <path d="${forkD}" fill="${TERRACOTA}" fill-rule="evenodd"/>
    </g>
  </svg>`;
}

async function generate({ size, padding, bgRadius, bgColor, outPath }) {
  const svg = buildSvg({ size, padding, bgRadius, bgColor });
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await sharp(Buffer.from(svg), { density: 300, limitInputPixels: false })
    .resize(size, size)
    .png()
    .toFile(outPath);
  console.log(`✓ ${path.relative(ROOT, outPath)} (${size}×${size})`);
}

(async () => {
  // Favicon: transparente para que se vea limpio en pestañas y splash iOS.
  await generate({
    size: 1024,
    padding: 100,
    bgRadius: 0,
    bgColor: null,
    outPath: path.join(ROOT, "src", "app", "icon.png"),
  });

  // iOS apple-icon: iOS no maneja bien la transparencia, fondo cream sólido.
  await generate({
    size: 1024,
    padding: 100,
    bgRadius: 0,
    bgColor: CREAM,
    outPath: path.join(ROOT, "src", "app", "apple-icon.png"),
  });

  // PWA Android - normal
  await generate({
    size: 192,
    padding: 20,
    bgRadius: 36,
    bgColor: CREAM,
    outPath: path.join(ROOT, "public", "icon-192.png"),
  });
  await generate({
    size: 512,
    padding: 50,
    bgRadius: 96,
    bgColor: CREAM,
    outPath: path.join(ROOT, "public", "icon-512.png"),
  });

  // PWA Android maskable: ~20% safe zone, sin radius
  await generate({
    size: 512,
    padding: 110,
    bgRadius: 0,
    bgColor: CREAM,
    outPath: path.join(ROOT, "public", "icon-maskable-512.png"),
  });
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
