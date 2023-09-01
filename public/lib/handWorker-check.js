self.addEventListener('message', async event => {
  const { imageBlob, card } = event.data;
  const { keyContain, endConnect, color, probability } = card;
  console.log('check worker')

  const formData = new FormData();
  formData.append('image', imageBlob, 'image.png');

  const predictionResponse = await fetch(endConnect, {
    method: 'POST',
    body: formData,
    headers: {
      'Prediction-Key': keyContain,
    },
  });

  const predictionResult = await predictionResponse.json();
  if (predictionResult.predictions && Array.isArray(predictionResult.predictions)) {
    const sortedPredictions = predictionResult.predictions
      .filter(prediction => prediction.probability > probability)
      .sort((a, b) => b.probability - a.probability);

    const mostLikelyPrediction = sortedPredictions[0];
    
    if (mostLikelyPrediction) {
      const responsePayload = {
        initTime: new Date().getTime(),
        imageBlob: imageBlob,
        tag: mostLikelyPrediction.tagName,
        color: color,
        probability: Math.floor(mostLikelyPrediction.probability * 100),
        boundingBox: mostLikelyPrediction.boundingBox,
      };

      self.postMessage(responsePayload);
    }
  }
});

