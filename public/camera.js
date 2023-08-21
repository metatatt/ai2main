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
    billBoard:{
      initTime:null,
      info1:'',
      info2:'',
      image:null,
    },
    card:{
     id: '',
     key:'',
     endpoint: '',
     blobConnection:'',
     blobContainer:'',
     color:'',
     info1:'',
     info2:'',
    },
    target:{
      initTime:'',
      imageBlob: null,
      tag:'',
      probability: '',
      boundingBox: null,
      incidentCount: 0
    },
    module:{
      check: false,
      upload: false
    },
    taskToken:{
      initTime:'',
      resolved: true,
      module:null,
      card: null,
      target: null,
      billBoard:null,
    },
    billBoard:{},
    canvasElement: null,
    webRtc: null,
    gridId: "",
    isShareOn: false,
    isUserActive: false,
    role: "",
    socket: null,
    userId: null,
    videoElement: null,
    handLandmarker:undefined,
    checkWorker: null,
    pipContent: null,
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
      this.targetData(event.data)
    });    
    this.uploadWorker = new Worker('./lib/upload-worker.js'); // Web Worker not importable, therefor put here
    this.uploadWorker.addEventListener('message', event => {
      this.modelData(event.data)
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

      const emptyResult = {
        time: new Date().getTime(),
        isAiming:false,
        isACard:false,
        isATarget:false,
        incidentCount:0,
        hasMoved: false,
      };
      this.pipContent=emptyResult

      const last = await fetch('/card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: this.userId })
      });
      const lastCard = await last.json();
      this.card = lastCard.lastSaved

      const videoMsg = this.handUI.greeting()
      this.handUI.messageBox(videoMsg)
      this.handUI.sound('ding')
  },
  
  targetData(eventData){
    const newResult = eventData;
    const oldTag = this.target.tag || "" 
      if (!newResult.tag && oldTag !== newResult.tag) {
        // Update with the new result if new tag or blank tag
        this.target = newResult;
      } else {
        const incidentCount = this.target.incidentCount || 0;
    
        // Check if the new result's probability is higher than the existing one
        if (newResult.probability > this.target.probability) {
          // Update with the new result and increment incidentCount
          this.target = newResult;
          this.target.incidentCount = incidentCount + 1;
        } else {
          // Update the count
          this.target.incidentCount = incidentCount + 1;
        }
      }
    this.taskToken.resolved = true;
  },

  modelData(eventData){
      const newResult = eventData;
      this.target = newResult;
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
    // Only resize canvas when dimensions change
    if (this.canvasElement.width !== vWidth || this.canvasElement.height !== vHeight) {
      this.canvasElement.width = vWidth;
      this.canvasElement.height = vHeight;
    }
    let startTimeMs = performance.now();
    const results = this.handLandmarker.detectForVideo(this.videoElement, startTimeMs);
    this.ctx.save();
    this.ctx.clearRect(0, 0, vWidth, vHeight);
    if (results.landmarks) {
      for (const landmarks of results.landmarks) {

        drawConnectors(this.ctx, landmarks, HAND_CONNECTIONS, {
          color: this.taskToken.resolved ? "#FFFFFF" : "#808080", // ternary white, or gray (unresolved)
          lineWidth: 1.5
        });
        
        drawLandmarks(this.ctx, landmarks, { 
          color: this.taskToken.resolved ? "#5065A8" : "#808080", // ternary blue or gray (unresolved)
          lineWidth: 0.4 
        });
        console.log('**0 taskToken ', this.taskToken.resolved)
        if (this.taskToken.resolved){
          const isAiming = this.handCheck.extractGesture(landmarks)
          console.log('**1 aiming ', isAiming)
              if (isAiming){
                this.taskToken.resolved = false 
                console.log('**2 aiming ', isAiming)
                videoMsg = 'examining target now...'
                const imageBlob = await this.handCheck.captureNailTarget(vWidth,vHeight)
                const cardID = await this.handCheck.detectCard(imageBlob) //check card presence
                const tempId = '320B' //need to adjust this
                // this.uploadWorker.postMessage({
                //   cardId: tempId,
                //   imageBlob: imageBlob,
                //   connectionString: this.card.blobConnection,
                //   containerName: this.card.blobContainer
                // });
                
                this.checkWorker.postMessage({ //check classification of nailTarget
                    imageBlob: imageBlob,
                    card: this.card,
                });
              } //isAiming
        } //this.taskToken.resolved
      }
    }
    const oldContent = this.pipContent
    this.pipContent = await this.updatePip(this.target, oldContent) 
    if(this.pipContent != oldContent ){
        this.renderPip(this.pipContent)
    }
    this.handUI.sound(sound);     
    this.handUI.messageBox(videoMsg)
    this.handUI.socketEvent("#messageBox#", videoMsg, this.gridId);
    this.ctx.restore();
    window.requestAnimationFrame(this.detectHand.bind(this));
  },
  
async updatePip(checkResult, oldContent) {
    const recentMotion = new Date().getTime()
    const recentAiming = this.pipContent ? this.pipContent.time : 0;
    if (recentMotion - recentAiming > 4000 && checkResult.hasMoved) {//elapsed 4 second
      const closePip = {
        time: new Date().getTime(),
        handleDisplay: 'none', //to close PIP , display style = none
      };
      return closePip //intend to close PIP
    }
    if (checkResult.isAiming && checkResult.incidentCount > 1){
      checkResult.handleDisplay = 'block';
      return checkResult  //intend to display CheckResult in PIP
    } else {
      return oldContent  //intend for no action
    }
},


renderPip(target) {
  const graphicsBox = document.querySelector('.graphics-box');
  const display = target.handleDisplay
  graphicsBox.style.display = display // block vs none
  if(display == "none"){
    return
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
      canvas.style.borderRadius = '224px'; // Set the border radius
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
