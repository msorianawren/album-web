void (async () => {
const fs = await import("node:fs");
const path = await import("node:path");

const urls = {
  "piano": "https://archive.org/download/minecraft-volume-alpha/01%20-%20C418%20-%20Key.mp3",
  "pad": "https://archive.org/download/minecraft-volume-alpha/03%20-%20C418%20-%20Subwoofer%20Lullaby.mp3",
  "cave": "https://archive.org/download/minecraft-volume-alpha/05%20-%20C418%20-%20Living%20Mice.mp3",
  "harp": "https://archive.org/download/minecraft-volume-alpha/07%20-%20C418%20-%20Haggstrom.mp3",
  "rain": "https://archive.org/download/minecraft-volume-alpha/08%20-%20C418%20-%20Minecraft.mp3",
  "drone": "https://archive.org/download/minecraft-volume-alpha/09%20-%20C418%20-%20Oxyg%C3%A8ne.mp3"
};

const targetDir = path.join(__dirname, 'public', 'audio');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

async function download() {
  for (const [name, url] of Object.entries(urls)) {
    console.log(`Downloading ${name}...`);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(path.join(targetDir, `${name}.mp3`), Buffer.from(buffer));
      console.log(`Saved ${name}.mp3 (${buffer.byteLength} bytes)`);
    } catch(e) {
      console.error(`Failed ${name}:`, e.message);
    }
  }
}

await download();
})();
