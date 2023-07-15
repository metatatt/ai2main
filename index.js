const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const bodyParser = require('body-parser');
const PredictionConfig = require("./config.json");
require('dotenv').config();
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const PredictionApi = require('@azure/cognitiveservices-customvision-prediction');
const msRest = require('@azure/ms-rest-js');
const port = process.env.PORT || 3000;
const { addBoxToImage } = require('./public/lib/addbox'); // Import the addBoxToImage function from addboximage.js


let iterationName = "";
let cameraStatus = null;
let sessionTable = {};

const {
  APP_ID,
  APP_CERTIFICATE,
  CHANNEL,
  projectId,
  publishedIterationName,
  predictionEndpoint,
  predictionKey,
  blobConnectionString,
  blobContainerName
} = PredictionConfig;

// Import Azure Blob dependencies & create access to container
const { BlobServiceClient } = require("@azure/storage-blob");
const connectionString = blobConnectionString;
const containerName = blobContainerName;
const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);
const sessionTableFile = "ojoly-sessionTable.json";

async function downloadIteration() {
  try {
    let blobClient = containerClient.getBlobClient("ojolyCV-getPublishedName.json");
    let downloadedResponse = await blobClient.download();
    let downloadedContent = await streamToString(downloadedResponse.readableStreamBody);
    iterationName = JSON.parse(downloadedContent);
    return sessionTable;
  } catch (error) {
    console.error("An error occurred while downloading the iteration:", error);
    process.exit(1);
  }
}

async function downloadSessionTable() {
  try {
    let blobClient = containerClient.getBlobClient(sessionTableFile);
    let downloadedResponse = await blobClient.download();
    let downloadedContent = await streamToString(downloadedResponse.readableStreamBody);
    sessionTable = JSON.parse(downloadedContent);
    return sessionTable;
  } catch (error) {
    console.error("An error occurred while downloading the session table:", error);
    process.exit(1);
  }
}

// Middleware
app.use(bodyParser.json());

app.use('/socket.io', express.static(__dirname + '/node_modules/socket.io/client-dist'));

app.post('/env', async (req, res) => {
  const userId = req.body.userId;
  const sessionTable = await downloadSessionTable();
  let gridId = "";
  for (const key in sessionTable) {
    if (sessionTable[key].userId.slice(0, 5) === userId.slice(0, 5)) {
      gridId = key;
    }
  }

  // Build token using token generator
  const channelName = CHANNEL;
  const uid = 0;
  const role = RtcRole.PUBLISHER;
  const expireTime = 3600;

  const currentTime = Math.floor(Date.now() / 1000);
  const privilegeExpireTime = currentTime + expireTime;

  const token = RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERTIFICATE, channelName, uid, role, privilegeExpireTime);

  res.json({
    APP_ID,
    TOKEN: token,
    CHANNEL,
    predictionEndpoint,
    predictionKey,
    GRIDID: gridId
  });
});

app.get('/azenv', (req, res) => {
  res.json({
    predictionEndpoint,
    predictionKey
  });
});

app.post('/predict', async (req, res) => {
  try {
    const imageData = req.body;
    const credentials = new msRest.ApiKeyCredentials({ inHeader: { 'Prediction-Key': predictionKey } });
    const predictor = new PredictionApi.PredictionAPIClient(credentials, predictionEndpoint);

    const results = await predictor.classifyImage(projectId, publishedIterationName, imageData);
    const mostLikelyPrediction = results.predictions
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 1)[0];

    const predictionResult = {
      tag: mostLikelyPrediction.tagName,
      probability: mostLikelyPrediction.probability,
      boundingBox: mostLikelyPrediction.boundingBox  // Include the bounding box metrics
    };

    // Save the imageData as a file
    const imageDataPath = './public/img/imagedata.jpg';
    fs.writeFileSync(imageDataPath, imageData);

    res.json(predictionResult);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while processing the image.' });
  }
});

// get IternationName (Azure CV Prediction)
app.get('/iter', async (req, res) => {
  try {
    const key = req.query.key; // Assuming the key is passed as a query parameter
    res.send(iterationName[key]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while retrieving the published name.' });
  }
});

// Helper function to convert a ReadableStream to a string
async function streamToString(readableStream) {
  const chunks = [];
  for await (const chunk of readableStream) {
    chunks.push(chunk.toString());
  }
  return chunks.join("");
}

// Serve static files from the 'public' directory
app.use(express.static(__dirname + '/public'));

//6-14: The following code block has been temporarily commented out to facilitate testing on an iPad using Ngrok. 
//However, it should be restored to its original state, using 'login-camera.html' as the entry point, when the full implementation is ready

// app.get('/', function(req, res) {
//   res.sendFile('login-camera.html', { root: __dirname + '/public' });
// });

//06-14: To revert back to 'login-camera.html' as the entry point, uncomment the commented lines
app.get('/', function (req, res) {
  res.sendFile('camera.html', { root: __dirname + '/public' });
});

// Serve the agora-index.html file
app.get('/lead', function (req, res) {
  res.sendFile('console.html', { root: __dirname + '/public' });
});
app.get('/pinch', function (req, res) {
  res.sendFile('pinch.html', { root: __dirname + '/public' });
});

app.get('/n', function (req, res) {
  addBoxToImage();
  res.sendFile('cameraN.html', { root: __dirname + '/public' });
});

app.get('/chat', function (req, res) {
  res.sendFile('chat.html', { root: __dirname + '/public' });
});

io.on('connection', (socket) => {
  // Receive userInfo from camera.html
  socket.on('sessionMessage', (sessionMessage) => {
    // Emit userInfo to console.html
    console.log("sessionMessage: ", sessionMessage);
    io.emit('sessionMessage', sessionMessage);
  });
});

app.post('/capture', (req, res) => {
  // Retrieve the base64-encoded image data from the request body
  const imageData = req.body.image;

  // Decode the base64 image data into a Buffer
  const imageBuffer = Buffer.from(imageData, 'base64');

  // Generate a unique filename for the image (e.g., using a timestamp)
  const timestamp = Date.now();
  const filename = `image_${timestamp}.png`;

  // Specify the directory where you want to save the image
  const saveDirectory = './images';

  // Create the directory if it doesn't exist
  if (!fs.existsSync(saveDirectory)) {
    fs.mkdirSync(saveDirectory);
  }

  // Save the image to the specified directory
  fs.writeFile(`${saveDirectory}/${filename}`, imageBuffer, (err) => {
    if (err) {
      console.error('Error saving image:', err);
      res.status(500).json({ message: 'Error saving image.' });
    } else {
      // Image saved successfully
      res.status(200).json({ message: 'Image saved successfully.' });
    }
  });
});

http.listen(port, function () {
  console.log(`Server listening on port ${port}`);
});

async function addBoxToImage2() {
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