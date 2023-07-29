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

  export class batonUI {
    constructor(role, gridId, socket){
      this.role = role,
      this.gridId = gridId,
      this.socket = socket
    }

  graphicsBox(iconSelection, parentId) {
    const parent = document.querySelector(`#${parentId}`);
    const overlay = parent.querySelector('.overlay'); // Fetch the .overlay container
    const graphicsContainer = document.querySelector('.graphics-box');
    let imgSrc = "";
    if (iconSelection === "t") {
      imgSrc = "./img/b&plogo.svg";
    } else if (iconSelection === "r") {
      imgSrc = "./img/i-camera.svg";
    } else {
      imgSrc = "./img/scanSignBlue380Ani.gif";
    }
    const icon = document.createElement('img');
    icon.src = imgSrc;
    icon.classList.add('animation');
  
    // Remove any existing content inside graphicsContainer
    graphicsContainer.innerHTML = '';
    
    // Append the icon to graphicsContainer
    graphicsContainer.appendChild(icon);
    return new Promise((resolve) => {
      resolve();
    });
    }

    messageBox(message) {
      const info1 = document.querySelector('.text-header1');
      const info2 = document.querySelector('.text-header2');
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
      });
      info2.innerHTML = currentDate;
      info1.innerHTML = message;
    }

    socketEvent(msgClass, msg){
      this.socket.emit('sessionMessage', {
        role: this.role,
        gridId: this.gridId,
        messageClass: msgClass,
        message: msg
      });
    }

}
  
  

export function populateLayout() {
  const videoElement=document.getElementById('video')
  const animation = document.querySelector('.animation');
  const slideElement = document.querySelector('.slide')


  function slide() {
    videoElement.style.display = "none";
    slideElement.style.display = "block";

    if (animation) {
      animation.style.display = 'none';
    }
  }

  function scan() {
    videoElement.style.display = "block";
    slideElement.style.display = "none";
    if (animation) {
      animation.style.display = 'block';
    }
  }

  function report(){
    videoElement.style.display = "none";
    slideElement.style.display = "block";
    if (animation) {
      animation.style.display = 'none';
    }

  }

  return {
    slide,
    scan,
    report
  };
}

export function populatePage(factorValue) {
  
  return new Promise((resolve, reject) => {
  if (!document.querySelector('.overlay')){
    const overlay = document.createElement('div')
    document.body.appendChild(overlay)
  }
        // Set the --factor variable dynamically
   document.documentElement.style.setProperty('--factor', factorValue);

    const overlay = document.querySelector('.overlay');
    const elementDOMS = `
      <nav>
        <img src="./img/Baton-Icon-Blue.svg" width="100px" height="100px" alt="logo">
        <ul>
            <li id="share-btn">
              <img src="https://i.postimg.cc/JnggC78Q/video.png">
            </li>
            <li id="scan-btn">
              <img src="./img/i-checked.svg">
            </li>
            <li id="slide-btn">
              <img src="https://i.postimg.cc/vmb3JgVy/message.png">
            </li>
            <li>
              <img src="https://i.postimg.cc/k4DZH604/users.png">
            </li>
            <li>
              <img src="https://i.postimg.cc/v84Fqkyz/setting.png">
            </li>
        </ul>
      </nav>
      <div class="message-box">
          <div class="text-header1">--</div>
          <img src="./img/Baton-Icon-Blue.svg">
          <div class="text-header2"></div>
      </div>
      <div class="graphics-box">
      </div>
      <div class="slide" style="display: none">
      </div>
    `;

    overlay.innerHTML = elementDOMS;

    document.getElementById('share-btn').addEventListener('click', this.shareCamera);
    document.getElementById('scan-btn').addEventListener('click', this.startScanning);
    document.getElementById('slide-btn').addEventListener('click', this.viewFindings);
  
    // Check if the content is successfully rendered and resolve the Promise
    if (overlay.innerHTML === elementDOMS) {
      resolve();
    } else {
      reject(new Error('Failed to render content.'));
    }
  });
}

