export class handUI {
  constructor(vueComponent){
    this.vueComponent = vueComponent;
    this.role = vueComponent.role;
    this.socket = vueComponent.socket;
    this.dataset = 'vueComponent.card.id;';
    this.flowFlag = vueComponent.flowFlag;
    this.soundNow='';
    this.soundbeep = new Audio('./lib/beep.mp3');
    this.sounddingding = new Audio('./lib/ding2.mp3');
    this.soundding = new Audio('./lib/ding.mp3');
    this.sounderror = new Audio('./lib/error.mp3');
    this.soundbeep.preload = 'auto';
    this.sounddingding.preload = 'auto';
    this.soundding.preload = 'auto';
    this.counter=0;
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
    return greetings[greetingIndex];
  }


  renderSidePage(file) {
    const launchPage = fetch(file)
      .then(response => response.text())
      .then(markdownContent => {
        const htmlContent = marked(markdownContent);
        const sidePage = document.querySelector('.sidePage');
        sidePage.innerHTML = htmlContent;
      })
      .catch(error => console.error('Error fetching or processing launchPage.md:', error));
  }
  renderDotBar(num) {
      const dotBar = document.querySelector('.dotBar');
      dotBar.style.animation = 'flashing infinite'; // Corrected animation name    
      for (let i = 0; i < num; i++) { // Use 'let' for loop variable, fix loop condition
        const dot = document.getElementById(`dot${i}`); // Use template literals to get the correct ID
        dot.style.animation = 'none'; // Remove animation from individual dot
      }
    }
  
  renderPromptText(num){
    const prompt = document.querySelector('#prompt')
    const promptList = {
      0:`say 'Hey Computer' to start`,
      1: `awaiting hand gesture...`,
      2: `point the target with two fingers...`,
      3: `say 'check' to make snapshot...`,
      4: `uploading now...`,
      5: `showing result...`,
    }
  }

}

export function listener(){
  var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
  var SpeechGrammarList = SpeechGrammarList || window.webkitSpeechGrammarList;
  var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent;
  var phrases = ['hey computer', 'check', 'check again'];
  var recognition = new SpeechRecognition();
  if (SpeechGrammarList) {
        var speechRecognitionList = new SpeechGrammarList();
        var grammar = '#JSGF V1.0; grammar phrases; public <phrase> = ' + phrases.join(' | ') + ' </phrase>;';
        speechRecognitionList.addFromString(grammar, 1);
        recognition.grammars = speechRecognitionList;
  }
      recognition.continuous = true; // Change to continuous recognition upon window start
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
  recognition.onresult = function (event) {
    var phrase = event.results[event.results.length - 1][0].transcript; // Get the latest result
        console.log('listen->',phrase)
        var seqRoute = document.querySelector('#seqRoute')
        const inputEvent = new Event('input', {bubbles:true, cancelable:true})
        // Perform action based on recognized phrase
        if (phrase.includes('hey computer')) {
          seqRoute.textContent = '1'
          seqRoute.dispatchEvent(inputEvent)
        } else if (phrase.includes('check')) {
          seqRoute.textContent = '4'
          seqRoute.dispatchEvent(inputEvent)
        } else if (phrase.includes('check again')) {
          seqRoute.textContent = '4'
          seqRoute.dispatchEvent(inputEvent)
        }
        console.log('Confidence-> ' + event.results[event.results.length - 1][0].confidence);
      };
  recognition.start();

  recognition.onnomatch = function (event) {
    console.log( "I didn't recognize that command.")
  };

  recognition.soundend = function (event) {
    console.log( "sound end...")
  };
  
  recognition.onend = function (event) {
    console.log("SessionEnd restarting: ");
    recognition.start();
  };
  recognition.onerror = function (event) {
    console.log('Error occurred in recognition: ', event.error);
  };
}



  