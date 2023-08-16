import { joinAgoraRoom, handCheck} from './lib/libA.js';
import { populateFindings, populatePage, playSlide, handUI} from './lib/libC.js';
import {
  HandLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

var HandCheckrApp = new Vue({
  el: '#handCheckr',
  data: {
    agoraUid: "",
    canvasElement: null,
    canvasHeight: 768,
    canvasWidth: 1024,
    webRtc: null,
    gridId: "",
    isShareOn: false,
    isUserActive: false,
    localTrack: null,
    role: "",
    socket: null,
    userId: null,
    videoElement: null,
    handLandmarker:undefined,
    checkWorker: null,
    checkResults:[],
    predictionEndpoint:"",
    predictionKey:"",
    pipStartTime:0,
    probabilityThreshold: 0.5,
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
    
    this.webRtc = AgoraRTC.createClient({ mode: 'rtc', codec: 'h264' });

    this.joinAgoraRoom();
    
    this.socket.on('sessionMessage', function(sessionMessage) {
      if (sessionMessage.role === "console") {
        this.socket.emit('sessionMessage', {
          role: this.role,
          gridId: this.gridId,
          agoraUid: this.agoraUid,
          userId: this.userId,
          messageClass: "#updateMyInfo#",
          message:``
        });
      }
    }.bind(this));
    this.checkWorker = new Worker('./lib/check-worker.js'); // Web Worker not importable, therefor put here
    this.checkWorker.addEventListener('message', event => {
      const newResult = event.data;
      this.checkResults.push(newResult); // Update this.predictionData with the received predictionData
    });
    
    this.handCheck = new handCheck(this.canvasElement,this.videoElement);
    this.handUI = new handUI(this.role, this.socket);
    this.handCheck.initiateCamera();
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
      const videoMsg = this.handUI.greeting()
      this.handUI.messageBox(videoMsg)
      this.handUI.sound('ding')
  },
  
  startScanning() {
      // Setup screen layout
      this.handUI.layout('scan')
      // Disable the setAutoPlay timer if it exists
      if (typeof this.stopSlide === 'function') {
        this.stopSlide();
      }   
         this.handUI.sound('dingding')
     this.detectHand();
  },
  

  async detectHand(){
    const vWidth = this.videoElement.videoWidth
    const vHeight = this.videoElement.videoHeight
    let videoMsg=''
    let sound=''
    let closePip = false
    // Only resize canvas when dimensions change
    if (this.canvasElement.width !== vWidth || this.canvasElement.height !== vHeight) {
      this.canvasElement.width = vWidth;
      this.canvasElement.height = vHeight;
    }
    let startTimeMs = performance.now();
    const results = this.handLandmarker.detectForVideo(this.videoElement, startTimeMs);
    this.ctx.save();
    this.ctx.clearRect(0, 0, vWidth, vHeight);
    let gesture = 0;

    if (results.landmarks) {
      for (const landmarks of results.landmarks) {
          drawConnectors(this.ctx, landmarks, HAND_CONNECTIONS, {
            color: "#00FF00",
            lineWidth: 1.5
          });
          drawLandmarks(this.ctx, landmarks, { color: "#FF0000", lineWidth: 0.4 });
          const isAiming = this.handCheck.extractGesture(landmarks)

          if (isAiming){
            videoMsg = 'examining target now...'
            const imageBlob = await this.handCheck.captureNailTarget(vWidth,vHeight)
            console.log('1 blob ', imageBlob)
            const cardID = await this.handCheck.detectCard(imageBlob) //check card presence
            console.log('2 id ', cardID)
            this.checkWorker.postMessage({ //check classification of nailTarget
                cardID:cardID,
                imageBlob: imageBlob,
                predictionKey: this.predictionKey,
                predictionEndpoint: this.predictionEndpoint,
                probabilityThreshold: this.probabilityThreshold
            });
          }else {
              const gestureMetrics= {
                time: new Date().getTime(),
                isAiming: false,
                }
            this.checkResults.push(gestureMetrics)
          }
      }
    }
    const pipContent = this.prepForPip(this.checkResults) 
    if (pipContent && pipContent.isAiming){
      sound = 'dingding'
      console.log('1 pipContent ', pipContent)
      closePip = this.pipShow(true, pipContent, 3000)
    }
    this.handUI.sound(sound);     
    this.handUI.messageBox(videoMsg)
    this.handUI.socketEvent("#messageBox#", videoMsg, this.gridId);
    this.ctx.restore();
    console.log('2 closePip', closePip)
    if (pipContent && closePip) {
      closePip2 = this.pipShow(false,pipContent,)
    }
    window.requestAnimationFrame(this.detectHand.bind(this));
  },
  
 prepForPip() {
    if (this.checkResults.length > 2) {
      this.checkResults.shift();
    }
    let pipContent =''
    const countCard = this.checkResults.filter(result => result.isACard).length
    const countTarget = this.checkResults.filter(result => result.isATarget).length

    if (countCard> 0 || countTarget > 1){
    
    const mostLikely = this.checkResults.reduce((maxResult, result) => {
      return result.probability > maxResult.probability ? result : maxResult;
    }, this.checkResults[this.checkResults.length-1]);

    pipContent = mostLikely
    } else {
    pipContent = this.checkResults[this.checkResults.length-1]
    } 
    console.log('3 closePip-mostLikely', pipContent)
    return pipContent
}
  ,

pipShow(show, target, timeDelay) {
  console.log('5 pipShow')
  const graphicsBox = document.querySelector('.graphics-box');
  graphicsBox.style.display = show ? 'block' : 'none';
  if (!show){
    return false
  }
    const boundingBox = target.boundingBox;
    const tag = target.tag;
    const imageBlob = target.imageBlob;
    let boxLeft =0
    let boxTop = 0
    let boxWidth = 224
    let boxHeight = 224
  
    // 1. Obtain boundBox XY info
    if(target.isATarget){
    boxLeft = boundingBox.left * 100; // Convert to percentage
    boxTop = boundingBox.top * 100; // Convert to percentage
    boxWidth = boundingBox.width * 100; // Convert to percentage
    boxHeight = boundingBox.height * 100; // Convert to percentage
    } 
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

    setTimeout(() => {
      const closePip = true
      return closePip
      console.log('5-check ',this.checkResults)
      requestAnimationFrame(this.detectHand.bind(this));
    }, timeDelay);
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
    this.handUI.layout('slide')
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
        this.handUI.messageBox("Enable camera sharing...");
        
        this.statusAgora = 'published';
        await this.localTrack.setEnabled(true);
        await this.webRtc.publish(this.localTrack);
      } else {
        this.handUI.messageBox("Stop camera sharing...");
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
