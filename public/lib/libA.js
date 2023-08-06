import {
  HandLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";


export async function joinAgoraRoom() {
    const response = await fetch('/env', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId: this.userId })
    });
    
    const data = await response.json();
    this.agoraUid = await this.client.join(data.APP_ID, data.CHANNEL, data.TOKEN, null);
    this.gridId = data.GRIDID;
    const cameraOptions = {
      facingMode: "environment",
      videoProfile: "1080p_2" 
    };
    this.localTrack = await AgoraRTC.createCameraVideoTrack(cameraOptions);
    this.statusAgora = "mute";
      this.socket.emit('sessionMessage', {
        role: this.role,
        gridId: this.gridId,
        agoraUid: this.agoraUid,
        userId: this.userId,
        statusAgora: this.statusAgora,
        message:  "#updateMyInfo#"
      });
  }

  export class batonCam {
    constructor(canvasElement, videoElement) {
      this.videoElement = videoElement
      this.canvasElement = canvasElement;
      this.ctx = canvasElement.getContext("2d", { willReadFrequently: true });
      this.newCanvas = document.createElement('canvas');
      this.newCtx = this.newCanvas.getContext('2d');
      this.tmModel= null;
      this.tmTargetClass = 'wi320tiny';
      this.frames = [];
      this.intervalDuration = 1000;
      this.thresholdDistance = 10; // Threshold for steady position (holding for 1 second), in px value
      this.latestActiveTime =0;
      this.handLandmarker=undefined;
      this.lastVideoFrameTime =0;
      this.angleDegArray =[];
    }

    async initiateCamera(){
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
        
        const msg = "camera is on..."
        this.batonUI.messageBox(msg)
        this.batonUI.socketEvent("#messageBox#", msg);

      } catch (error) {
        console.log("#setUpVideo -Unable to access video stream:", error);
      }
    }

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
      console.log('3-handLandmarker ', this.handLandmarker)
    }
  
  async predictHand(){
    let startTimeMs = performance.now();
 //   if (this.videoElement.currentTime !== this.lastVideoFrameTime ) { //avoid double processing
  //    this.lastVideoFrameTime = this.videoElement.currentTime;
      const results = this.handLandmarker.detectForVideo(this.videoElement, startTimeMs);
      console.log('handLandmarker ', this.handLandmarker)
      console.log('results ', results)
      console.log('videoElement ', this.videoElement)
 //   }

    this.ctx.save();
    this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    console.log('ctx save')
    if (results.landmarks) {
      console.log('resultLand ',results.landmarks )
      for (const landmarks of results.landmarks) {
          drawConnectors(this.ctx, landmarks, HAND_CONNECTIONS, {
            color: "#00FF00",
            lineWidth: 1.5
          });
          drawLandmarks(this.ctx, landmarks, { color: "#FF0000", lineWidth: 0.4 });
          console.log(`index- ${landmarks[8]}`)
          // const pointAt = canvasLoc(landmarks[8],this.canvasElement.width ,this.canvasElement.height )
          // const tf = isTwoFingerPointing(landmarks);
          // console.log(`${tf} -now pointing at:${pointAt.x} ${pointAt.y}`);
      }
    }
    this.ctx.restore();

    window.requestAnimationFrame(this.predictHand.bind(this));

  }

  drawRect(location, scalar) {
      const offset = 10;
      const topLeft = location.topLeftCorner;
      const topRight = location.topRightCorner;
      const bottomLeft = location.bottomLeftCorner;
      const a = topRight.x - topLeft.x;
      const b = topRight.y - topLeft.y;
      const c = topLeft.y - bottomLeft.y;
      const d = bottomLeft.x - topLeft.x
      const bLX = topLeft.x - a * (scalar - 1) / 2;
      const bLY = topLeft.y - b * (scalar - 1) / 2;
      const bRX = topRight.x + a * (scalar - 1) / 2;
      const bRY = topRight.y + b * (scalar - 1) / 2;
      const tLX = bLX - d * scalar;
      const tLY = bLY + c * scalar;
      const tRX = bRX - d * scalar;
      const tRY = bRY + c * scalar;
      this.ctx.beginPath();
      this.ctx.moveTo(bLX-offset, bLY+offset); // Move to bottom left corner
      this.ctx.lineTo(bRX+offset, bRY+offset); // Draw line to bottom right corner
      this.ctx.lineTo(tRX+offset, tRY-offset); // Draw line to top right corner
      this.ctx.lineTo(tLX-offset, tLY-offset); // Draw line to top left corner
      this.ctx.closePath(); // Close the path
    
      this.ctx.strokeStyle = "#FF3B58";
      this.ctx.lineWidth = 4;
      this.ctx.stroke();
      const bL ={x: bLX, y:bLY}
      const bR ={x: bRX, y:bRY}
      const tL ={x: tLX, y:tLY}
      const tR = {x: tRX, y:tRY}
      const newLocation = {
        bottomLeft: bL,
        bottomRight: bR,
        topLeft: tL,
        topRight: tR,
      }
      return newLocation;
    }
    

    addFrame(newLoc) {
      const currentTime = Date.now();
      console.log('2-add frame/length ', this.frames.length )
      if (this.frames.length > 0) {
        const lastLoc = this.frames[this.frames.length - 1].topLeft;
        const distance = this.getDistance(newLoc, lastLoc);
        this.latestActiveTime = currentTime;
        let movement = '';
        if (distance < this.thresholdDistance) {
          movement = 's'; //static
        } else {
          movement = newLoc.x > lastLoc.x ? 'r' : 'l'; //right or left
        }
        this.frames.push({ topLeft: newLoc, distance: distance, movement: movement, timeStamp: currentTime });
      } else {
        this.frames.push({ topLeft: newLoc, distance: 0, movement: '', timeStamp: currentTime });
      }
    }
  
    hasEnoughFrame() {
      const currentTime = Date.now();
      while (this.frames.length > 0 && currentTime - this.frames[0].timeStamp >= this.intervalDuration) {
        this.frames.shift(); // Remove the earliest entry from the log
      }
      return this.frames.length > 0;
    }
  
    getDistance(point1, point2) {
      const dx = point2.x - point1.x;
      const dy = point2.y - point1.y;
      return Math.sqrt(dx * dx + dy * dy);
    }
  
    countFrames(movementType) {
      return this.frames.filter(frame => frame.movement === movementType).length;
    }
  
    // Utility function to determine the motion state of the QR marker
    motion(location) {
      const newLoc = location.topLeftCorner;
      this.addFrame(newLoc);
      let isStatic = false; //default return mode
      if (this.hasEnoughFrame()) {
        const totalCounts = this.frames.length;
        console.log('3-counts of Static ', this.countFrames('s'))
        if (this.countFrames('s') > totalCounts * 0.8) {
          isStatic = true;
        }
      }
      return isStatic;
    }
    isIdle() {
      const now = Date.now(); // Declare and initialize the 'now' variable with the current timestamp
      if (this.latestActiveTime > 0 && now - this.latestActiveTime >= this.intervalDuration * 5) {
        return true;
      } else {
        return false;
      }
    }
    
  }
