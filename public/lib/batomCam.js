export class batonMotion {
    constructor() {
      this.frames = [];
      this.intervalDuration = 1000;
      this.thresholdDistance = 50; // Threshold for steady position (holding for 1 second), in px value
    }
  
    addFrame(newLoc) {
      const currentTime = Date.now();
      if (this.frames.length > 0) {
        const lastLoc = this.frames[this.frames.length - 1].topLeft;
        const distance = this.getDistance(newLoc, lastLoc);
        let movement = '';
        if (distance < this.thresholdDistance) {
          movement = 's'; //static
        } else {
          movement = newLoc.x > lastLoc.x ? 'r' : 'l'; //right or left
        }
        this.frames.push({ topLeft: newLoc, distance: distance, movement: movement, timestamp: currentTime });
      } else {
        this.frames.push({ topLeft: newLoc, distance: 0, movement: '', timestamp: currentTime });
      }
    }
  
    hasEnoughFrame() {
      const currentTime = Date.now();
      while (this.frames.length > 0 && currentTime - this.frames[0].timestamp >= this.intervalDuration) {
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
      let mode = 'other'; //default return mode
  
      if (this.hasEnoughFrame()) {
        const totalCounts = this.frames.length;
        const counts = this.countFrames('s', 'r', 'l');
  
        if (counts.moveStay > totalCounts * 0.8) {
          mode = 'static';
        }
  
        if (counts.moveLeft > totalCounts * 0.4 && counts.moveRight > totalCounts * 0.4) {
          mode = 'swing';
        }
      }
      return mode;
    }
  }
  