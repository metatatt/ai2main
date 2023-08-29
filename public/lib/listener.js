self.addEventListener('message', async event => {
  const {text} = event.data;
  const keywords = ['hey, computer', 'check', 'check again'];
  console.log('*2: recognized text is passed to web worker', text)
  console.log(' text captured ', text)
          for (const phrase of keywords) {
            if (text.includes(phrase)) {
              console.log('**', phrase);
              self.postMessage(phrase);
              break; // Exit the loop once a key phrase is found
            }
          }
});

