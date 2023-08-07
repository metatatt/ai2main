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
      this.angleDeg = 8;  // Threshold angle spray for act of "aiming"
      this.latestActiveTime =0;
      this.handLandmarker=undefined;
      this.fingersMatrices =[];
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
    }
  
  async predictHand(){
    let startTimeMs = performance.now();
    const results = this.handLandmarker.detectForVideo(this.videoElement, startTimeMs);

    this.ctx.save();
    this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    if (results.landmarks) {
      for (const landmarks of results.landmarks) {
          drawConnectors(this.ctx, landmarks, HAND_CONNECTIONS, {
            color: "#00FF00",
            lineWidth: 1.5
          });
          drawLandmarks(this.ctx, landmarks, { color: "#FF0000", lineWidth: 0.4 });
          console.log(`index- ${landmarks[8]}`)
          const isAiming = this.isAiming(landmarks)
          console.log(`aiming- ${isAiming}`)
          if (isAiming){
            const latestMatrix = this.fingersMatrices[this.fingersMatrices.length-1];
            const zoneLT = latestMatrix.zoneLT;// Corrected the syntax and usage
            const zoneLB = latestMatrix.zoneLB; // Corrected the syntax and usage
            const zoneRT = latestMatrix.zoneRT; // Corrected the syntax and usage
            const zoneRB = latestMatrix.zoneRB; // Corrected the syntax and usage

            console.log(`这里 -now pointing at:${zoneLT.x} ${zoneLT.y}`);
          };
          
        
      }
    }
    this.ctx.restore();

    window.requestAnimationFrame(this.predictHand.bind(this));

  }

averageXY(coordinatesArray) {
    if (coordinatesArray.length === 0) {
        return { x: 0, y: 0 }; // Default to (0, 0) if the array is empty
    }
    
    const sumX = coordinatesArray.reduce((sum, coord) => sum + coord.x, 0);
    const sumY = coordinatesArray.reduce((sum, coord) => sum + coord.y, 0);
    
    const averageX = sumX / coordinatesArray.length;
    const averageY = sumY / coordinatesArray.length;
    
    return { x: averageX, y: averageY };
}

  
  aimedZone(landmarks,canvasWidth,canvasHeight, sideLength){
    const canvasX = landmarks.x*canvasWidth
    const canvasY = landmarks.y*canvasHeight
    return ({x: canvasX, y: canvasY})
  }
  isAiming(landmarks){
    const matrix = this.fingersMatrix(landmarks);
    console.log('matrix added ',matrix)
    this.fingersMatrices.push(matrix); 
    if (this.fingersMatrices.length > 4) {
      this.fingersMatrices.shift(); // Remove the first element to keep the array size to 4
    } 
    const aimingCounts = this.fingersMatrices.filter(matrix => matrix.isFingersClosed).length; // Added missing filtering and length calculation
    return aimingCounts >= 4; // confirm as aiming when closing in index and middle fingers 
  }

fingersMatrix(landmarks) {
    const p5 = landmarks[5];
    const p8 = landmarks[8];
    const p9 = landmarks[9];
    const p12 = landmarks[12];
  
    // Calculate vectors A and B
    const vectorA = { x: p8.x - p5.x, y: p8.y - p5.y }; //index finger
    const vectorB = { x: p12.x - p9.x, y: p12.y - p9.y }; // middle finger
  
    // Calculate the angle spray between vectors A and B
    const dotProduct = vectorA.x * vectorB.x + vectorA.y * vectorB.y;
    const magnitudeA = Math.sqrt(vectorA.x * vectorA.x + vectorA.y * vectorA.y);
    const magnitudeB = Math.sqrt(vectorB.x * vectorB.x + vectorB.y * vectorB.y);
    const cosAngle = dotProduct / (magnitudeA * magnitudeB);
    const angleRad = Math.acos(cosAngle);
    const angleDeg = (angleRad * 180) / Math.PI;

    // Calculate location of pCenter, the virtual center for the target zone
    const extendedVectorA = { x: p8.x + vectorA.x, y: p8.y + vectorA.y };
    const scaleFactor = 50 / Math.sqrt(vectorA.x * vectorA.x + vectorA.y * vectorA.y);
    const pCenter = { x: extendedVectorA.x + vectorA.x * scaleFactor, y: extendedVectorA.y + vectorA.y * scaleFactor };

    // Calculate orientation of pSquare, the zone
    const orientationVector = vectorA;

    // Calculate the four corners of pSquare
    const squareSize = 100; // Change this to your desired square size
    const halfSquareSize = squareSize / 2;
    const locLT = { x: pCenter.x - halfSquareSize, y: pCenter.y - halfSquareSize };
    const locRT = { x: pCenter.x + halfSquareSize, y: pCenter.y - halfSquareSize };
    const locRB = { x: pCenter.x + halfSquareSize, y: pCenter.y + halfSquareSize };
    const locLB = { x: pCenter.x - halfSquareSize, y: pCenter.y + halfSquareSize };
    console.log('-isClosed ', angleDeg <= this.angleDeg)
    return { isFingersClosed: angleDeg <= this.angleDeg, zoneLT: locLT, zoneRT: locRT, zoneRB: locRB, zoneLB: locLB };
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
