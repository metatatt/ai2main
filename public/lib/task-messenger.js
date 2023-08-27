self.addEventListener('message', async event => {
  const {command} = event.data;
  const instruction = ['start', 'check', 'upload'];
  console.log('**start eventListen')
  let recognizer = null;
  let SpeechSDK = window.SpeechSDK || null;

  if (command === 'start_voice' && SpeechSDK) {
    try {
      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription('d2cd1d71cddb4eca9d85f151fe5906d5', 'eastus2');
      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      
      recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
      
      recognizer.recognized = async (s, e) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
          const recognizedText = e.result.text.toLowerCase();
          console.log('*', recognizedText);
          for (const phrase of instruction) {
            if (recognizedText.includes(phrase)) {
              console.log('**', phrase);
              self.postMessage(phrase);
              break; // Exit the loop once a key phrase is found
            }
          }
        }
      };

      await recognizer.startContinuousRecognitionAsync();
      await new Promise(resolve => setTimeout(resolve, 500)); // Add a delay between recognition attempts
        
      await recognizer.stopContinuousRecognitionAsync();
    } catch (error) {
      console.error(error);
    }
  }
});

