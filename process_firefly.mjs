import sharp from 'sharp';
import fs from 'fs';

async function processImage() {
  try {
    const inputPath = 'C:\\Users\\Acer\\.gemini\\antigravity\\brain\\fde75c4e-865c-4517-97bf-7acd1c823b84\\firefly_insect_1785166963496.jpg';
    
    if (!fs.existsSync('D:\\Projects\\album-web\\public\\textures')) {
      fs.mkdirSync('D:\\Projects\\album-web\\public\\textures', { recursive: true });
    }

    const { data, info } = await sharp(inputPath)
      .resize(256, 256) // Resize down to game-friendly resolution
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
      } else if (r > 200 && g > 200 && b > 200) {
        // Soften edges
        data[i + 3] = Math.max(0, 255 - (r - 200) * 4);
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
      .toFile('D:\\Projects\\album-web\\public\\textures\\firefly_insect.png');

    console.log("Image processed and copied successfully.");
  } catch (error) {
    console.error("Error processing image:", error);
  }
}

processImage();
