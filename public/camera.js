import { joinAgoraRoom, handCheck} from './lib/handCheck.js';
import { handUI, listener} from './lib/handUI.js';
import {
  HandLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

var HandCheckrApp = new Vue({
  el: '#handCheckr',
  data: {
    agoraUid: "",
    card:{
     id: '',
     keyContain:'',
     endConnect: '',
     color:'',
     tag:'',
     info:'',
     imageBlob: null,
     boundingBox: null,
    },
    target:{
      initTime:'',
      imageBlob: null,
      color:'',
      tag:'',
      info:'',
      probability: '',
      boundingBox: null,
      incidentCount: 0
    },
    flowFlag:{
      num: 0,
      ckeck: true,
      upload: false,
    },
    canvasElement: null,
    webRtc: null,
    gridId: "",
    isShareOn: false,
    role: "",
    socket: null,
    userId: null,
    videoElement: null,
    probabilityThreshold: 0.5,
  },

  mounted() {
    this.socket = io(); // Initialize socket connection

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
    this.checkWorker = new Worker('./lib/handWorker-check.js'); // Web Worker not importable, therefor put here
    this.checkWorker.addEventListener('message', event => {
      if (this.flowFlag.resolved) {this.targetData(event.data)}
    });    
    this.uploadWorker = new Worker('./lib/handWorker-upload.js'); // Web Worker not importable, therefor put here
    this.uploadWorker.addEventListener('message', event => {
      if (this.flowFlag.resolved) {this.targetData(event.data)}
    });
    this.handCheck = new handCheck(this.canvasElement,this.videoElement);
    this.handUI = new handUI(this);
    this.listener = new listener();
    this.handCheck.initiateCamera();
    this.initiateHand();
    this.flag = document.querySelector('#numFlag')
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

      const last = await fetch('/card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: this.userId })
      });
      const lastCard = await last.json();
      this.card = lastCard.lastSaved
      this.handUI.renderSidePage('./lib/sidePageLaunch.md')

      const greeting = this.handUI.greeting()
      this.handUI.messageBox(greeting)
      this.main()
  },

  targetData(eventData){
    const newResult = eventData;
    const oldResult = this.target
    let pendingCount = this.target.pendingCount || 2;
    let defResult = newResult;
    if (newResult.tag === oldResult.tag && oldResult.probability > newResult.probability) {
      defResult = oldResult
    }
    Object.assign(this.target, defResult, { pendingCount: pendingCount-1 });
    if (this.target.pendingCount === 0 ){
        this.renderPip(this.target,'beep')
    }
  },


async main(){
    const vWidth = this.videoElement.videoWidth
    const vHeight = this.videoElement.videoHeight
          if (this.canvasElement.width !== vWidth || this.canvasElement.height !== vHeight) {
            Object.assign(this.canvasElement, { width: vWidth, height: vHeight });
          }
    const numFlag = this.flag.textContent
    console.log(`numFl this ${numFlag} ` )
    if (numFlag>0){
      let startTimeMs = performance.now();
      const results = await this.handLandmarker.detectForVideo(this.videoElement, startTimeMs);
      this.ctx.save();
      this.ctx.clearRect(0, 0, vWidth, vHeight);
      
      if (results.landmarks) {
        for (const landmarks of results.landmarks) {
            drawConnectors(this.ctx, landmarks, HAND_CONNECTIONS, {
            color: this.numFlag > 3 ? "#FFFFFF" : "#808080", // ternary white, or gray (unresolved)
            lineWidth: 1.5
            });
                  
            drawLandmarks(this.ctx, landmarks, { 
            color: this.numFlag > 3 ? "#5065A8" : "#808080", // ternary blue or gray (unresolved)
            lineWidth: 0.4 
            });
        
        const isAiming = this.handCheck.extractGesture(landmarks)
                
                if (isAiming){
                        const imageBlob = await this.handCheck.captureNailTarget(vWidth,vHeight)
                        const cardId = await this.handCheck.detectCard(imageBlob) //check card presence
                        if (cardId) {
                          this.showCardData(cardId)
                        } else if(this.card){
                            const id = this.card.id.slice(3,5)
                            console.log('** check or upload ', id)
                            const worker = id ==='ML'? 'upload':'check';
                            const par = {
                              imageBlob: imageBlob,
                              card: this.card,
                            }
                        this[`${worker}Worker`].postMessage(par)  
                        }
                        this.flowFlag.check = false
                      } //isAiming
              }
            } 
  }  
    // this.handUI.socketEvent("#messageBox#", videoMsg, this.gridId);
    this.ctx.restore();
    window.requestAnimationFrame(this.main.bind(this));
},
  

renderPip(target,sound) {
  console.log('target ',target)
  this.flowFlag.resolved=false
  this.handUI.sound(sound)
  const graphicsBox = document.querySelector('.graphics-box');
  graphicsBox.style.display = 'block';
  
  const boundingBox = target.boundingBox;
  const tag = target.tag;
  const color = target.color


  // Create an image element to load the imageBlob
  const resultImage = new Image();
  resultImage.src = target.imageBlob ? URL.createObjectURL(target.imageBlob) : './img/iconCamera.svg';

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  resultImage.onload = () => {
    resultImage.width = 224
    resultImage.height = 224
    canvas.width = resultImage.width * 2;
    canvas.height = resultImage.height * 2;

    // Fill canvas background with a solid color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const offsetX = (canvas.width - resultImage.width) / 2;
    const offsetY = (canvas.height - resultImage.height) / 2;

      // Define bounding box dimensions
    const boxLeft = boundingBox.left * resultImage.width || 0; // Convert to percentage
    const boxTop = boundingBox.top * resultImage.height || 0; // Convert to percentage
    const boxWidth = boundingBox.width * resultImage.width ||resultImage.width ; // Convert to percentage
    const boxHeight = boundingBox.height * resultImage.height ||resultImage.height ; // Convert to percentage
    
    // Draw resultImage centered within the canvas
    ctx.drawImage(resultImage, offsetX, offsetY, resultImage.width, resultImage.height);

    // Draw bounding box on the canvas
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.rect(boxLeft + offsetX, boxTop + offsetY, boxWidth, boxHeight);
    ctx.stroke();

    // Calculate center position for the tag text
    const centerX = boxLeft + offsetX + boxWidth / 2;
    const centerY = boxTop + offsetY + boxHeight / 2;

    // Add tag text at the center of the bounding box
    ctx.fillStyle = 'red';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, centerX, centerY);

    // Apply border radius and drop shadow to the canvas
    canvas.style.borderRadius = '224px';
    canvas.style.boxShadow = '20px 20px 25px black';

    // Display canvas with resultImage and bounding box in the graphicsBox
    graphicsBox.innerHTML = '';
    graphicsBox.appendChild(canvas);
  };

  setTimeout(() => {
    this.flowFlag.resolved = true;
    graphicsBox.innerHTML = '';
    this.flushMemory()
  }, 5000); // Delay for 5 seconds
} ,

flushMemory(){
  this.target = {
    initTime:'',
    imageBlob: null,
    color:'',
    tag:'',
    info:'',
    probability: '',
    boundingBox: null,
    incidentCount: 0
  }
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
    this.predictionWorker.removeEventListener('message', this.handlePredictionResult.bind(this));
    this.predictionWorker.terminate();
},


});
