// Run after electron-builder to check the external artwork shipped with the app.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const packaged = [
  path.resolve('release/mac-arm64/Cadence.app/Contents/Resources'),
  path.resolve('release/win-unpacked/resources'),
].filter((dir) => fs.existsSync(dir));
if (packaged.length === 0) {
  throw new Error('No packaged app under release/. Run npm run pack:mac or npm run pack:win first.');
}
for (const resources of packaged) {
  for (const state of ['healthy', 'failure']) {
    const file = path.join(resources, 'assets', 'tray', `timeflow-${state}.png`);
    const png = fs.readFileSync(file);
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `Invalid tray PNG: ${file}`);
    assert.equal(png.readUInt32BE(16), 256, 'Unexpected icon width');
    assert.equal(png.readUInt32BE(20), 256, 'Unexpected icon height');
  }
}
console.log('Packaged Timeflow artwork verified.');
