var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
var SpeechGrammarList = SpeechGrammarList || window.webkitSpeechGrammarList;
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent;

// Define the phrases you want to recognize
var phrases = ['hey, computer', 'check', 'check again'];

var recognition = new SpeechRecognition();
if (SpeechGrammarList) {
  var speechRecognitionList = new SpeechGrammarList();
  var grammar = '#JSGF V1.0; grammar phrases; public <phrase> = ' + phrases.join(' | ') + ' ;';
  speechRecognitionList.addFromString(grammar, 1);
  recognition.grammars = speechRecognitionList;
}
recognition.continuous = true; // Change to continuous recognition upon window start
recognition.lang = 'en-US';
recognition.interimResults = false;
recognition.maxAlternatives = 1;

var diagnostic = document.querySelector('.output');
var bg = document.querySelector('html');
var hints = document.querySelector('.hints');

var phraseHTML = '';
phrases.forEach(function (v, i, a) {
  phraseHTML += '<span>' + v + '</span>';
});
hints.innerHTML = 'Say one of the following phrases: ' + phraseHTML + '.';

recognition.onstart = function () {
  console.log('Ready to receive a command.');
};

recognition.onresult = function (event) {
  var phrase = event.results[event.results.length - 1][0].transcript; // Get the latest result
  diagnostic.textContent = 'Command received: ' + phrase + '.';
  
  // Perform action based on recognized phrase
  if (phrase === 'hey, computer') {
    console.log('hey, computer is recognized')
  } else if (phrase === 'check') {
    console.log('check is recognized')
  } else if (phrase === 'check again') {
    console.log('check again is recognized')
  }
  
  console.log('Confidence: ' + event.results[event.results.length - 1][0].confidence);
};

recognition.onnomatch = function (event) {
  diagnostic.textContent = "I didn't recognize that command.";
};

recognition.onerror = function (event) {
  diagnostic.textContent = 'Error occurred in recognition: ' + event.error;
};

// Start continuous recognition when the window starts
window.onload = function () {
  recognition.start();
};
