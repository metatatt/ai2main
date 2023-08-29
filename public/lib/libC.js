export class handUI {
  constructor(vueComponent){
    this.vueComponent = vueComponent;
    this.role = vueComponent.role;
    this.socket = vueComponent.socket;
    this.soundNow='';
    this.soundbeep = new Audio('./lib/beep.mp3');
    this.sounddingding = new Audio('./lib/ding2.mp3');
    this.soundding = new Audio('./lib/ding.mp3');
    this.sounderror = new Audio('./lib/error.mp3');
    this.soundbeep.preload = 'auto';
    this.sounddingding.preload = 'auto';
    this.soundding.preload = 'auto';
    this.counter=0;
    if (!!window.SpeechSDK) {
      SpeechSDK = window.SpeechSDK
      var speechConfig = SpeechSDK.SpeechConfig.fromSubscription('d2cd1d71cddb4eca9d85f151fe5906d5', 'eastus2');
      speechConfig.speechContinuousTimeout = 5000;
      this.synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig);
      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      this.recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
      this.speechAllowed=true;
    } else {
      this.synthesizer = null;
      this.recognizer = null;
      this.speechAllowed=false;
    }
  }

  layout(mode) {
    const videoElement = document.getElementById('video');
    const animation = document.querySelector('.animation');
    const slideElement = document.querySelector('.slide');
  
    videoElement.style.display = mode === 'scan' ? 'block' : 'none';
    slideElement.style.display = mode === 'slide' || mode === 'report' ? 'block' : 'none';
  
    if (animation) {
      animation.style.display = mode === 'scan' ? 'block' : 'none';
    }
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

sound(sound){
  if(sound){
      console.log('changed to ', sound)
      this[`sound${sound}`].play();
      this.soundNow = sound
    }
  }

  messageBox(message) {

    const videoText = document.querySelector('.videoText');
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
    });
    videoText.textContent = message+' '+currentDate+' @HandCheckr';
  }

  socketEvent(msgClass, msg, gridId){
    this.socket.emit('sessionMessage', {
      role: this.role,
      gridId: gridId,
      messageClass: msgClass,
      message: msg
    });
  }

  greeting(){
    const currentHour = new Date().getHours();
    const greetings = ["Good evening!", "Good morning!", "Good afternoon!","Hi!"];
    const greetingIndex = Math.floor(((currentHour) % 24) / 6);
    this.speech(greetings[greetingIndex]+' say hey computer to start...')
    return greetings[greetingIndex];
  }

  speech(text){
    if (!this.speechAllowed){
      return 
    }
    this.counter++
    console.log('voice** count:',this.counter)
    this.speechAllowed = false;

    this.synthesizer.speakTextAsync(text,
      result => {
      },
      error => {
      });
    this.speechAllowed = true
  }

  sidebar() {
    const launchPage = `
<div class="stackedit">
<div class="stackedit__html"><h1 id="hey-computer">say ‘<em>Hey Computer</em>’</h1>
<p>To start, say the key word ,<br>
.<br>
.<br>
.<br>
.<br>
.<br>
.<br>
.</p>
<p>or click button below</p>
<p><img src="https://practiz2023public.blob.core.windows.net/lcam/handStart.svg" alt="start"></p>
<blockquote>
<p>handCheckr: point, then AI verfied!</p>
</blockquote>
</div>
</div>
  `  
  const resultPage = `
  <div class="stackedit">
    <div class="stackedit__html"><h2 id="point-and-say--check">Point and say  ‘<em>Check</em>’</h2>
  <p>[ ] sending image    [ ] awaiting result</p>
  <ul>
  <li class="task-list-item"><input type="checkbox" class="task-list-item-checkbox" disabled="" checked> pass</li>
  <li class="task-list-item"><input type="checkbox" class="task-list-item-checkbox" disabled=""> no pass</li>
  </ul>
  <p><strong>analytics</strong></p>
  <blockquote>
  <p>tag:<br>
  confidence:<br>
  date &amp; time:<br>
  dataset:</p>
  </blockquote>
  <p><img src="https://practiz2023public.blob.core.windows.net/lcam/WI32020230820.png" alt="enter image description here"></p>
  <blockquote>
  <p>handCheckr: point, then AI verfied!</p>
  </blockquote>
  </div>
  </div>`
    const htmlContent1 = marked(launchPage);
    const htmlContent2 = marked(resultPage);
    // Display the HTML content in the sidebar
    const sidebarPage1 = document.getElementById('sidebarPage1');
    const sidebarPage2 = document.getElementById('sidebarPage2');
    sidebarPage1.innerHTML = htmlContent1;
    sidebarPage2.innerHTML = htmlContent2;
    sidebarPage1.style.display= "block"
    sidebarPage2.style.display= "none"
  }

}

export function sidebarPage(pageId) {
  // Fetch your Markdown content (replace with your actual content source)
  const pageContent1 = `
  <body class="stackedit">
  <div class="stackedit__html"><h1 id="hey-computer">say ‘<em>Hey Computer</em>’</h1>
<p>To start, say the key word ,<br>
.<br>
.<br>
.<br>
.<br>
.<br>
.<br>
.</p>
<p>or click button below</p>
<p><img src="https://practiz2023public.blob.core.windows.net/lcam/handStart.svg" alt="start"></p>
<blockquote>
<p>handCheckr: point, then AI verfied!</p>
</blockquote>
</div>
</body>
`  
const pageContent2 = `
<body class="stackedit">
  <div class="stackedit__html"><h2 id="point-and-say--check">Point and say  ‘<em>Check</em>’</h2>
<p>[ ] sending image    [ ] awaiting result</p>
<ul>
<li class="task-list-item"><input type="checkbox" class="task-list-item-checkbox" disabled=""> pass</li>
<li class="task-list-item"><input type="checkbox" class="task-list-item-checkbox" disabled=""> no pass</li>
</ul>
<p><strong>analytics</strong></p>
<blockquote>
<p>tag:<br>
confidence:<br>
date &amp; time:<br>
dataset:</p>
</blockquote>
<p><img src="https://practiz2023public.blob.core.windows.net/lcam/WI32020230820.png" alt="enter image description here"></p>
<blockquote>
<p>handCheckr: point, then AI verfied!</p>
</blockquote>
</div>
</body>`
  // Convert Markdown to HTML using marked
  const htmlContent = marked(`pageContent${pageId}`);
  // Display the HTML content in the sidebar
  const sidebarContent = document.getElementById('sidebarContent');
  sidebarContent.innerHTML = htmlContent;
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

  