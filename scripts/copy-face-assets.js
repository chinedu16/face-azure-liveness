/* Copies Azure Face Liveness UI assets into Next.js public folder.
 * Ensures files like AzureAIVisionFace_SIMD.js and corresponding WASM are served at
 * /facelivenessdetector-assets/... on Vercel and locally.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const candidates = [
  path.join(projectRoot, 'node_modules', '@azure-ai-vision-face', 'ui-assets', 'facelivenessdetector-assets'),
  path.join(projectRoot, 'node_modules', '@azure-ai-vision-face', 'ui-assets', 'dist', 'facelivenessdetector-assets'),
  // Fallback to package root if it already contains the assets directly
  path.join(projectRoot, 'node_modules', '@azure-ai-vision-face', 'ui-assets'),
];

const target = path.join(projectRoot, 'public', 'facelivenessdetector-assets');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function findSource() {
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      const nested = path.join(c, 'facelivenessdetector-assets');
      if (fs.existsSync(nested)) return nested;
      return c;
    }
  }
  return null;
}

function main() {
  try {
    const src = findSource();
    if (!src) {
      console.warn('[copy-face-assets] Could not locate @azure-ai-vision-face/ui-assets. Skipping.');
      process.exit(0);
    }
    copyDir(src, target);
    console.log(`[copy-face-assets] Copied assets from ${src} to ${target}`);
  } catch (err) {
    console.error('[copy-face-assets] Failed to copy assets:', err);
    process.exit(1);
  }
}

main();