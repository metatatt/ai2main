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
      this.landMarkers =[];
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
    this.ctx.clearRect(0, 0, vWidth, vHeight);
    if (results.landmarks) {
      for (const landmarks of results.landmarks) {
          drawConnectors(this.ctx, landmarks, HAND_CONNECTIONS, {
            color: "#00FF00",
            lineWidth: 1.5
          });
          drawLandmarks(this.ctx, landmarks, { color: "#FF0000", lineWidth: 0.4 });
          const marker = this.decodeLandmarks(landmarks)
          this.landMarkers.push(marker); 
          let isAiming = false
          if (this.landMarkers.length > 4) {
            this.landMarkers.shift(); // Remove the first element to keep the array size to 4
            isAiming = this.landMarkers.every(marker => marker.isFingersClosed);
          }
          if (isAiming){
            const latestMarker = this.landMarkers[this.landMarkers.length-1];
            const boxLoc = this.virtualBoxLoc(latestMarker,vWidth,vHeight)
            this.captureMarkerVideo(boxLoc)
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
  decodeLandmarks(landmarks){
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

    // Calculate the orientation per p5 - p8
    const deltaX = p5.x - p8.x;
    const deltaY = p5.y - p8.y;
    const orienRotate = Math.atan2(deltaY, deltaX); //usage newCtx.rotate(orienRotate)
    const angle_degrees = orienRotate * (180 / Math.PI);
    const info1 = document.querySelector('.text-header1');
    info1.innerHTML=`orient ${orienRotate} angle ${angle_degrees} `
    return { isFingersClosed: angleDeg <= this.angleDeg, p5: p5, p8 : p8, orienRotate: orienRotate};
}

  virtualBoxLoc(marker, canvasWidth, canvasHeight) {
      const p5 = marker.p5;
      const p8 = marker.p8;
      p5.x = p5.x * canvasWidth;
      p8.x = p8.x * canvasWidth;
      p5.y = p5.y * canvasHeight;
      p8.y = p8.y * canvasHeight;
      const squareSideLength = 224;
    
      // Calculate the direction from p5 to p8
      const vectorDirection = { x: p8.x - p5.x, y: p8.y - p5.y };
      const magnitude = Math.sqrt(vectorDirection.x * vectorDirection.x + vectorDirection.y * vectorDirection.y);
      const normalizedDirection = { x: vectorDirection.x / magnitude, y: vectorDirection.y / magnitude };
    
      // Calculate the perpendicular vector to the normalized direction
      const perpendicularVector = { x: -normalizedDirection.y, y: normalizedDirection.x };
    
      // Calculate the midpoint of the bottom edge line
      const midBottom = {
        x: (p5.x + p8.x) / 2,
        y: (p5.y + p8.y) / 2
      };
    
      // Calculate the corner coordinates
      const cornerTL = {
        x: midBottom.x - (perpendicularVector.x * squareSideLength) / 2,
        y: midBottom.y - (perpendicularVector.y * squareSideLength) / 2
      };
      const cornerTR = {
        x: midBottom.x + (perpendicularVector.x * squareSideLength) / 2,
        y: midBottom.y + (perpendicularVector.y * squareSideLength) / 2
      };
      const cornerBL = {
        x: cornerTL.x + normalizedDirection.x * squareSideLength,
        y: cornerTL.y + normalizedDirection.y * squareSideLength
      };
      const cornerBR = {
        x: cornerTR.x + normalizedDirection.x * squareSideLength,
        y: cornerTR.y + normalizedDirection.y * squareSideLength
      };

    
    const info1 = document.querySelector('.text-header1');
    info1.innerHTML=`BL-${Math.floor(cornerBL.x)}|${Math.floor(cornerBL.y)}, P8-${p8.x}|${p8.y}} ` 
    const boxLoc = {
      locTL: cornerTL,
      locTR: cornerTR,
      locBL: cornerBL,
      locBR: cornerBR,
    }
    return boxLoc
  }

captureMarkerVideo(boxLoc) {
    const { locTL, locTR, locBL, locBR } = boxLoc;

    // Calculate the width and height of the square
    const width = Math.sqrt((locTL.x - locTR.x) ** 2 + (locTL.y - locTR.y) ** 2);
    const height = width;

    // Calculate the center point of the square
    const centerX = (locTL.x + locTR.x + locBL.x + locBR.x) / 4;
    const centerY = (locBL.y + locBR.y) / 2;
    const newCanvas = document.createElement('canvas');
    newCanvas.width = width
    newCanvas.height = width
    const newCtx =  newCanvas.getContext('2d');
    newCtx.clearRect(0, 0, width, width);
    const angle = -Math.atan2(-locTL.y + locTR.y, -locTL.x + locTR.x)

    // Rotate and draw the square
    newCtx.translate(width / 2, height / 2);
    newCtx.rotate(angle);
    newCtx.drawImage(this.videoElement, -centerX, -centerY);

    // Get the ImageData object from the canvas
    const imageData = newCtx.getImageData(0, 0, width, height);

    const timestamp = Date.now();
    const filename = `img${timestamp}.png`;

    const downloadLink = document.createElement('a');
    downloadLink.href = newCanvas.toDataURL('image/png');
    downloadLink.download = filename; // Set the filename
    downloadLink.click();    

  // return imageData;
}



  }
