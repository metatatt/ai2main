import { joinAgoraRoom, batonCam} from './lib/libA.js';
import { populateFindings, populatePage, playSlide, batonUI} from './lib/libC.js';
import {
  HandLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";


var ojoapp = new Vue({
  el: '#batonApp',
  data: {
    agoraUid: "",
    canvasElement: null,
    canvasHeight: 768,
    canvasWidth: 1024,
    client: null,
    findingsDOM: null,
    gridId: "",
    isScanEnabled: false,
    isShareOn: false,
    isUserActive: false,
    localTrack: null,
    role: "",
    scanRequestId: null,
    socket: null,
    statusAgora: "",
    userId: null,
    videoElement: null,
    handLandmarker:undefined,
    markerSize:224,
    landMarkers:[],
    predictionWorker: null,
    predictionEndpoint:"",
    predictionKey:"",
    predictionData:null,
    probabilityThreshold: 70,
  },

  mounted() {
    this.socket = io(); // Initialize socket connection
    
    populatePage.call(this,1);
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    
    // 06-14 to mask userId for dev Ngrok test on iPad
    // this.userId = userId;    
    this.userId = "2XXX9-SIXDI%20Chen"; //for use in develop testing Ngrok/iPad
    this.role = "camera";
    this.statusAgora = "mute"; //mute, published, eg
    
    this.videoElement = document.getElementById("video");
    this.canvasElement = document.getElementById("canvas");
    this.ctx = this.canvasElement.getContext("2d", { willReadFrequently: true });
    
    this.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'h264' });

    this.joinAgoraRoom();
    
    this.socket.on('sessionMessage', function(sessionMessage) {
      if (sessionMessage.role === "console") {
        this.socket.emit('sessionMessage', {
          role: this.role,
          gridId: this.gridId,
          agoraUid: this.agoraUid,
          userId: this.userId,
          statusAgora: this.statusAgora,
          messageClass: "#updateMyInfo#",
          message:``
        });
      }
    }.bind(this));
    this.predictionWorker = new Worker('./lib/prediction-worker.js'); // Web Worker not importable, therefor put here
    this.predictionWorker.addEventListener('message', event => {
      const newPredictionData = event.data;
      this.predictionData.push(newPredictionData); // Update this.predictionData with the received predictionData
      console.log('Received prediction data:', predictionData);
    });
    
    this.batonCam = new batonCam(this.canvasElement,this.videoElement);
    this.batonUI = new batonUI(this.role, this.socket);
    this.batonCam.initiateCamera();
    this.initiateHand();
  },
  
  methods: {

  async initiateHand(){
      const runningMode = "VIDEO"
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: runningMode,
        numHands: 2
      });

      const azdata = await fetch('/azenv').then(response => response.json());
      this.predictionKey = azdata.predictionKey;
      this.predictionEndpoint = azdata.predictionEndpoint;
      const videoMsg = this.batonUI.greeting()
      this.batonUI.messageBox(videoMsg)
      this.batonUI.sound('ding')
  },
  
  startScanning() {
      // Setup screen layout
      this.batonUI.layout('scan')
      // Disable the setAutoPlay timer if it exists
      if (typeof this.stopSlide === 'function') {
        this.stopSlide();
      }
      this.isScanEnabled = true;
      // this.batonUI.socketEvent("#messageBox#", videoMsg, this.gridId);
      
      // Play scan icon animation
      this.batonUI.graphicsBox('s','batonApp');
      this.batonUI.socketEvent("#graphicsBox#", 's', this.gridId);
    
      // Initiate the scanning process by calling scanQRCode() recursively using requestAnimationFrame
     // this.scanRequestId = requestAnimationFrame(() => this.scanQRCode());
     this.batonUI.sound('dingding')
     this.predictHand();
  },
  

  async predictHand(){
    const vWidth = this.videoElement.videoWidth
    const vHeight = this.videoElement.videoHeight
    let videoMsg=''
    let sound=''
    // Only resize canvas when dimensions change
    if (this.canvasElement.width !== vWidth || this.canvasElement.height !== vHeight) {
      this.canvasElement.width = vWidth;
      this.canvasElement.height = vHeight;
    }
    let startTimeMs = performance.now();
    const results = this.handLandmarker.detectForVideo(this.videoElement, startTimeMs);
    this.ctx.save();
    this.ctx.clearRect(0, 0, vWidth, vHeight);
    console.log('land results ',results)
    let isAiming = false

    if (results.landmarks) {
      for (const landmarks of results.landmarks) {
          drawConnectors(this.ctx, landmarks, HAND_CONNECTIONS, {
            color: "#00FF00",
            lineWidth: 1.5
          });
          drawLandmarks(this.ctx, landmarks, { color: "#FF0000", lineWidth: 0.4 });
          const marker = this.batonCam.decodeLandmarks(landmarks)
          this.landMarkers.push(marker);
          videoMsg = 'tracking now...' 

          if (this.landMarkers.length > 4) {
            this.landMarkers.shift(); // Remove the first element to keep the array size to 4
            isAiming = this.landMarkers.every(marker => marker.isAiming);
          }
          if (isAiming){
            videoMsg = 'examining target now...'
            const latestMarker = this.landMarkers[this.landMarkers.length-1];
            const boxLoc = this.batonCam.virtualBoxLoc(latestMarker,vWidth,vHeight)
            const imageBlob = await this.batonCam.captureMarkerVideo(boxLoc)
            this.predictionWorker.postMessage({
              imageBlob: imageBlob,
              predictionKey: this.predictionKey,
              predictionEndpoint: this.predictionEndpoint
            });
          }
          
          sound = isAiming ? 'beep' : '';
      }
    }
    const checkResult = this.checkData()

    if (checkResult.hasAMatch){
      sound = ''
      videoMsg = `${checkResult.predictionData.tag} found (${checkResult.predictionData.probability}% confidence)  `
      console.log('thisData ',checkResult.predictionData)
      this.pipShow(checkResult.predictionData)
    }
    if (checkResult.isTimeOut){
      videoMsg = "time out"
      this.predictionData=[];
    }
    this.batonUI.sound(sound);     
    this.batonUI.messageBox(videoMsg)
    this.batonUI.socketEvent("#messageBox#", videoMsg, this.gridId);

    this.ctx.restore();
    window.requestAnimationFrame(this.predictHand.bind(this));
  },
  
