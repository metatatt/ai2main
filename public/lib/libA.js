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
      this.ctx = this.canvasElement.getContext("2d", { willReadFrequently: true });
      this.targetsArray = null;
      this.newCanvas = document.createElement('canvas');
      this.newCtx = this.newCanvas.getContext('2d');
    }

    reset(scanImageArray){
      this.scanArray = scanImageArray
      this.targetsArray = null;
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
   
    drawSquare(location) {
      console.log("here drawSquare");
      const topLeft = location.topLeftCorner;
      const topRight = location.topRightCorner;
      const xOffset = topLeft.x - location.bottomLeftCorner.x;
      const yOffset = topLeft.y - location.bottomLeftCorner.y;
    
      const newTopLeftX = topLeft.x + xOffset
      const newTopLeftY= topLeft.y + yOffset
      const newTopRightX = topRight.x + xOffset
      const newTopRightY = topRight.y + yOffset

      console.log("Top Left:", topLeft);
      console.log("Top Right:", topRight);
      console.log("New Top Left:", newTopLeftX, newTopLeftY);
      console.log("New Top Right:", newTopRightX, newTopRightY);
    
      this.ctx.beginPath();
      this.ctx.moveTo(topLeft.x, topLeft.y);
      this.ctx.lineTo(newTopLeftX, newTopLeftY);
      this.ctx.lineTo(newTopRightX, newTopRightY);
      this.ctx.lineTo(topRight.x, topRight.y);
      this.ctx.lineTo(topLeft.x, topLeft.y);
    
      // Set the line width and stroke style for the square.
      this.ctx.lineWidth = 4;
      this.ctx.strokeStyle = "#FF3B58";
    
      // Draw the square with the specified line width and stroke style.
      this.ctx.stroke();
    }
    
    drawCircle(location, radius) {
      console.log("here drawBiggerSquare");
    
      const topLeft = location.topLeftCorner;
      const topRight = location.topRightCorner;
      const midPointX = (topLeft.x + topRight.x) / 2;
      const midPointY = (topLeft.y + topRight.y) / 2;
      const xOffset = topLeft.x - location.bottomLeftCorner.x;
      const yOffset = topLeft.y - location.bottomLeftCorner.y;
      const newCenterX = midPointX+xOffset*2
      const newCenterY = midPointY+yOffset*2
      console.log("New Center 1:", newCenterX, newCenterY);
      console.log("Radius:", radius);
    
      this.ctx.beginPath();
      this.ctx.arc(newCenterX, newCenterY, radius, 0, 2 * Math.PI);
      this.ctx.strokeStyle = "#FF3B58";
      this.ctx.lineWidth = 4;
      this.ctx.stroke();
      this.makeClip(newCenterX, newCenterY,radius)
    }
  
    makeClip(newCenterX,newCenterY,radius){
      this.newCanvas.width = 2*radius;
      this.newCanvas.height = 2*radius;
      this.newCtx.beginPath()
      this.newCtx.arc(radius, radius, radius, 0, 2 * Math.PI);
      this.newCtx.closePath()
      this.newCtx.clip()
      const offsetX = newCenterX - radius;
      const offsetY = newCenterY - radius;
      this.newCtx.drawImage(this.canvasElement, offsetX, offsetY, 2 * radius, 2 * radius, 0, 0, 2 * radius, 2 * radius);
      const dataURL = this.newCanvas.toDataURL('image/png');
      const link = document.createElement('a');
            link.href = dataURL;
            link.download = 'makeClipA.png';
            link.click();
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
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillStyle = "#FF3B58";
      this.ctx.font = "20px Arial";
      this.ctx.fillText("scanArray Length: " + this.scanArray.length, tLX+10, tLY+20);
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
      return this.saveRect(newLocation)
    }
    
  saveRect(location) {
      const { bottomLeft, bottomRight, topLeft, topRight } = location;
    
      // Calculate the width and height of the square
      const width = Math.sqrt((topLeft.x - topRight.x) ** 2 + (topLeft.y - topRight.y) ** 2);
      const height = Math.sqrt((topLeft.x - bottomLeft.x) ** 2 + (topLeft.y - bottomLeft.y) ** 2);
    
      // Calculate the center point of the square
      const centerX = (topLeft.x + topRight.x + bottomLeft.x + bottomRight.x) / 4;
      const centerY = (topLeft.y + topRight.y + bottomLeft.y + bottomRight.y) / 4;
      this.newCtx.clearRect(0, 0, this.newCanvas.width, this.newCanvas.height);

      // Clear the canvas and set its dimensions
      // this.newCtx.clearRect(0, 0, this.newCanvas.width, this.newCanvas.height);
      this.newCanvas.width = width;
      this.newCanvas.height = height;
      const angle = -Math.atan2(-topLeft.y + topRight.y, -topLeft.x + topRight.x)

      // Rotate and draw the square
        this.newCtx.translate(width / 2, height / 2);
        this.newCtx.rotate(angle);
        this.newCtx.drawImage(this.canvasElement, -centerX, -centerY);
    
      // Get the ImageData object from the canvas
      const imageData = this.newCtx.getImageData(0, 0, width, height);
      // Return the ImageData object directly
      return imageData;
    }

  updateArray(clippedImage, location, timeStamp ){
  if (this.scanArray.length >= 50) {
    this.scanArray.shift(); // Remove the oldest element (first element)
  }
  this.scanArray.push({clippedImage, location, timeStamp})
  }
  
  hasTargets() {
    const array = this.scanArray
    this.targetsArray = this.findLeastVariance(array, 5);
    const elapseOnset = performance.now() - (array?.[0]?.timeStamp ?? performance.now());
    const elapseLatest = performance.now() - (array?.[array.length-1]?.timeStamp ?? performance.now());
    return this.targetsArray.length > 0 && elapseOnset > 2000 && elapseLatest > 1000 ;
  }
  

    calculateVariance(arr) {
      const sum = arr.reduce((acc, val) => acc + val, 0);
      const mean = sum / arr.length;
      const variance = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / arr.length;
      return variance;
    }
    
    findLeastVariance(scanArray, n) {
      if (n <= 0 || n > scanArray.length) {
        return [];
      }
      console.log('scanArray ', scanArray)
    
      let minVariance = Infinity;
      let result = [];
    
      for (let i = 0; i <= scanArray.length - n; i++) {
        const subArray = scanArray.slice(i, i + n);
        const combinedArray = subArray.flatMap(item => [item.location.topLeftCorner.x, item.location.bottomRightCorner.x]);
        const variance = this.calculateVariance(combinedArray);
        if (variance < minVariance) {
          minVariance = variance;
          result = subArray;
        }
      }
      return result;
    }

    extractTargets(){
      // Return the value of this.targetsArray
      console.log('this Targets: ', this.targetsArray)
      return this.targetsArray;
    }
    
  }
