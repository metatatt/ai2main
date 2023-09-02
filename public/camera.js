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
        3: `say 'check' to make snapshot...`,
        4: `checking now...`,
        5: `showing result...`,
      },
    },
    snapShot:{
      imageBlob: null,
      type: 
          {
            info: 'target',  // Indicates whether the item is a [target] or [code] ("QR code").
            id: ''           // For QR codes, it typically starts with '@pr-'.
                            // To extract useful information from the content, use .slice(4, 9).
           },
      inspectionResult:'',
      result: 
          {
            time:'',
            tag:'',
            probability: '',
            boundingBox: null,
            },
      inspectionCount: 0
    },

    flowFlag:{
      resloved: true,
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
      this.targetData(event.data)
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
    this.initiate();
  },
  
  methods: {

  async initiate(){
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

      this.handCheck.initiateCamera();

      const last = await fetch('/card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: this.userId })
      });
      const userLastAccess = await last.json();
      this.dataset = userLastAccess.lastSaved
      this.updateSeqRoute(0)
      this.main()
  },

  updateResult(eventData){
    const newResult = eventData;
    const oldResult = this.snapShot.result
    let inspectionCountSum = this.snapShot.inspectionCount || 2;
    let defaultResult = newResult;
    if (newResult.tag === oldResult.tag && oldResult.probability > newResult.probability) {
      defaultResult = oldResult
    }
    Object.assign(this.target, defaultResult, { inspectionCount: inspectionCountSum+1 });
    if (this.snapShot.inspectionCount=== 0 ){
        this.updateSeqRoute(5)
    }
  },


async main(){
    const seqRoute = this.seqRoute.textContent
    this.ctx.save();
    this.ctx.clearRect(0, 0, this.canvasElement.width,this.canvasElement.height);
    if (seqRoute>0 && seqRoute < 3 ){
      let startTimeMs = performance.now();
      const results = await this.handLandmarker.detectForVideo(this.videoElement, startTimeMs);
      if (results.landmarks) {
        this.updateSeqRoute(2)
        for (const landmarks of results.landmarks) {
          this.drawHand(seqRoute,landmarks, HAND_CONNECTIONS)
          const twoFingerDetected = this.handCheck.detectGesture(landmarks) 
          if (twoFingerDetected) {
            this.handUI.sound('beep')
            this.updateSeqRoute(3)
          }            
        } 
      }
    }  

    this.ctx.restore();
    window.requestAnimationFrame(this.main.bind(this));
},

updateSeqRoute(num){
 //if (num > this.seqRoute.textContent){
    this.seqRoute.textContent=num
    const inputEvent = new Event('input', {bubbles:true, cancelable:true})
    this.seqRoute.dispatchEvent(inputEvent)
 // }
},

async jumpToRoute(routeNum) {
  console.log('seqRoute** ', routeNum)
  let stateTag = `Dataset #: ${this.dataset.id}`
  let mdFile = '';
  let animation = '';

  switch (routeNum) {
      case 0:
        console.log('seqRoute*** ', routeNum)
        mdFile = './lib/sidePageLaunch.md';
        this.handUI.renderSidePage(mdFile);
        animation = 'flashing 2s infinite'
        break;
      case 1:
        mdFile = './lib/sidePageCheck.md';
        this.handUI.renderSidePage(mdFile);
        break;
      case 2:
          break;
      case 3: // Get snapShot and identify as Code or Target (default)
        animation = 'flashing 2s infinite'
          const width = this.canvasElement.width;
          const height = this.canvasElement.height;
          this.snapShot.imageBlob = await this.handCheck.makeSnapShot(width, height);
          console.log('imgBlob ', this.snapShot.imageBlob)
          this.snapShot.type = await this.handCheck.checkType(this.snapShot.imageBlob);
          break;
      case 4:
          if (this.snapShot.type === "code") { // Use triple equals for comparison
              Object.assign(this.snapShot, {
                  inspectionResult: 'QR code',
                  tag: 'QR',
              });
              this.updateSeqRoute(5);
          } else {
              const id = this.dataset.id.slice(3, 5);
              console.log('** check or upload ', id);
              const worker = id === 'ML' ? 'upload' : 'check';
              const par = {
                  imageBlob: this.snapShot.imageBlob,
                  dataset: this.dataset,
              };
              this[`${worker}Worker`].postMessage(par);
          }
          break;
      case 5:
          mdFile = './lib/sidePageCheck.md';
          this.handUI.renderSidePage(mdFile);
          break;
      default:
          break;
  }

  const prompt = document.querySelector('#prompt');
  const state = document.querySelector('#state')
  prompt.textContent = this.varList.prompt[routeNum];
  prompt.style.animation = animation; 
  state.textContent = stateTag

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
