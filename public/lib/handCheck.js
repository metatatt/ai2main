export async function joinAgoraRoom() {

    const response = await fetch('/env', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId: this.userId })
    });
    
    const data = await response.json();
    this.agoraUid = await this.webRtc.join(data.APP_ID, data.CHANNEL, data.TOKEN, null);
    console.log('** agorUID ',this.agoraUid)
    this.gridId = data.GRIDID;
    console.log('** agridId ',this.gridId)
    const cameraOptions = {
      facingMode: "environment",
      videoProfile: "1080p_2" 
    };
    this.localTrack = await AgoraRTC.createCameraVideoTrack(cameraOptions);
    console.log('** localTrack ',this.localTrack)

      // Set the audioEnabled option to false to prevent microphone access
    const microphoneOptions = {
      microphoneId: '', // Set the appropriate microphone ID if needed
      audioEnabled: false
    };
    this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack(microphoneOptions);
    console.log('** localAudioTrack ', this.localAudioTrack);
    
    this.statusAgora = "mute";
      this.socket.emit('sessionMessage', {
        gridId: this.gridId,
        userId: this.userId,
        message:  "#updateMyInfo#"
      });
  }

  export class handCheck {
    constructor(canvasElement, videoElement) {
      this.videoElement = videoElement;
      this.canvasElement = canvasElement;
      this.ctx = canvasElement.getContext("2d", { willReadFrequently: true });
      this.angleDeg = 8;  // Threshold angle degree spray for act of "two-finger gesture"
      this.latestActiveTime =0;
      this.markerList=[];
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
        this.handUI.messageBox(msg)
        this.handUI.socketEvent("#messageBox#", msg);

      } catch (error) {
        console.log("#setUpVideo -Unable to access video stream:", error);
      }
    }

detectGesture(landmarks) {
      const p5 = landmarks[5];
      const p8 = landmarks[8];
      const p9 = landmarks[9];
      const p12 = landmarks[12];
      const p4 = landmarks[4];
      const p16 = landmarks[16];
    
      // Calculate vectors A and B
      const vectorA = { x: p8.x - p5.x, y: p8.y - p5.y }; // index finger
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
      const orienRotate = Math.atan2(deltaY, deltaX); // usage newCtx.rotate(orienRotate)
    
      // Calculate the distance between p4-p8 and p4-p16
      const dist48 = Math.sqrt((p4.x - p8.x) ** 2 + (p4.y - p8.y) ** 2);
      const dist416 = Math.sqrt((p4.x - p16.x) ** 2 + (p4.y - p16.y) ** 2);
    
      const ifDeg = angleDeg <= this.angleDeg; // assuming you have 'this.angleDeg' defined elsewhere
      const ifHoldPalm = dist416 < dist48;
    
      const marker = {
        detected: ifDeg && ifHoldPalm,
        p5: p5,
        p8: p8,
        orienRotate: orienRotate,
      };
      this.markerList.push(marker)
      let twoFingerDetected = false;
      if (this.markerList.length > 4) {
        this.markerList.shift(); // Remove the first element to keep the array size to 4
        twoFingerDetected = this.markerList.every(marker => marker.detected);
      }
      return twoFingerDetected
    }
    

snapShotLoc(canvasWidth, canvasHeight) {
      const marker = this.markerList[this.markerList.length-1]
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
        x: (p5.x + p8.x) /2+normalizedDirection.x*112,
        y: (p5.y + p8.y) /2+normalizedDirection.y*112
      };
    
      // Calculate the corner coordinates
      const cornerTL = {
        x: (midBottom.x - (perpendicularVector.x * (squareSideLength))/2),
        y: (midBottom.y - (perpendicularVector.y * squareSideLength) /2)
      };
      const cornerTR = {
        x: midBottom.x + (perpendicularVector.x * squareSideLength) /2,
        y: midBottom.y + (perpendicularVector.y * squareSideLength) /2
      };
      const cornerBL = {
        x: cornerTL.x + normalizedDirection.x * squareSideLength,
        y: cornerTL.y + normalizedDirection.y * squareSideLength
      };
      const cornerBR = {
        x: cornerTR.x + normalizedDirection.x * squareSideLength,
        y: cornerTR.y + normalizedDirection.y * squareSideLength
      };
    const boxLoc = {
      locTL: cornerTL,
      locTR: cornerTR,
      locBL: cornerBL,
      locBR: cornerBR,
    }
    return boxLoc
  }

makeSnapShot(boxLoc) {
   
    const { locTL, locTR, locBL, locBR } = boxLoc;

    // Calculate the width and height of the square
    const width = Math.sqrt((locTL.x - locTR.x) ** 2 + (locTL.y - locTR.y) ** 2);
    const height = width;

    // Calculate the center point of the square
    const centerX = (locTL.x + locTR.x + locBL.x + locBR.x) / 4;
    const centerY = (locTL.y + locTR.y + locBL.y + locBR.y) / 4;
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

    // Get the ImageData object from the canvas = image Unit8Data 
    newCtx.getImageData(0, 0, width, height);
    const imageBlobPromise = new Promise(resolve => {
      newCanvas.toBlob(blob => {
        resolve(blob);
      }, 'image/png'); // Change to 'image/jpeg' if needed
    });
    return imageBlobPromise;
    }


  async checkType(imageBlob) {
        // Create an image element and load the imageBlob
        const resultImage = new Image();
        resultImage.src = URL.createObjectURL(imageBlob);
 
        // Wait for the image to load
        await new Promise(resolve => {
          resultImage.onload = resolve;
        });
        const width = resultImage.width;
        const height = resultImage.height;
    
        // Create a canvas and draw the loaded image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(resultImage, 0, 0, width, height);
    
        // Get the image data from the canvas
        const imageData = ctx.getImageData(0, 0, width, height);
        
        // Decode QR code using jsQR
        const qrCode = jsQR(imageData.data, width, height, {
          inversionAttempts: 'dontInvert',
        });
        var resultPayload = {
          type: 'target',
          id: '',
        }
        if (qrCode && qrCode.data.startsWith('@pr-')) {
          const cardData = qrCode.data
          resultPayload = {
            type: 'code',
            id: cardData.slice(4, 9)
          }
          console.log("resultPayload **",resultPayload)
          return resultPayload
        } 
    }
    

}
