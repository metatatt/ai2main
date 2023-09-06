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

    dataset:{
        id: '',    // eg 001ML or 001CK.
        tag:'',
        info:'',
        keyContain:'',
        endConnect: '',
        color:'', //"#e6d360"
        probability:'', //eg 0.7
    },
    
    varList:{
      prompt:{
        0:`say 'Hey Computer' to start`,
        1: `awaiting hand gesture...`,
        2: `point the target with two fingers...`,
        3: `say 'check' to snapshot...`,
        4: `checking now...`,
        5: `showing the result...`,
      },
    },
    codeBlock: '',
    snapShot:{
      imageBlob: null,
      boxLoc: null,
      type: 
          {
            info: 'target',  // Indicates whether the item is a [target] or [code] ("QR code").
            id: ''           // For QR codes, it typically starts with '@pr-'.
                            // To extract useful information from the content, use .slice(4, 9).
           },
      result: 
          {
            time:'',
            tag:'',
            probability: '',
            boundingBox: null,
            datasetId:'',
            },
      inspectionCount: 0
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

    this.startAgora();
    
    this.socket.on('sessionMessage', function(sessionMessage) {
      if (sessionMessage.role === "console") {
        this.socket.emit('sessionMessage', {
          gridId: this.gridId,
          userId: this.userId,
          messageClass: "#updateMyInfo#",
          message:``
        });
      }
    }.bind(this));
    this.checkWorker = new Worker('./lib/handWorker-check.js'); // Web Worker not importable, therefor put here
    this.checkWorker.addEventListener('message', event => {
      this.updateResult(event.data)
    });    
    this.uploadWorker = new Worker('./lib/handWorker-upload.js'); // Web Worker not importable, therefor put here
    this.uploadWorker.addEventListener('message', event => {
     // this.targetData(event.data)
    });
    this.handCheck = new handCheck(this.canvasElement,this.videoElement);
    this.handUI = new handUI(this);
    this.listener = new listener();
    this.seqRoute = document.querySelector('#seqRoute')
    this.seqRoute.addEventListener('input', (event)=>{
      const routeNum = parseInt(event.target.textContent, 10);
        if (!isNaN(routeNum)) {
          this.jumpToRoute(routeNum);
        } else {
            // Handle the case where the content is not a valid integer.
            console.error('Invalid route number:', event.target.textContent);
        }
    })
    this.start();
  },
  
methods: {

  async start(){
      this.generateCodeBlocks()
      this.initHandLandMarker()
      this.handCheck.initCamera();
      this.recallSaved()
      this.updateSequence(0)
      this.main()
  },

async generateCodeBlocks(){
  const assignment = await this.handUI.readFile('./lib/sidePage5.md')
  this.codeBlock= await this.handUI.chat('Now plrease provide code for this diagram. Do not include non code content in your response. '+assignment)
},

async initHandLandMarker(){
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

  },

  async main(){
    console.log("dataset ",this.dataset.id)
    const seqRoute = this.seqRoute.textContent
    this.ctx.save();
    this.ctx.clearRect(0, 0, this.canvasElement.width,this.canvasElement.height);
    let seq = seqRoute
    if (seqRoute>0 && seqRoute < 4 ){
      let startTimeMs = performance.now();
      const results = await this.handLandmarker.detectForVideo(this.videoElement, startTimeMs);
      if (results.landmarks) {
        for (const landmarks of results.landmarks) {
          seq = 2
          this.drawHand(seqRoute,landmarks, HAND_CONNECTIONS)
          const twoFingerDetected = this.handCheck.detectGesture(landmarks) 
          if (twoFingerDetected) {
            seq = 3
            this.snapShot.boxLoc = await this.handCheck.snapShotLoc(this.canvasElement.width, this.canvasElement.height)
            this.drawSnapShotBox(this.snapShot.boxLoc)
            this.handUI.sound('lowding')
          }            
        } 
      }
      if(seq != seqRoute) {
        this.updateSequence(seq)
      }
    }  

    this.ctx.restore();
    window.requestAnimationFrame(this.main.bind(this));
},
  

updateResult(eventData){
    const newResult = eventData;
    console.log('result payload** ', newResult)
    Object.assign(this.snapShot.result, newResult);
    this.updateSequence(5)
  },


updateSequence(num){
    this.seqRoute.textContent=num
    const inputEvent = new Event('input', {bubbles:true, cancelable:true})
    this.seqRoute.dispatchEvent(inputEvent)
},

async recallSaved(){
  const last = await fetch('/card', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId: this.userId })
  });
  const userLastAccess = await last.json();
  this.dataset = userLastAccess.lastSaved
  console.log('*this dataset ', this.dataset)
},

