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

app.get('/azenv', (req, res) => {
//  addBoxToImage("-get-azenv");
  res.json({
    predictionEndpoint,
    predictionKey
  });
});

//从这里开始
async function predict(endpoint, key, imageUrl) {
  console.log('pred() imageUrl', imageUrl)
  try {
    // Set up the headers for the prediction request
    const headers = {
      'Content-Type': 'application/json',
      'Prediction-Key': key,
    };

    // Prepare the request body with the image URL
    const body = {
      'Url': imageUrl
    };

    // Make the POST request to the prediction endpoint using axios
    const response = await axios.post( endpoint, body,
      {
      headers: headers
      });

    // Retrieve the most likely prediction
    const result = response.data
    const lead = result.predictions
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 1)[0];

    if (lead) {
      // Prepare the showTag object with the prediction details and image source
      const bestPredict = {
        tag: lead.tagName,
        probability: Math.floor(lead.probability * 100),
        boundingBox: lead.boundingBox,
      };

      console.log('Predict() bestPred:', bestPredict);
      return bestPredict;
    } else {
      console.log('Predict - No prediction found.');
      throw new Error('No prediction found.');
    }
  } catch (error) {
    console.error('Error in image prediction', error);
    throw new Error('Image prediction failed.');
  }
}


//
app.post('/saveblob', upload.single('imageFile'), async (req, res) => {
  try {
    console.log('Received POST request to /saveblob');

    // Access the uploaded file via req.file
    if (!req.file) {
      console.log('No image file received.');
      return res.status(400).json({ error: 'No image file received.' });
    }

    // Get the original file name
    const originalFileName = req.file.originalname;
    const key = req.headers['key'];
    const endpoint = req.headers['endpoint'];//error here

    // Create a unique file name for the image in Azure Blob Storage
    const fileName = `${originalFileName}`;

    // Create a BlobClient to upload the image to Azure Blob Storage
    const blobClient = containerClient.getBlockBlobClient(fileName);

    // Upload the file to Azure Blob Storage
    const fileData = fs.readFileSync(req.file.path);
    const uploadBlobResponse = await blobClient.uploadData(fileData);
    console.log("saveBlob Response ", uploadBlobResponse)
    const imageUrl = blobClient.url; // Corrected property name

   // get CV predict
    const bestPredict = await predict(endpoint, key, imageUrl)
    console.log('bestPredict ',bestPredict)

   // Set Metadata
   const metadata = {
    imageUrl: blobClient.url,
    key: key,
    endpoint: endpoint,
    date: new Date(),
    bestPredict: bestPredict,
  };

  // Upload the metadata as a JSON file to local/Server Backend
const metaFileName = fileName + '.json';

// Save the metadata as a JSON file to the local "metadata" folder
const localMetadataFolderPath = './public/metadata';
if (!fs.existsSync(localMetadataFolderPath)) {
  fs.mkdirSync(localMetadataFolderPath);
}

   const localMetadataFilePath = `${localMetadataFolderPath}/${metaFileName}`;
  fs.writeFileSync(localMetadataFilePath, JSON.stringify(metadata, null, 2));

    // Delete the local file after uploading to Azure Blob Storage
    fs.unlinkSync(req.file.path);

    console.log('File uploaded to Azure Blob Storage:', uploadBlobResponse.requestId);
    console.log('return', bestPredict);
    res.json(bestPredict)

  } catch (error) {
    console.error('Error during image upload:', error.message);
    res.status(500).json({ error: 'Error during image upload.' });
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
