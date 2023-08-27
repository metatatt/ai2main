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

    const info1 = document.querySelector('.text-header1');
    const info2 = document.querySelector('.text-header2');
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
    });
    info2.innerHTML = currentDate+' @HandCheckr';
    info1.innerHTML = message;
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

  async listen(text, timeoutDuration = 60000) {
    const keywords = ['check', 'check again', 'please'];
    let timeoutId;
  
    console.log('recognizer....');
    
    return new Promise((resolve) => {
      const handleRecognition = (s, e) => {
        clearTimeout(timeoutId); // Clear the timeout whenever speech is recognized
  
        if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
          const recognizedText = e.result.text.toLowerCase();
          console.log('Recognized:', recognizedText);
  
          if (recognizedText.includes(text)) {
            this.vueComponent.taskToken.start = true;
            resolve(true);
          } else {
            for (const keyword of keywords) {
              if (recognizedText.includes(keyword)) {
                console.log('check**');
                this.vueComponent.taskToken.check = true;
                resolve(this.vueComponent);
                break;
              }
            }
          }
        }
  
        // Set up a new timeout after handling recognition
        timeoutId = setTimeout(() => {
          console.log('Recognition timeout. Restarting...');
          this.recognizer.stopContinuousRecognitionAsync();
          this.recognizer.recognized = null; // Remove the previous event handler
          this.recognizer.recognized = handleRecognition; // Set the event handler again
          this.recognizer.startContinuousRecognitionAsync();
        }, timeoutDuration);
      };
  
      this.recognizer.recognized = handleRecognition;
      this.recognizer.startContinuousRecognitionAsync();
    });
  }
  

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

export function populateFindings(header, results) {
    console.log('in Findings-results', results);
    const auditData0 = results[0]; // Parse the JSON string into an object
    const auditData1 = results[1]; 
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
              <img src= "${auditData0.image}"/>
            </div>
            <div style="background:#e95; position: relative;">
              <h2>Examined Visual #2 of ${results.length}</h2>
              <p>-marker map for ${auditData1.tag} (${auditData1.probability} confidence)<br></p>
              <br>
              <img src= "${auditData1.image}"/>
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

  export function graphicsBox(iconSelection, parentId) {
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
  
 export function  messageBox(message) {
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
  