async updateDataset(id){
 
    const res = await fetch('/updatecard', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId: this.userId, cardId: id })
      });
      const newData = await res.json();
      console.log('newly saved**', newData)
      this.dataset = newData.newlySaved
      console.log('this **', this.dataset)
    const state = document.querySelector('#state')
    state.textContent = 'Dataset:** '+id
    this.updateSequence(5);
},

async jumpToRoute(routeNum) {
  let mdFile = '';
  let animation = '';
  eval(this.codeBlock)

  const prompt = document.querySelector('#prompt');
  const state = document.querySelector('#state')
  prompt.textContent = this.varList.prompt[routeNum];
  prompt.style.animation = animation; 
  state.innerHTML = `<i class="fa fa-database" style="font-size:32px"></i> #: ${this.dataset.id}`;
},

renderResultMDContent(){
const result = this.snapShot.result
const {datasetId, tag, probability} = result;
const mdContent = `## Report

| |  ||
|--|--|--|
|tag | ${tag} |-|
|confidence |  ${probability} |(%)|
|dataset |  ${datasetId} |-|
`;
return mdContent; 

},

async inspectSnapShot(){
const width = this.canvasElement.width;
const height = this.canvasElement.height;
this.snapShot.imageBlob = await this.handCheck.makeSnapShot(this.snapShot.boxLoc);
console.log('imgBlob-', this.snapShot.imageBlob)
const codeText = await this.handCheck.checkType(this.snapShot.imageBlob);
const id = this.dataset.id.slice(3, 5);
const isDataset = trim(codeText) !==''
const isNewDataset = (isDataset && codeText!==id)
const processMode = id === 'ML' ? 'upload' : 'check';
if (codeText) { // Use triple equals for comparison
    Object.assign(this.snapShot.result, {
        tag: 'QR code',
        probability: 'N/A',
        datasetId: codeText,
    });
    if (codeText!==this.dataset.id){
      this.updateDataset(codeText)
    }
    console.log('qr**'+codeText)
    this.updateSequence(5);
} else {
    const par = {
        imageBlob: this.snapShot.imageBlob,
        dataset: this.dataset,
    };
  this[`${worker}Worker`].postMessage(par);
}
},

showReport(isEnabled){
  const centerPage = document.querySelector('#centerPage')
  if (isEnabled){
  const mdContent=this.renderResultMDContent()
  const image = this.snapShot.imageBlob
  const boundingBox = this.snapShot.result.boundingBox
  centerPage.style.display = 'block'
  this.handUI.renderCenterPage(mdContent, image, boundingBox )
  setTimeout(() => {
    this.updateSequence(1);
  }, 5000); // 000 milliseconds = 5 seconds
  } else {
    centerPage.style.display = 'none'
  }
},

drawHand(seqRoute,landmarks, HAND_CONNECTIONS){
  drawConnectors(this.ctx, landmarks, HAND_CONNECTIONS, {
    color: seqRoute > 1 ? "#FFFFFF" : "#808080", // ternary white, or gray (unresolved)
    lineWidth: 1.5
    });
          
    drawLandmarks(this.ctx, landmarks, { 
    color: seqRoute > 1 ? "#5065A8" : "#808080", // ternary blue or gray (unresolved)
    lineWidth: 0.4 
    });
},

drawSnapShotBox(boxLoc) {  
    // Draw the snapshot box using the provided corner locations
    this.ctx.strokeStyle = 'red'; // Set the stroke color to red (you can change it to any color you prefer)
    this.ctx.lineWidth = 2; // Set the line width as desired
  
    this.ctx.beginPath();
    this.ctx.moveTo(boxLoc.locTL.x, boxLoc.locTL.y); // Move to the top-left corner
    this.ctx.lineTo(boxLoc.locTR.x, boxLoc.locTR.y); // Draw to the top-right corner
    this.ctx.lineTo(boxLoc.locBR.x, boxLoc.locBR.y); // Draw to the bottom-right corner
    this.ctx.lineTo(boxLoc.locBL.x, boxLoc.locBL.y); // Draw to the bottom-left corner
    this.ctx.closePath(); // Close the path to connect the last and first points
    this.ctx.stroke(); // Stroke the path to draw the box
},

async startAgora() {
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
