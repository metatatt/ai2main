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

  export function playAnimation(iconID) {
    const video = document.getElementById('video');
    const videoRect = video.getBoundingClientRect();
    const videoCenterX = videoRect.left + videoRect.width / 2;
    const videoCenterY = videoRect.top + videoRect.height / 2;
    const container = document.querySelector('.container');

    const existingAnimations = document.querySelectorAll('.animation');
    existingAnimations.forEach((animation) => {
      container.removeChild(animation);
    });
  
    const animation = document.createElement('img');
    let imgSrc = "";
    if (iconID === "t") {
      imgSrc = "./img/b&plogo.svg";
    } else {
      imgSrc = "./img/scanSignBlue380Ani.gif";
    }
    animation.src = imgSrc;
    animation.classList.add('animation');
    animation.style.position = "absolute";
    animation.style.left = videoCenterX - 190 + "px"; // Add "px" unit
    animation.style.top = videoCenterY - 190 + "px"; // Add "px" unit  
    container.appendChild(animation);
  
    return new Promise((resolve) => {
      resolve();
    });
  }
  

  export function setTopBarText(message) {
    const video = document.getElementById('video');
    const videoRect = video.getBoundingClientRect();
  
    const info1 = document.querySelector('.set-top1');
    const info2 = document.querySelector('.set-top2');
  
    // Position info1 element at 5px margin from the top and left of the video
    info1.style.top = videoRect.top + 5 + 'px';
    info1.style.left = videoRect.left + 5 + 'px';
  
    // Position info2 element at 5px margin from the top and right of the video
    info2.style.top = videoRect.top + 5 + 'px';
    info2.style.right = window.innerWidth - videoRect.right + 5 + 'px';
  
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
    });
  
    info2.innerHTML = currentDate;
    info1.innerHTML = message;
  }
  

function isFlat(location) {
  const topLeft = location.topLeftCorner;
  const topRight = location.topRightCorner;
  const bottomLeft = location.bottomLeftCorner;
  const bottomRight = location.bottomRightCorner;
  
  const topDistance = Math.sqrt(
    Math.pow(topRight.x - topLeft.x, 2) + Math.pow(topRight.y - topLeft.y, 2)
  );
  
  const bottomDistance = Math.sqrt(
    Math.pow(bottomRight.x - bottomLeft.x, 2) + Math.pow(bottomRight.y - bottomLeft.y, 2)
  );
  
  const tolerance = 1; // Adjust this value as needed
  
  return Math.abs(topDistance - bottomDistance) <= tolerance;
}

export function setScreenLayout() {
  const slideElements = document.querySelectorAll('.slide');
  slideElements.forEach((slideElement) => {
    slideElement.remove();
  });

  const videoElement=document.getElementById('video')
  const animation = document.querySelector('.animation');

  function slide() {
    videoElement.style.display = "none";
    if (animation) {
      animation.style.display = 'none';
    }
  }

  function scan() {
    videoElement.style.display = "block";
    if (animation) {
      animation.style.display = 'block';
    }
  }
  return {
    slide,
    scan
  };
}

export function setOverlayScreen(factorValue) {
  
  return new Promise((resolve, reject) => {

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
      <div class="container">
        <div class="contarols">
          <div class="set-top1 text-head">--</div>
          <img src="./img/Baton-Icon-Blue.svg">
          <div class="set-top2 text-head2"></div>
        </div>
      </div>`;

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

