// File System and Module Imports
const fs = require('fs'); // File System operations
const path = require('path'); // Working with file and directory paths
const axios = require('axios'); // HTTP client for making requests

// Express and HTTP Server Setup
const express = require('express'); // Web framework for Node.js
const app = express(); // Express app instance
const http = require('http').Server(app); // HTTP server for Express
const port = process.env.PORT || 3000; // Server port

// Socket.io for Real-Time Communication
const io = require('socket.io')(http); // Real-time communication

// Body Parser for Parsing Request Bodies
const bodyParser = require('body-parser'); // Parsing request bodies

// Configuration and Environment Setup
const PredictionConfig = require("./config.json"); // Custom prediction configuration
require('dotenv').config(); // Loading environment variables from .env file

// Agora Access Token Generation
const { RtcTokenBuilder, RtcRole } = require('agora-access-token'); // Generating Agora access tokens

// Azure Custom Vision Prediction API
const PredictionApi = require('@azure/cognitiveservices-customvision-prediction'); // Azure Custom Vision API
const msRest = require('@azure/ms-rest-js'); // Azure REST client

// Multer for File Upload Handling and Path direcotry
const multer = require('multer'); // Handling file uploads
const imgDir = path.join(__dirname, 'public', 'imagedata'); // Image directory path
const upload = multer({ dest: imgDir }); // Multer setup with image directory
if (!fs.existsSync(imgDir)) {
  fs.mkdirSync(imgDir);
}


let iterationName = "";
let cameraStatus = null;
let sessionTable = {};

const {
  c001,
  c002,
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
const sessionTableFile = "sessionTable.json";

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
  // addBoxToImage("-post-env");
  res.json({
    APP_ID,
    TOKEN: token,
    CHANNEL,
    predictionEndpoint,
    predictionKey,
    GRIDID: gridId
  });
});

app.post('/card', async (req, res) => {
  const userId = req.body.userId;
  const sessionTable = await downloadSessionTable();
  let cardId = "";
  for (const key in sessionTable) {
    if (sessionTable[key].userId.slice(0, 5) === userId.slice(0, 5)) {
      cardId = sessionTable[key].cardId;
    }
  }
  const lastSaved =  PredictionConfig[`c${cardId}`]
  res.json({
    lastSaved
  });
});

app.post('/capture', async (req, res) => {
  try {
    const fileName = req.body.fileName;
    const imageBlob = req.body.imageBlob;

    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    const uploadResponse = await blockBlobClient.uploadData(imageBlob, {
      blobHTTPHeaders: { blobContentType: 'image/png' },
    });

    console.log('Uploaded image successfully:', uploadResponse.requestId);
    res.status(200).send('Image uploaded successfully');
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).send('Error uploading image');
  }
});


function generateImageFileName() {
  const timestamp = Date.now();
  return `image_${timestamp}`;
}


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

app.get('/h', function (req, res) {
  res.sendFile('hand.html', { root: __dirname + '/public' });
});

io.on('connection', (socket) => {
  // Receive userInfo from camera.html
  socket.on('sessionMessage', (sessionMessage) => {
    // Emit userInfo to console.html
    // console.log("sessionMessage: ", sessionMessage);
    io.emit('sessionMessage', sessionMessage);
  });
});


http.listen(port, function () {
  console.log(`Server listening on port ${port}`);
});
