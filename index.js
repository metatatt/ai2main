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
let isFirstGPTSession = true;

const {
  c001CK,
  c001ML,
  c002CK,
  c002ML,
  APP_ID,
  APP_CERTIFICATE,
  CHANNEL,
  projectId,
  publishedIterationName,
  predictionEndpoint,
  predictionKey,
  blobConnectionString,
  blobContainerName,
  openaiKey,
} = PredictionConfig;

// Import Azure Blob dependencies & create access to container
const { BlobServiceClient } = require("@azure/storage-blob");
const connectionString = blobConnectionString;
const containerName = blobContainerName;
const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);
const sessionTableFile = "sessionTable.json";

//OpenAI 
const OpenAI = require('openai');
const openai = new OpenAI({
  apiKey: openaiKey,
});


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

async function uploadSessionTable() {
  try {
    const blobContent = JSON.stringify(sessionTable);
    const blobClient = containerClient.getBlobClient(sessionTableFile);
    const blockBlobClient = blobClient.getBlockBlobClient();
    await blockBlobClient.upload(blobContent, blobContent.length);
    console.log('Session table uploaded successfully.');
  } catch (error) {
    console.error('An error occurred while uploading the session table:', error);
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
    GRIDID: gridId,
    openaiKey,
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
  const lastSaved = (cardId)? PredictionConfig[`c${cardId}`] : PredictionConfig['c001CK']
  res.json({
    lastSaved
  });
});

app.post('/updatecard', async (req, res) => {
  const cardId = req.body.cardId;
  const userId = req.body.userId;
  const sessionTable = await downloadSessionTable();
  for (const key in sessionTable) {
    if (sessionTable[key].userId.slice(0, 5) === userId.slice(0, 5)) {
      sessionTable[key].cardId = cardId;
    }
  }
  const newlySaved =  PredictionConfig[`c${cardId}`]

  await uploadSessionTable()

  res.json({
    newlySaved
  });
});

app.post('/openai', async (req, res) => {
    const codeExamples = fs.readFileSync('codeExamples.txt', 'utf-8');
    let messageContent = [];

    if(isFirstGPTSession){
      messageContent = [
        {
          role: 'assistant',
          content: 'I am a code generator. Provide examples and guidlines, and I will follow them to generate JavaScript code. I am a coder, but not an instructor. I will repond with code, but not the explanation.'
        },
        { role: 'user', content: codeExamples },
        { role: 'user', content: req.body.message },
      ];
      isFirstGPTSession = false
    } else{
      messageContent = [
        { role: 'user', content: req.body.message },
      ];
    }

  try {
    // Call the OpenAI API for chat completions
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messageContent,
      temperature: 0.9,
      max_tokens: 256,
    });
    
    console.log('Generated Code:-', response.choices[0].message.content);
    
    // Send the response back to the client
    res.json({ message: response.choices[0].message.content });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'An error occurred' });
  }
});

app.post('/saveblob', upload.single('imageFile'), async (req, res) => {
  try {

    // Access the uploaded file via req.file
    if (!req.file) {
      console.log('No image file received.');
      return res.status(400).json({ error: 'No image file received.' });
    }

    // Get the original file name
    const originalFileName = req.file.originalname;

    // Create a unique file name for the image in Azure Blob Storage
    const fileName = `${originalFileName}`;

    // Create a BlobClient to upload the image to Azure Blob Storage
    const blobClient = containerClient.getBlockBlobClient(fileName);

    // Upload the file to Azure Blob Storage
    const fileData = fs.readFileSync(req.file.path);
    const saveRes = await blobClient.uploadData(fileData);
    console.log("saveBlob Response ", saveRes)
    res.json({
      saveRes
    });

  } catch (error) {
    console.error('Error during image upload:', error.message);
    res.status(500).json({ error: 'Error during image upload.' });
  }
});

app.post('/capture2', (req, res) => {

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

app.get('/s', function (req, res) {
  res.sendFile('speech.html', { root: __dirname + '/public' });
});
app.get('/listen', function (req, res) {
  res.sendFile('listen.html', { root: __dirname + '/public' });
});
io.on('connection', (socket) => {
  // Receive userInfo from camera.html
  socket.on('sessionMessage', (sessionMessage) => {
    // Emit userInfo to console.html
    io.emit('sessionMessage', sessionMessage);
  });
});


http.listen(port, function () {
  console.log(`Server listening on port ${port}`);
});
