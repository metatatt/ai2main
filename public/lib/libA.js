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
      this.videoElement = videoElement;
      this.canvasElement = canvasElement;
      this.ctx = canvasElement.getContext("2d", { willReadFrequently: true });

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
    const vWidth = this.videoElement.videoWidth
    const vHeight = this.videoElement.videoHeight
    this.canvasElement.width=vWidth
    this.canvasElement.height=vHeight
    let startTimeMs = performance.now();
    const results = this.handLandmarker.detectForVideo(this.videoElement, startTimeMs);

    this.ctx.save();
    this.ctx.clearRect(0, 0, this.videoWidth, this.videoHeight);
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
            const imageData = this.captureZoneVideo(zoneLT,zoneRT,zoneRB,zoneLB)
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
    let locLT = { x: pCenter.x - halfSquareSize, y: pCenter.y - halfSquareSize };
    let locRT = { x: pCenter.x + halfSquareSize, y: pCenter.y - halfSquareSize };
    let locRB = { x: pCenter.x + halfSquareSize, y: pCenter.y + halfSquareSize };
    let locLB = { x: pCenter.x - halfSquareSize, y: pCenter.y + halfSquareSize };

    //convert to actuals
    locLT = { x: locLT.x*this.videoWidth, y: locLT.y*this.videoHeight }
    locRT = { x: locRT.x*this.videoWidth, y: locRT.y*this.videoHeight }
    locRB = { x: locRB.x*this.videoWidth, y: locRB.y*this.videoHeight }
    locLB = { x: locLB.x*this.videoWidth, y: locLB.y*this.videoHeight }

    return { isFingersClosed: angleDeg <= this.angleDeg, zoneLT: locLT, zoneRT: locRT, zoneRB: locRB, zoneLB: locLB };
}


    
  captureZoneVideo(topLeft, topRight, bottomRight, bottomLeft) {
      const width = Math.sqrt((topLeft.x - topRight.x) ** 2 + (topLeft.y - topRight.y) ** 2);
      const height = Math.sqrt((topLeft.x - bottomLeft.x) ** 2 + (topLeft.y - bottomLeft.y) ** 2);
    
      const centerX = (topLeft.x + topRight.x + bottomLeft.x + bottomRight.x) / 4;
      const centerY = (topLeft.y + topRight.y + bottomLeft.y + bottomRight.y) / 4;
      const newCanvas = document.createElement('canvas');
      newCanvas.width = width;
      newCanvas.height = height;
      const newCtx =  newCanvas.getContext('2d');
      
      newCtx.clearRect(0, 0, newCanvas.width, newCanvas.height);
      const angle = -Math.atan2(-topLeft.y + topRight.y, -topLeft.x + topRight.x);    
      newCtx.translate(width / 2, height / 2);
      newCtx.rotate(angle);
      console.log(`CenterXY: ${-centerX}, ${-centerY}`)
      newCtx.drawImage(this.videoElement, -centerX, -centerY);
    
      const imageData = newCtx.getImageData(0, 0, width, height);
    
      const newImageElement = document.createElement('img');
      newImageElement.src = newCanvas.toDataURL('image/png');
    
      // Add it to the page (optional, for visual validation)
      document.body.appendChild(newImageElement);

      // Generate a dynamic filename based on the current timestamp
      const timestamp = Date.now();
      const filename = `img${timestamp}.png`;
      const filename2 = `im2${timestamp}.png`;

      const downloadLink = document.createElement('a');
      downloadLink.href = newCanvas.toDataURL('image/png');
      downloadLink.download = filename; // Set the filename
      downloadLink.click();
    
      // Add console.log statements for debugging
      // console.log('Width:', width);
      // console.log('Height:', height);
      // console.log('CenterX:', centerX);
      // console.log('CenterY:', centerY);
      // console.log('Angle:', angle);
      // console.log('Image Data:', imageData);
    
      return imageData;
    }
    


  }