export function populatePageConsole(factorValue,gridId) {
  
  return new Promise((resolve, reject) => {
  if (!document.querySelector('.overlay')){
    const video = document.getElementById(gridId)
    console.log('overlay setConsoleOverlay ', video) 
    const overlay = document.createElement('div')
    video.appendChild(overlay)
  }
        // Set the --factor variable dynamically
   document.documentElement.style.setProperty('--factor', factorValue);

     // Using querySelector to find the element with id="grid-2"
   const videoGridEle = document.querySelector('#grid-2');

  // Then, using querySelector on the gridElement to find the .overlay element within it
  const overlay = videoGridEle.querySelector('.overlay');

    const elementDOMS = `
      <nav>
        <ul>
            <li id="share-btn">
              <img src="https://i.postimg.cc/JnggC78Q/video.png">
            </li>
            <li id="scan-btn">
              <img src="./img/i-checked.svg">
            </li>
            <li id="slide-btn">
              <img src="https://i.postimg.cc/vmb3JgVy/message.png">
            </li>
        </ul>
      </nav>
      <div class="message-box" style="position: absolute; margin-left: 10%;">
          <div class="text-header1">--</div>
          <img src="./img/Baton-Icon-Blue.svg">
          <div class="text-header2"></div>
      </div>
      <div class="graphics-box" style="position: absolute; margin-left: 40%;margin-top: 30%;">
      </div>
      <div class="slide" style="position: absolute; display: none">
      </div>
      `;


    overlay.innerHTML = elementDOMS;

    // Check if the content is successfully rendered and resolve the Promise
    if (overlay.innerHTML === elementDOMS) {
      resolve();
    } else {
      reject(new Error('Failed to render content.'));
    }
  });
}


export async function playSlide() {
      return new Promise((resolve) => {
    
        const prevNext = document.querySelector('.prevNext')
        const bullets = document.querySelector('.bullets')
        prevNext.style.display='none'
        bullets.style.display='none'
        
        // Get the slide elements
        var slides = document.getElementsByClassName("play-sequence");
        console.log('autoPlayFindings')
    
        // Initialize the slide index
        var currentSlide = 0;
        var requestId;
    
        // Function to show the current slide
        function showSlide() {
          // Hide all slides
          for (var i = 0; i < slides.length; i++) {
            slides[i].style.display = "none";
          }
    
          // Show the current slide
          slides[currentSlide].style.display = "block";
          console.log(`slides bug: #${currentSlide} object: ${slides[currentSlide]} .id ${slides[currentSlide].id}` )
          // Update the URL hash to navigate to the next slide
          window.location.hash = "#" + slides[currentSlide].id;
    
          // Increment the slide index
          currentSlide++;
    
          // Resolve the promise when all slides have been shown
          if (currentSlide >= slides.length) {
            resolve();
            return true;
          }
    
          // Request the next animation frame after a delay of 2 seconds (0.5 frames per second)
          setTimeout(() => {
            requestId = requestAnimationFrame(showSlide);
          }, 2500);
        }
    
       // Start the slideshow
        showSlide();
    
        // Assign the stopAutoplay function as a property of 'this'
        this.stopSlide = () => {
          cancelAnimationFrame(requestId);
          resolve();
        };
      });
    }

    export async function playConsoleSlide() {
      return new Promise((resolve) => {
    
        const prevNext = document.querySelector('.prevNext')
        const bullets = document.querySelector('.bullets')
        prevNext.style.display='none'
        bullets.style.display='none'
        
        // Get the slide elements
        var slides = document.getElementsByClassName("play-sequence");
        console.log('autoPlayFindings')
    
        // Initialize the slide index
        var currentSlide = 0;
        var requestId;
    
        // Function to show the current slide
        function showSlide() {
          // Hide all slides
          for (var i = 0; i < slides.length; i++) {
            slides[i].style.display = "none";
          }
    
          // Show the current slide
          slides[currentSlide].style.display = "block";
          console.log(`slides bug: #${currentSlide} object: ${slides[currentSlide]} .id ${slides[currentSlide].id}` )
          // Update the URL hash to navigate to the next slide
          window.location.hash = "#" + slides[currentSlide].id;
    
          // Increment the slide index
          currentSlide++;
    
          // Resolve the promise when all slides have been shown
          if (currentSlide >= slides.length) {
            resolve();
            return true;
          }
    
          // Request the next animation frame after a delay of 2 seconds (0.5 frames per second)
          setTimeout(() => {
            requestId = requestAnimationFrame(showSlide);
          }, 2500);
        }
    
       // Start the slideshow
        showSlide();
    
        // Assign the stopAutoplay function as a property of 'this'
        this.stopSlide = () => {
          resolve();
        };
      });
    }