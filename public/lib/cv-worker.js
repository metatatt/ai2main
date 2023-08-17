self.addEventListener('message', async event => {
  const imageBlob = event.data.imageBlob;
  const predictionKey = event.data.predictionKey;
  const predictionEndpoint = event.data.predictionEndpoint;

  const formData = new FormData();
  formData.append('image', imageBlob, 'image.png'); // Adjust filename and type as needed
  const response = await fetch(predictionEndpoint, {
    method: 'POST',
    body: formData,
    headers: {
      'Prediction-Key': predictionKey,
    },
  });

  let result = await response.json();
  let mostLikely=null;
  if (result && result.predictions && result.predictions.length > 0) {
  mostLikely = result.predictions
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 1)[0];
  }

  if (mostLikely ) {
    // Prepare the showTag object with the prediction details and image source
    const predictCV = {
      tag: mostLikely.tagName,
      probability: Math.floor(mostLikely.probability * 100),
      imageBlob: imageBlob,
      boundingBox: mostLikely.boundingBox
    }

    const result = {
      time: new Date().getTime(),
      readyFor:'pip',
      cv: predictCV,
      qr:'',
    };
  }
  self.postMessage(result);
});