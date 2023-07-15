import { setScreenLayout, joinAgoraRoom, playAnimation,setTopBarText} from './lib/libA.js';
import { getEachResult, selectBestTwo} from './lib/libB.js';
import { populateFindings, setAutoPlay } from './lib/libC.js';

var ojoapp = new Vue({
  el: '#ojoapp',
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
    statusCheck: "listening",
    taskMode: "scan", // mode = scan, inspect, findings
    userId: null,
    videoElement: null,
  },
  

  mounted() {
    this.socket = io(); // Initialize socket connection
    
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    console.log(userId);
    
    // 06-14 to mask userId for dev Ngrok test on iPad
    // this.userId = userId;
    
    setTopBarText("starting...");
    
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
          message: "#updateMyInfo#"
        });
      }
    }.bind(this));
    
    this.initiateCamera();
  },
  
  methods: {
    async initiateCamera() {
      setTopBarText("initiating camera...")
      const constraints = {
        video: {
          facingMode: "environment",
          width: 1024,
          height: 768
        }
      };
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.videoElement.srcObject = stream;
        this.videoElement.setAttribute("playsinline", true);
        this.videoElement.play();
        setTopBarText("camera is on...")
      } catch (error) {
        console.log("#setUpVideo -Unable to access video stream:", error);
      }
    },

  startScanning() {
      // Setup screen layout
      const layout = setScreenLayout();
      layout.scan();
     
      // Disable the setAutoPlay timer if it exists
      if (typeof this.stopAutoPlay === 'function') {
        this.stopAutoPlay();
      }
    
      // Enable scanning and reset scanImageArray
      this.isScanEnabled = true;
      this.scanImageArray = [];
      
      // Set top bar text to indicate readiness for scanning
      setTopBarText("Ready to scan...");
      
      // Play scan icon animation
      playAnimation('s');
    
      // Initiate the scanning process by calling scanQRCode() recursively using requestAnimationFrame
      this.scanRequestId = requestAnimationFrame(() => this.scanQRCode());
  },
  

  // Purpose: This function is responsible for scanning QR codes, tracking user activity (active or idle), and storing relevant data in the scanImageArray.
  // This app switches between the scanQRCode() and processAudit() functions based on the combination of active-idle state and the length of scanImageArray.

  scanQRCode() {
    setTopBarText("idling now...");

    // Variables for tracking user activity
    let elapsedIdleSeconds = 0;
    let elapsedActiveSeconds = 0;

    // Check if video data is available
    if (this.videoElement.readyState === this.videoElement.HAVE_ENOUGH_DATA) {
      // Set canvas dimensions and draw video frame
      this.canvasElement.height = this.videoElement.videoHeight;
      this.canvasElement.width = this.videoElement.videoWidth;
      this.canvasContext.drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);

      // Extract image data from the canvas
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
        setTopBarText("taking images...");
        // Draw a visual indication of the scanned QR code location
        const location = code.location;
        this.drawCircle(location);

        // Calculate deltaX as the distance moved in the X direction from the previous scan
        const lastLoc = this.scanImageArray?.[this.scanImageArray.length - 1]?.imageData.location ?? location;
        const deltaX = Math.abs(lastLoc.topRightCorner.x - location.topRightCorner.x);

        // Store the imageData, deltaX, and timestamp in the scanImageArray
        this.scanImageArray.push({ imageData, deltaX, timestamp: Date.now() });
        console.log(`scanImageArray: ${this.scanImageArray.length} deltaX: ${deltaX}`);

        // Calculate elapsedActive time since the first scan
        const firstScan = this.scanImageArray?.[0]?.timestamp ?? Date.now();
        const elapsedActiveTime = Date.now() - firstScan;
        elapsedActiveSeconds = elapsedActiveTime / 1000;
      } else {
        // Calculate elapsedIdle time since the latest scan
        const latest = this.scanImageArray?.[this.scanImageArray.length - 1]?.timestamp ?? Date.now();
        const elapsedIdleTime = Date.now() - latest;
        elapsedIdleSeconds = elapsedIdleTime / 1000;
      }

      this.isScanEnabled = true;
    } // videoElement.readyState

    console.log(`active/idle: ${elapsedActiveSeconds} ${elapsedIdleSeconds}`);

    // Remove the scan from 1 second ago if the user is idle
    if (elapsedActiveSeconds > 1) {
      this.scanImageArray.shift();
    }

    // If the user has been idle for more than 2 seconds, prepare for the audit check
    if (elapsedIdleSeconds > 2) {
      this.isScanEnabled = false;
      setTopBarText("prepping scan images...");
      this.socket.emit('sessionMessage', {
        gridId: this.gridId,
        message: `[${this.gridId}:]<br><br>scan images...`
      });

      // Select two "static" images for audit check. 
      const finalImageDataArray = selectBestTwo(this.scanImageArray);
      playAnimation("t"); // Play Tee logo animation
      //Feed the selected images to audit check process
      this.processAudit(finalImageDataArray);
    }

    // Continue scanning by recursively calling scanQRCode() using requestAnimationFrame
    if (this.isScanEnabled) {
      this.scanRequestId = requestAnimationFrame(() => this.scanQRCode());
    }
  },
    
    
  async processAudit(imageDataArray) {
    setTopBarText("machine checking...");
    this.socket.emit('sessionMessage', {
      gridId: this.gridId,
      message: `[${this.gridId}:]<br><br>machine checking the images...`
    });
    this.videoElement.style.zIndex = -1;
    this.canvasElement.style.zIndex = -2;
    const header = { header1: "WIP 3200 (xxxx)", header2: "obtain info from PDF" };
    let results = [];
  
    // Iterate through the imageDataArray for processing each image
    try {
      for (let i = 0; i < imageDataArray.length; i++) {
        // Perform the audit check for each image
        const eachResult = await getEachResult(imageDataArray[i]);
        results.push({ id: i, audit: eachResult });
  
        setTopBarText("prepping ...");
      }

      // Sort the results array based on probability from high to low
      results.sort((a, b) => {
        const aProbability = a.audit ? JSON.parse(a.audit).probability : 0;
        const bProbability = b.audit ? JSON.parse(b.audit).probability : 0;
        return bProbability - aProbability;
      });

      // Display the audit report with the header and sorted results
      console.log('before Findings-results ', results)
      this.findingsDOM = populateFindings(header, results);
      this.renderSlide(this.findingsDOM)
      await setAutoPlay.call(this);
      this.startScanning();
    } catch (error) {
      console.log("Error:", error);
      return "Unable to access video stream.";
    }
  },

  async viewFindings() {
    if (this.findingsDOM !== null) {
      this.renderSlide(this.findingsDOM);
      if (typeof this.stopAutoPlay === 'function') {
        this.stopAutoPlay();
      }
    }
  },
  
  async renderSlide(findingsDOM){

    const layout = setScreenLayout();
    layout.slide();
    const overlay = document.querySelector('.overlay');
    const slide = document.createElement('div');
    slide.innerHTML = findingsDOM; 
    slide.classList.add('slide');
    overlay.appendChild(slide);
  },

  
  
  async joinAgoraRoom() {
      await joinAgoraRoom.call(this);
   },


  async shareCamera() {
      this.isShareOn = !this.isShareOn
      if (this.statusAgora === 'mute') {
        setTopBarText("Enable camera sharing...");
        
        this.statusAgora = 'published';
        await this.localTrack.setEnabled(true);
        await this.client.publish(this.localTrack);
        console.log('第：publish');
      } else {
        setTopBarText("Stop camera sharing...");
        this.statusAgora = 'mute';
        await this.localTrack.setEnabled(false);
      }
      this.socket.emit('sessionMessage', {
        gridId: this.gridId,
        message: `[${this.gridId}:]<br><br>share camera`
      });
    },
    
    drawLine(begin, end, color) {
      this.canvasContext.beginPath();
      this.canvasContext.moveTo(begin.x, begin.y);
      this.canvasContext.lineTo(end.x, end.y);
      this.canvasContext.lineWidth = 4;
      this.canvasContext.strokeStyle = color;
      this.canvasContext.stroke();
    },

    drawCircle(location) {
      const topRight = location.topRightCorner;
      const viewWidth = document.documentElement.clientWidth;
      const radius = Math.min(this.canvasElement.width, this.canvasElement.height) / 4; // Updated radius calculation
      const center = {
        x: topRight.x ,
        y: topRight.y // Distance above the width on the upper part
      };
    
      this.canvasContext.beginPath();
      this.canvasContext.arc(center.x, center.y, radius, 0, 2 * Math.PI);
      this.canvasContext.lineWidth = 4;
      this.canvasContext.strokeStyle = "#FF3B58";
      this.canvasContext.stroke();
    }
    
  }
});
