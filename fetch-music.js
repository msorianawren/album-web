const urls = [
  'https://archive.org/metadata/minecraft-volume-alpha',
  'https://archive.org/metadata/MinecraftVolumeAlpha',
  'https://archive.org/metadata/c418-minecraft-volume-alpha'
];

async function run() {
  for (const url of urls) {
    try {
      console.log('Fetching', url);
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.files) {
        console.log('Found files in', url);
        const mp3s = data.files.filter(f => f.name.endsWith('.mp3')).map(f => f.name);
        console.log(mp3s.slice(0, 10));
        if (mp3s.length > 0) return;
      }
    } catch(e) {
      console.log(e.message);
    }
  }
}
run();
