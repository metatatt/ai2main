export class handUI {
  constructor(vueComponent){
    this.vueComponent = vueComponent;
    this.role = vueComponent.role;
    this.socket = vueComponent.socket;
    this.dataset = 'vueComponent.card.id;';
    this.flowFlag = vueComponent.flowFlag;
    this.soundNow='';
    this.soundbeep = new Audio('./lib/beep.mp3');
    this.soundlowding = new Audio('./lib/lowding.mp3');
    this.sounddingding = new Audio('./lib/ding2.mp3');
    this.soundding = new Audio('./lib/ding.mp3');
    this.sounderror = new Audio('./lib/error.mp3');
    this.soundbeep.preload = 'auto';
    this.sounddingding.preload = 'auto';
    this.soundding.preload = 'auto';
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
  

sound(sound){
  if(sound){
      console.log('changed to ', sound)
      this[`sound${sound}`].play();
      this.soundNow = sound
    }
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

renderSidePage(content, imageBlob, boundingBox) {
    let htmlContent = '';
    const isFile = !imageBlob;
  
    if (isFile) {
      // Fetch and render content when it's a file
      fetch(content)
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch the file content');
          }
          return response.text();
        })
        .then(markdownContent => {
          htmlContent = marked(markdownContent);
          const sidePage = document.querySelector('.sidePage');
          sidePage.innerHTML = htmlContent;
        })
        .catch(error => {
          console.error('Error:', error);
          // Handle the error as needed, e.g., display an error message to the user.
        });
    } else {
      // Render content when it's not a file
      htmlContent = marked(content);
      const sidePage = document.querySelector('.sidePage');
      sidePage.innerHTML = htmlContent;

      const sideImage = document.querySelector('.sideImage');
      sideImage.innerHTML = '';
      const resultImage = new Image();
      resultImage.src = URL.createObjectURL(imageBlob);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      resultImage.onload = () => {
        canvas.width = resultImage.width; // Set canvas width twice the resultImage width
        canvas.height = resultImage.height; // Set canvas height twice the resultImage height
        ctx.drawImage(resultImage, 0, 0, resultImage.width, resultImage.height);

         //boundingBox metrics
              const boxLeft = boundingBox.left * resultImage.width || 0; // Convert to percentage
              const boxTop = boundingBox.top * resultImage.height || 0; // Convert to percentage
              const boxWidth = boundingBox.width * resultImage.width || resultImage.width; // Convert to percentage
              const boxHeight = boundingBox.height * resultImage.height || resultImage.height; // Convert to percentage
         //Draw the bounding box on the canvas
              ctx.strokeStyle = 'red';
              ctx.lineWidth = 2; // Set the border width
              ctx.beginPath();
              ctx.rect(boxLeft, boxTop, boxWidth, boxHeight);
              ctx.stroke();
        }

      sideImage.appendChild(canvas);
      this.sound('ding');
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



  