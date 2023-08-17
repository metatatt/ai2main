self.addEventListener('message', async event => {
  let response = null;
  
  const cardID = event.data.cardID;
  const imageBlob = event.data.imageBlob;
  if (cardID) {
    const cardResponse = {
      time: new Date().getTime(),
      isAiming: true,
      isACard: true,
      isATarget: false,
      imageBlob: imageBlob,
      tag: cardID,
      probability: '',
      boundingBox: ''
    };
    self.postMessage(cardResponse);
  } else {
    const predictionKey = event.data.predictionKey;
    const predictionEndpoint = event.data.predictionEndpoint;
    const threshold = event.data.probabilityThreshold;

    const formData = new FormData();
    formData.append('image', imageBlob, 'image.png'); // Adjust filename and type as needed

    const checkResponse = await fetch(predictionEndpoint, {
      method: 'POST',
      body: formData,
      headers: {
        'Prediction-Key': predictionKey,
      },
    });

    const result = await checkResponse.json();
    if (result.predictions && Array.isArray(result.predictions)) {
      // Filter and sort predictions
      const sortedPredictions = result.predictions
        .filter(prediction => prediction.probability > threshold)
        .sort((a, b) => b.probability - a.probability);

      const mostLikely = sortedPredictions[0];
    if (mostLikely) {
      // Prepare the response object with the prediction details and image source
      const checkResponse = {
        time: new Date().getTime(),
        isAiming:true,
        isACard:false,
        isATarget:true,
        imageBlob: imageBlob,
        tag: mostLikely.tagName,
        probability: Math.floor(mostLikely.probability * 100),
        boundingBox: mostLikely.boundingBox
      };
      self.postMessage(checkResponse);
    }
  }}
});