checkData(){

  if (!this.predictionData || this.predictionData.length === 0) {
    // If predictionData is null or empty, consider it as timed out
    const result = {
      hasAMatch: false,
      isTimeOut: true,
      predictionData: null,
    };
    
    return result;
  }
  
  let isMatched1 = false
  let isMatched2 = false

  const nowTime = new Date().getTime()
  const beginTime = this.predictionData[0].time
  const isTimeOut = nowTime - beginTime > 3000
  const m = this.predictionData.length-1

  if (m >1){
    isMatched1 = this.predictionData[m].probability >= this.probabilityThreshold
    isMatched2 = this.predictionData[m-1].probability >= this.probabilityThreshold
  }

  const predictionData = this.predictionData[m]

  const result = {
    hasAMatch: isMatched1 && isMatched2,
    isTimeOut: isTimeOut,
    predictionData: predictionData,
  }
  return result
  },

  pipShow(predictionData) {
    const boundingBox = predictionData.boundingBox;
    const tag = predictionData.tag;
    const imageBlob = predictionData.imageBlob;
    const graphicsBox = document.querySelector('.graphics-box');
  
    // 1. Obtain boundBox XY info
    const boxLeft = boundingBox.left * 100; // Convert to percentage
    const boxTop = boundingBox.top * 100; // Convert to percentage
    const boxWidth = boundingBox.width * 100; // Convert to percentage
    const boxHeight = boundingBox.height * 100; // Convert to percentage
  
    // 2. Draw bounding box on the image
    const resultImage = new Image();
    resultImage.src = URL.createObjectURL(imageBlob);
  
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    resultImage.onload = () => {
      canvas.width = resultImage.width * 2; // Set canvas width twice the resultImage width
      canvas.height = resultImage.height * 2; // Set canvas height twice the resultImage height
  
    // Fill the canvas background with a solid white color
    ctx.fillStyle = '#959eba';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Calculate the position to center the resultImage within the canvas
      const offsetX = (canvas.width - resultImage.width) / 2;
      const offsetY = (canvas.height - resultImage.height) / 2;
  
      // Draw the resultImage centered within the canvas
      ctx.drawImage(resultImage, offsetX, offsetY, resultImage.width, resultImage.height);
  
      // Draw the bounding box on the canvas
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 5; // Set the border width
      ctx.beginPath();
      ctx.rect(boxLeft + offsetX, boxTop + offsetY, boxWidth, boxHeight);
      ctx.stroke();
  
      // Calculate the center position for the tag text
      const centerX = boxLeft + offsetX + boxWidth / 2;
      const centerY = boxTop + offsetY + boxHeight / 2;
  
      // Add the tag text at the center of the bounding box
      ctx.fillStyle = 'red';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center'; // Center the text horizontally
      ctx.textBaseline = 'middle'; // Center the text vertically
      ctx.fillText(tag, centerX, centerY);
  
        // Apply border radius and drop shadow to the canvas
      canvas.style.borderRadius = '20px'; // Set the border radius
      canvas.style.boxShadow = '20px 20px 25px black'; // Set the drop shadow

      // Display the canvas with the resultImage and bounding box in the graphicsBox
      graphicsBox.innerHTML = ''; // Clear the graphicsBox
      graphicsBox.appendChild(canvas);
    };
  }
  
  ,
  

  async viewFindings() {
    this.isScanEnabled=false;
    if (this.findingsDOM !== null) {
      this.isScanEnabled = await this.renderSlide(this.findingsDOM);
      if (typeof this.stopSlide === 'function') {
        this.stopSlide();
      }
    }
  },
  
  async renderSlide(findingsDOM){
    this.batonUI.layout('slide')
    const slide=document.querySelector('.slide')
    slide.innerHTML = findingsDOM; 

    return true
  },

  async joinAgoraRoom() {
    await joinAgoraRoom.call(this);
  },


  async shareCamera() {
      this.isShareOn = !this.isShareOn
      if (this.statusAgora === 'mute') {
        this.batonUI.messageBox("Enable camera sharing...");
        
        this.statusAgora = 'published';
        await this.localTrack.setEnabled(true);
        await this.client.publish(this.localTrack);
      } else {
        this.batonUI.messageBox("Stop camera sharing...");
        this.statusAgora = 'mute';
        await this.localTrack.setEnabled(false);
      }
      this.socket.emit('sessionMessage', {
        gridId: this.gridId,
        message: `[${this.gridId}:]<br><br>share camera`
      });
    },

  },

  beforeDestroy() {
    // Remove the event listener and terminate the worker
    this.predictionWorker.removeEventListener('message', this.handlePredictionResult.bind(this));
    this.predictionWorker.terminate();
  },

});
