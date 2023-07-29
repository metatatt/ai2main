import { populatePage, populateLayout, playSlide, joinAgoraRoom, batonUI} from './lib/libA.js';
import { getEachResult} from './lib/libB.js';
import { populateFindings, batonCam } from './lib/libC.js';

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
    scanImageArray: [],
    scanRequestId: null,
    socket: null,
    statusAgora: "",
    userId: null,
    videoElement: null,
  },
  

  mounted() {
    this.socket = io(); // Initialize socket connection
    
    populatePage.call(this,1)
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    console.log(userId);
    
    // 06-14 to mask userId for dev Ngrok test on iPad
    // this.userId = userId;    
    this.userId = "2XXX9-"; //for use in develop testing Ngrok/iPad
    this.role = "camera";
    this.statusAgora = "mute"; //mute, published, eg
    
    this.videoElement = document.getElementById("video");
    this.canvasElement = document.getElementById("canvas");
    this.canvasContext = this.canvasElement.getContext("2d", { willReadFrequently: true });
    
    this.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'h264' });
  
    this.joinAgoraRoom();
    
    this.socket.on('sessionMessage', function(sessionMessage) {
      console.log("sessionMessage: ", sessionMessage);
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

    this.batonCam = new batonCam(this.canvasElement,this.videoElement)
    this.batonUI = new batonUI(this.role, this.gridId, this.socket)
    this.batonCam.initiateCamera();
  },
  
  methods: {
  startScanning() {
      // Setup screen layout
      const layout = populateLayout();
      layout.scan();
     
      // Disable the setAutoPlay timer if it exists
      if (typeof this.stopSlide === 'function') {
        this.stopSlide();
      }
    
      // Enable scanning and reset scanImageArray
      this.isScanEnabled = true;
      this.scanImageArray = [];
      this.batonCam.reset(this.scanImageArray)
      const msg = "camera is on..."
      this.batonUI.messageBox(msg)
      this.batonUI.socketEvent("#messageBox#", msg);
      
      // Play scan icon animation
      this.batonUI.graphicsBox('s','batonApp');
      this.batonUI.socketEvent("#graphicsBox#", 's');
    
      // Initiate the scanning process by calling scanQRCode() recursively using requestAnimationFrame
      this.scanRequestId = requestAnimationFrame(() => this.scanQRCode());
  },
  

  // Purpose: This function is responsible for scanning QR codes, tracking user activity (active or idle), and storing relevant data in the scanImageArray.
  // This app switches between the scanQRCode() and processAudit() functions based on the combination of active-idle state and the length of scanImageArray.

  scanQRCode() {
    // Check if video data is available
    if (this.videoElement.readyState === this.videoElement.HAVE_ENOUGH_DATA) {
      this.canvasElement.height = this.videoElement.videoHeight;
      this.canvasElement.width = this.videoElement.videoWidth;
      this.canvasContext.drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);
      var imageData = this.canvasContext.getImageData(0, 0, this.canvasElement.width, this.canvasElement.height);

      // Attempt to decode QR code from the image data
      var code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      // Check if a valid QR code is scanned
      if (code && code.data.startsWith('@pr-')) {
        // Adjust layers to enable canvas drawing activities
        this.videoElement.style.zIndex = -2;
        this.canvasElement.style.zIndex = -1;

        const msg = "capture from webcam..."
        this.batonUI.messageBox(msg)
        this.batonUI.socketEvent("#messageBox#", msg);

        // Draw a visual indication of the scanned QR code location
        const location = code.location;
        const clippedImage = this.batonCam.drawRect(location,4) //rect width/height = 4 times of QR box
        this.batonCam.updateArray(clippedImage, location, performance.now());
        this.isScanEnabled = true;
      } else {
        this.isScanEnabled = !this.batonCam.hasTargets() //if targetFound, disable the scan loop
      }
    }

      if (!this.isScanEnabled) {
      const msg = "inspect images..."
      this.batonUI.messageBox(msg)
      this.batonUI.socketEvent("#messageBox#", msg);

      this.batonUI.graphicsBox('t','batonApp'); // Play Tee logo animation
      this.batonUI.socketEvent("#graphicsBox#", 't');
      // Select two "static" images for audit check. 
      const targetsArray = this.batonCam.extractTargets();
      // //Feed the selected images to audit check process
      this.processAudit(targetsArray);
    }

    // Continue scanning by recursively calling scanQRCode() using requestAnimationFrame
    if (this.isScanEnabled) {
      this.scanRequestId = requestAnimationFrame(() => this.scanQRCode());
    }
  },
    
    
  async processAudit(imageDataArray) {
    this.isScanEnabled = false;
    this.videoElement.style.zIndex = -1;
    this.canvasElement.style.zIndex = -2;
    const header = { header1: "WIP 3200 (xxxx)", header2: "obtain info from PDF" };
    let results = [];
  
    // Iterate through the imageDataArray for processing each image
    try {
      for (let i = 0; i < imageDataArray.length; i++) {
        // Perform the audit check for each image
        const eachResult = await getEachResult(imageDataArray[i].clippedImage);
        results.push({ id: i, audit: eachResult });
      }

      const msg = "create report..."
        
      this.batonUI.messageBox(msg)
      this.batonUI.socketEvent("#messageBox#", msg);

      this.batonUI.graphicsBox('r','batonApp');
      this.batonUI.socketEvent("#graphicsBox#", 'r');

      console.log('procAudit() results ', results)
      // Sort the results array based on probability from high to low
      results.sort((a, b) => {
        const aProbability = a.audit ? a.audit.probability : 0;
        const bProbability = b.audit ? b.audit.probability : 0;
        return bProbability - aProbability;
      });

      // Display the Findings with the header and sorted results
      this.findingsDOM = populateFindings(header, results);
      this.renderSlide(this.findingsDOM)
      
      this.socket.emit('sessionMessage', {
        role: this.role,
        gridId: this.gridId,
        messageClass: "#slide#",
        message: this.findingsDOM
      });
      this.isScanEnabled = await playSlide.call(this);
      this.startScanning();
    } catch (error) {
      console.log("Error:", error);
      return "Unable to access video stream.";
    }
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
    const layout = populateLayout();
    layout.slide();
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

  }
});
