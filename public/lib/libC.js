  export class batonCam {
    constructor(canvasElement) {
      this.canvasElement = canvasElement;
      this.ctx = this.canvasElement.getContext("2d", { willReadFrequently: true });
  
      this.newCanvas = document.createElement('canvas');
      this.newCtx = this.newCanvas.getContext('2d');
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
      this.ctx.moveTo(bLX, bLY); // Move to bottom left corner
      this.ctx.lineTo(bRX, bRY); // Draw line to bottom right corner
      this.ctx.lineTo(tRX, tRY); // Draw line to top right corner
      this.ctx.lineTo(tLX, tLY); // Draw line to top left corner
      this.ctx.closePath(); // Close the path
    
      this.ctx.strokeStyle = "#FF3B58";
      this.ctx.lineWidth = 4;
      this.ctx.stroke();
    }
    

  }
  
export function populateFindings(header, results) {
    console.log('in Findings-results', results);
    const auditData0 = results[0].audit; // Parse the JSON string into an object
    const auditData1 = results[1].audit; 
    const findingsDOM = `
      <div class="container slide">
        <div class="CSSgal">
        <div id="s1" class="play-sequence"></div>
        <div id="s2" class="play-sequence"></div>
        <div id="s3" class="play-sequence"></div>
        <div id="s4" class="play-sequence"></div>
        
          <div class="slider">
            <div style="background:#5b8;">
              <h2>${header.header1}: Visual Inspection Summary</h2>
              <br>
              <br>
              <p> based on a total of ${results.length} Examined Visual(s)<br></p>
              <p>- The Visual is Identified as ${auditData0.tag} Compliant.<br></p>
              <p>- With a Confidence Level of ${auditData0.probability}%<br><br><br></p>
              <p>- The perspective Dataset size is: ${header.header2}</p>      
            </div>
            <div style="background:#85b; position: relative;">
              <h2>Examined Visual #1 of ${results.length}</h2>
              <p>-marker map for ${auditData0.tag} (${auditData0.probability} confidence)<br></p>
              <br>
            </div>
            <div style="background:#e95; position: relative;">
              <h2>Examined Visual #2 of ${results.length}</h2>
              <p>-marker map for ${auditData1.tag} (${auditData1.probability} confidence)<br></p>
              <br>
            </div>
            <div style="background:#e59;">
              <h2>About this Inspection....</h2>
              <p>-1) need to write something here...<br></p>
              <p>-2) here too...<br></p>
            </div>
          </div>

          <div class="prevNext">
            <div><a href="#s4"></a><a href="#s2"></a></div>
            <div><a href="#s1"></a><a href="#s3"></a></div>
            <div><a href="#s2"></a><a href="#s4"></a></div>
            <div><a href="#s3"></a><a href="#s1"></a></div>
          </div>
          <div class="bullets">
            <a href="#s1">1</a>
            <a href="#s2">2</a>
            <a href="#s3">3</a>
            <a href="#s4">4</a>
          </div>

        </div>
      </div>
    `;
    return findingsDOM
  }


  