import { joinAgoraRoom, batonCam} from './lib/libA.js';
import { getEachResult} from './lib/libB.js';
import { populateFindings, populatePage, playSlide, batonUI} from './lib/libC.js';

var ojoapp = new Vue({
  el: '#batonApp',
  data: {
    agoraUid: "",
    canvasContext: null,
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
  },
  

  mounted() {
    this.socket = io(); // Initialize socket connection
    
    populatePage.call(this,1);
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    console.log(userId);
    
    // 06-14 to mask userId for dev Ngrok test on iPad
    // this.userId = userId;    
    this.userId = "2XXX9-SIXDI%20Chen"; //for use in develop testing Ngrok/iPad
    this.role = "camera";
    this.statusAgora = "mute"; //mute, published, eg
    
    this.videoElement = document.getElementById("video");
    this.canvasElement = document.getElementById("canvas");
    this.canvasContext = this.canvasElement.getContext("2d", { willReadFrequently: true });
    
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
    this.batonCam = new batonCam(this.canvasElement,this.videoElement);
    this.batonUI = new batonUI(this.role, this.socket);
    this.batonCam.initiateCamera();
    this.batonCam.initiateHand();
  },
  
  methods: {
  startScanning() {
      // Setup screen layout
      this.batonUI.layout('scan')
      // Disable the setAutoPlay timer if it exists
      if (typeof this.stopSlide === 'function') {
        this.stopSlide();
      }
      this.isScanEnabled = true;
      const msg = "camera is on..."
      this.batonUI.messageBox(msg)
      this.batonUI.socketEvent("#messageBox#", msg, this.gridId);
      
      // Play scan icon animation
      this.batonUI.graphicsBox('s','batonApp');
      this.batonUI.socketEvent("#graphicsBox#", 's', this.gridId);
    
      // Initiate the scanning process by calling scanQRCode() recursively using requestAnimationFrame
     // this.scanRequestId = requestAnimationFrame(() => this.scanQRCode());
     this.batonCam.predictHand();
  },
  

  scanQRCode() {
    // Check if video data is available
    if (this.videoElement.readyState === this.videoElement.HAVE_ENOUGH_DATA) {
      if(this.batonCam.isIdle()){
        this.batonUI.layout('scan')
      };
      this.canvasElement.height = this.videoElement.videoHeight;
      this.canvasElement.width = this.videoElement.videoWidth;
      this.canvasContext.drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);
      var imageData = this.canvasContext.getImageData(0, 0, this.canvasElement.width, this.canvasElement.height);
  
      // Attempt to decode QR code from the image data
      var code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      let isStatic =false
      let qrLoc = ''
      if (code){
        qrLoc = code.location
        isStatic = this.batonCam.motion(qrLoc)
        console.log('static?', isStatic);
      }
      // scan check QR Code
      if (isStatic && code.data.startsWith('@pr-')) {
        // Adjust layers to enable canvas drawing activities
        this.videoElement.style.zIndex = -2;
        this.canvasElement.style.zIndex = -1;
        this.batonUI.layout('predict');
        const msg = "capture from webcam...";
        this.batonUI.messageBox(msg);
        this.batonUI.socketEvent("#messageBox#", msg, this.gridId);
  
        // Peek if the detectLoc rect area contains a Target
        const detectLoc = this.batonCam.drawRect(qrLoc, 4);
        this.batonCam.detectTarget(detectLoc)
          .then((result) => {
            // Check if the target was detected
            console.log('bug here: result? ', result)
            console.log('bug here: result in Target? ', result.isTarget)
            if (result.isTarget) {
              this.isScanEnabled = false;
              const imageData = result.imageData;
              this.cloudPredict(imageData);
            } else {
              // Target not detected!
            }
          })
          .catch((error) => {
            console.error('An error occurred:', error);
            // Handle errors if the Promise gets rejected
          });
      } // if (code && code.data.startsWith('@pr-'))
    } // end if (this.videoElement.readyState === this.videoElement.HAVE_ENOUGH_DATA)
  
    // Continue scanning by recursively calling scanQRCode() using requestAnimationFrame
    if (this.isScanEnabled) {
      this.scanRequestId = requestAnimationFrame(() => this.scanQRCode());
    }
  },
  
  cloudPredict(imageData) {
    let msg = "inspect images...";
    this.batonUI.messageBox(msg);
    this.batonUI.socketEvent("#messageBox#", msg, this.gridId);
    this.batonUI.graphicsBox('t', 'batonApp'); // Play Tee logo animation
    this.batonUI.socketEvent("#graphicsBox#", 't', this.gridId);
    this.videoElement.style.zIndex = -1;
    this.canvasElement.style.zIndex = -2;
    let result = '';
    const header = { header1: "WIP 3200 (xxxx)", header2: "obtain info from PDF" };
  
    getEachResult(imageData)
      .then((result) => {
  
        // Display the Findings with the header and sorted results
        this.findingsDOM = populateFindings(header, result);
        this.renderSlide(this.findingsDOM);
        this.batonUI.socketEvent("#slide#", this.findingsDOM, this.gridId);
  
        return playSlide.call(this);
      })
      .then((isScanEnabled) => {
        this.isScanEnabled = isScanEnabled;
        this.startScanning();
      })
      .catch((error) => {
        console.error(error);
        // Handle errors if the Promises get rejected
      });
  },
  

  async viewFindings() {
    this.isScanEnabled=false;
    console.log("isEnabled? ",this.isScanEnabled)
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
    console.log(`slide ${slide} style.display-- ${slide.style.display}`)
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
        console.log('第：publish');
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

  }});
