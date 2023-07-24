  export class batonCam {
    constructor(canvasElement) {
      this.canvasElement = canvasElement;
      this.ctx = canvasElement.getContext("2d", { willReadFrequently: true });
    }
  
    angleXAxis(location) {
      const topLeft = location.topLeftCorner;
      const topRight = location.topRightCorner;
      const atan2Value =  Math.atan2(topRight.y - topLeft.y, topRight.x - topLeft.x);
      console.log(`ATAN2: ${atan2Value}`)
      return atan2Value
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
      console.log("New Center:", newCenterX, newCenterY);
      console.log("Radius:", radius);
    
      this.ctx.beginPath();
      this.ctx.arc(newCenterX, newCenterY, radius, 0, 2 * Math.PI);
      this.ctx.strokeStyle = "#FF3B58";
      this.ctx.lineWidth = 4;
      this.ctx.stroke();
    }
    
    
  
    captureToFile(location, radius, offset) {
      const circleCenterX = location.topLeftCorner.X + Math.cos(this.angleXAxis(location)) * offset;
      const circleCenterY = location.topLeftCorner.Y + Math.sin(this.angleXAxis(location)) * offset;
      this.ctx.beginPath();
      this.ctx.arc(circleCenterX, circleCenterY, radius, 0, 2 * Math.PI);
      this.ctx.clip();
      this.ctx.drawImage(this.canvas, 0, 0, this.canvas.width, this.canvas.height, 0, 0, this.canvas.width, this.canvas.height);
  
      // Create a new canvas to save the circle clip
      const saveCanvas = document.createElement("canvas");
      saveCanvas.width = 2 * radius;
      saveCanvas.height = 2 * radius;
      const saveCtx = saveCanvas.getContext("2d");
      saveCtx.drawImage(this.canvas, circleCenterX - radius, circleCenterY - radius, 2 * radius, 2 * radius, 0, 0, 2 * radius, 2 * radius);
  
      // Convert the canvas to an image and save it to file
      const imgData = saveCanvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
      const fs = require("fs");
      const path = "./img/pix001.png"; // Change the path and filename as needed
      fs.writeFileSync(path, imgData, "base64");
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


  