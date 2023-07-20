// File System and Module Imports
const fs = require('fs'); // File System operations
const path = require('path'); // Working with file and directory paths
const { createCanvas, loadImage } = require('canvas'); // Image manipulation
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

// const { addBoxToImage } = require('./public/lib/addbox'); // Import the addBoxToImage function from addboximage.js


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
async function predict(endpoint, key, imageBuffer) {
  try {
    // Set up the headers for the prediction request
    const headers = {
      'Content-Type': 'application/octet-stream',
      'Prediction-Key': key,
    };
    // Make the POST request to the prediction endpoint using axios
    const response = await axios.post(endpoint, imageBuffer, {
      headers: headers,
    });

    console.log('Predict - Response:', response);

    const result = response.data;
    console.log('-----');
    console.log('-----');
    console.log('Predict - Response.data:', result);

    // Retrieve the most likely prediction
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

      console.log('Predict - Best Prediction:', bestPredict);

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
    const endpoint = req.headers['endpoint'];

    // Create a unique file name for the image in Azure Blob Storage
    const fileName = `${originalFileName}`;

    // Create a BlobClient to upload the image to Azure Blob Storage
    const blobClient = containerClient.getBlockBlobClient(fileName);

    // Upload the file to Azure Blob Storage
    const fileData = fs.readFileSync(req.file.path);
    const uploadBlobResponse = await blobClient.uploadData(fileData);

   // Set Blob Metadata
    await blobClient.setMetadata({
      key: key,
      endpoint: `"${endpoint}"`
    });

    // Delete the local file after uploading to Azure Blob Storage
    fs.unlinkSync(req.file.path);

    console.log('File uploaded to Azure Blob Storage:', uploadBlobResponse.requestId);

    // Return the saved image URI path as a JSON response
    res.json({ savedURI: blobClient.url });
  } catch (error) {
    console.error('Error during image upload:', error.message);
    res.status(500).json({ error: 'Error during image upload.' });
  }
});



// 7/18一直到这里

app.post('/checkImage', upload.single('imageFile'), async (req, res) => {
  try {
    console.log('Received POST request to /checkImage');

    // Access the uploaded file via req.file
    if (!req.file) {
      console.log('No image file received.');
      return res.status(400).json({ error: 'No image file received.' });
    }

    // Read the tag data from the request body
    const { tag } = req.body;
    const { key, endpoint } = JSON.parse(tag);

    // Perform Azure Computer Vision prediction
    const headers = {
      'Content-Type': 'application/octet-stream',
      'Prediction-Key': key,
    };

    // Make the POST request to the prediction endpoint using axios
    const response = await axios.post(endpoint, req.file.buffer, {
      headers: headers,
    });

    const bestPredict = response.data;
    console.log('Azure prediction result:', bestPredict);

    // Upload the file to Azure Blob Storage
    const imageFileName = generateImageFileName() + '.png';
    const blobClient = containerClient.getBlockBlobClient(imageFileName);
    const uploadBlobResponse = await blobClient.uploadData(req.file.buffer);
    console.log('File uploaded to Azure Blob Storage:', uploadBlobResponse.requestId);

    // Create a metadata object containing the image URI and tag data
    const metadata = {
      imageUrl: blobClient.url,
      key: key,
      endpoint: endpoint,
      date: now(),
      bestPredict: bestPredict,
    };

    // Upload the metadata as a JSON file to Azure Blob Storage
    const metadataFileName = generateImageFileName() + '.json';
    const metadataBlobClient = containerClient.getBlockBlobClient(metadataFileName);
    const uploadMetadataResponse = await metadataBlobClient.uploadData(JSON.stringify(metadata));
    console.log('Metadata uploaded to Azure Blob Storage:', uploadMetadataResponse.requestId);

    console.log('Image and metadata saved successfully.');

    // Return the saved image URI path as a JSON response
    res.json({ savedURI: blobClient.url });
  } catch (error) {
    console.error('Error during image processing:', error.message);
    res.status(500).json({ error: 'Error during image processing.' });
  }
});

