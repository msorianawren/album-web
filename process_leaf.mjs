import sharp from 'sharp';
import fs from 'fs';

async function processImage() {
  try {
    const inputPath = 'C:\\Users\\Acer\\.gemini\\antigravity\\brain\\fde75c4e-865c-4517-97bf-7acd1c823b84\\oak_leaf_1785164957084.jpg';
    
    // Ensure public/textures exists
    if (!fs.existsSync('D:\\Projects\\album-web\\public\\textures')) {
      fs.mkdirSync('D:\\Projects\\album-web\\public\\textures', { recursive: true });
    }

    const { data, info } = await sharp(inputPath)
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // If it's very close to white, make it transparent
      if (r > 240 && g > 240 && b > 240) {
        data[i + 3] = 0;
      }
    }

    await sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4
      }
    })
      .png()
      .toFile('D:\\Projects\\album-web\\public\\textures\\oak_leaf.png');

    // Also copy the firefly texture
    fs.copyFileSync(
      'C:\\Users\\Acer\\.gemini\\antigravity\\brain\\fde75c4e-865c-4517-97bf-7acd1c823b84\\firefly_particle_1785164943270.jpg',
      'D:\\Projects\\album-web\\public\\textures\\firefly_particle.jpg'
    );

    console.log("Images processed and copied successfully.");
  } catch (error) {
    console.error("Error processing images:", error);
  }
}

processImage();
