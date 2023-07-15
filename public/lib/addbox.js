// addboximage.js
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

async function addBoxToImage() {
  const imageFilePath = './public/img/one.png'; // The path to your original image
  const outputFilePath = './public/img/oneb.png'; // The path where the modified image will be saved (same filename)

  try {
    // Load the image using canvas
    const image = await loadImage(imageFilePath);

    // Get the image dimensions
    const width = image.width;
    const height = image.height;

    // Create a new canvas with the same dimensions as the image
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Draw the original image on the canvas
    ctx.drawImage(image, 0, 0, width, height);

    // Calculate the center coordinates for the box
    const boxWidth = 100;
    const boxHeight = 100;
    const centerX = width / 2 - boxWidth / 2;
    const centerY = height / 2 - boxHeight / 2;

    // Draw the box at the center of the image
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'; // Red with 50% opacity
    ctx.fillRect(centerX, centerY, boxWidth, boxHeight);

    // Save the modified image to the output file
    const out = fs.createWriteStream(outputFilePath);
    const stream = canvas.createJPEGStream();
    stream.pipe(out);

    out.on('finish', () => {
      console.log('Image with box added and saved successfully.');
    });
  } catch (error) {
    console.error('Error occurred:', error);
  }
}

// Export the addBoxToImage function so it can be used in other files
module.exports = {
  addBoxToImage,
};
