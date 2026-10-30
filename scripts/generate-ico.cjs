const { app, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

app.whenReady().then(() => {
  const srcPng = path.join(__dirname, '../docs/screenshots/icon.png');
  const destIco = path.join(__dirname, '../assets/icon.ico');
  const orig = nativeImage.createFromPath(srcPng);
  
  if (orig.isEmpty()) {
    console.error('Failed to load source image:', srcPng);
    app.exit(1);
    return;
  }

  // Windows standard icon sizes
  const sizes = [256, 128, 64, 48, 32, 24, 16];
  const images = sizes.map(s => {
    const resized = orig.resize({ width: s, height: s, quality: 'high' });
    return { size: s, buf: resized.toPNG() };
  });

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4); // count

  let offset = 6 + 16 * images.length;
  const dirEntries = [];
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 0); // width (0 = 256)
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 1); // height (0 = 256)
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(img.buf.length, 8); // image size
    entry.writeUInt32LE(offset, 12); // image offset
    dirEntries.push(entry);
    offset += img.buf.length;
  }

  const icoBuf = Buffer.concat([header, ...dirEntries, ...images.map(i => i.buf)]);
  fs.writeFileSync(destIco, icoBuf);
  console.log('Successfully generated multi-res assets/icon.ico! Size:', icoBuf.length, 'bytes');
  app.exit(0);
});