// Endpoint to handle image uploads and saving tag data
app.post('/uploadImage', upload.single('imageFile'), async (req, res) => {
  try {
    console.log('Received POST request to /uploadImage');

    // Access the uploaded file via req.file
    if (!req.file) {
      console.log('No image file received.');
      return res.status(400).json({ error: 'No image file received.' });
    }

    // Process the image file here (e.g., save to a specific directory, etc.)
    const imageUrl = req.file.path; // The path to the uploaded image file
    const imageBuffer = req.file.buffer;


    // Read the tag data from the request body
    const { tag } = req.body;
    const { key, endpoint } = JSON.parse(tag);

    const bestPredict = await predict(endpoint, key, imageBuffer)

    console.log('uploadImg- key:', key);
    console.log('uploadImg- endpoint:', endpoint);
    console.log('uploadImg- bestPredict: ', bestPredict)

    // Save the uploaded image to the 'public/img' directory with a unique identifier in the file name
    const imageFileName = generateImageFileName();
    const targetImagePath = path.join(imgDir, imageFileName + '.png');

    fs.renameSync(imageUrl, targetImagePath);

    // Create a metadata object containing the image URI and tag data
    const metadata = {
      imageUrl: `/img/${imageFileName}.png`,
      key: `${key}`,
      endpoint: `${endpoint}`,
      date: `${now()}`,
      bestPredict:  `${bestPredict}`
    };

    // Save the metadata as a JSON file with the same name as the image file, but with a .json extension
    const metadataFileName = imageFileName + '.json';
    const metadataPath = path.join(imgDir, metadataFileName);

    fs.writeFileSync(metadataPath, JSON.stringify(metadata));

    console.log('Image and metadata saved successfully.');

    // Return the saved image URI path as a JSON response
    res.json({ savedURI: `/img/${imageFileName}.png` });
  } catch (error) {
    console.error('Error during image processing:', error.message);
    res.status(500).json({ error: 'Error during image processing.' });
  }
});


function generateImageFileName() {
  const timestamp = Date.now();
  return `image_${timestamp}`;
}


async function saveAnnotatedImage(prediction, imageData) {
  
  console.log("saveAnnotated ")
  const img = await loadImage(imageData);
  const boundingBox = prediction.boundingBox;
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0); // Draw the original image on the canvas
  ctx.strokeStyle = '#ff0000'; // Set the bounding box color (red in this example)
  ctx.lineWidth = 2; // Set the bounding box line width
  ctx.strokeRect(
    boundingBox.left * img.width,
    boundingBox.top * img.height,
    boundingBox.width * img.width,
    boundingBox.height * img.height
  ); // Draw the bounding box on the canvas
  const imgPath = `xxx-${prediction.id}-yyy.png`; // Replace with the desired image path
  const imageBuffer = canvas.toBuffer('image/png');

  // Save the imageBuffer to the file system at the specified path
  fs.writeFileSync(imgPath, imageBuffer, 'binary');

  return imgPath;
};

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

app.get('/u', function (req, res) {
  res.sendFile('upload.html', { root: __dirname + '/public' });
});

io.on('connection', (socket) => {
  // Receive userInfo from camera.html
  socket.on('sessionMessage', (sessionMessage) => {
    // Emit userInfo to console.html
    // console.log("sessionMessage: ", sessionMessage);
    io.emit('sessionMessage', sessionMessage);
  });
});

app.post('/capture', (req, res) => {

  const predictionEndpoint = req.body.prediction.endpoint;
  const predictionKey = req.body.prediction.key;
  console.log('capture reqBody ', req.body)

  // Retrieve the base64-encoded image data from the request body
  const imageData = req.body.imageData;

  // Decode the base64 image data into a Buffer
  //const imageBuffer = Buffer.from(imageData, 'base64');
  const imageBuffer = imageData
  // Generate a unique filename for the image (e.g., using a timestamp)

  const imagePath = './public/img/picture.png';

  const imageBuffer2 = fs.readFileSync(imagePath);
  const timestamp = Date.now();
  const filename = `image_${timestamp}.png`;

  // Specify the directory where you want to save the image
  const saveDirectory = './public/img';

  // Create the directory if it doesn't exist
  if (!fs.existsSync(saveDirectory)) {
    fs.mkdirSync(saveDirectory);
  }

  // Save the image to the specified directory
  fs.writeFile(`${saveDirectory}/${filename}`, imageBuffer2, (err) => {
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
