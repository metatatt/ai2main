self.addEventListener('message', async event => {
  const imageBlob = event.data.imageBlob;
  const predictionKey = event.data.predictionKey;
  const predictionEndpoint = event.data.predictionEndpoint;

  const formData = new FormData();
  formData.append('image', imageBlob, 'image.png'); // Adjust filename and type as needed
  console.log('formD ', formData)
  console.log('predKey ', predictionKey)
  const response = await fetch(predictionEndpoint, {
    method: 'POST',
    body: formData,
    headers: {
      'Prediction-Key': predictionKey,
    },
  });

  let result = await response.json();
  const mostLikelyPrediction = result.predictions
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 1)[0];

  if (mostLikelyPrediction) {
    // Prepare the showTag object with the prediction details and image source
    const mostLikely = {
      tag: mostLikelyPrediction.tagName,
      probability: Math.floor(mostLikelyPrediction.probability * 100),
    //  image: imageDataSource, // Add the image source to the showTag output
      boundingBox: mostLikelyPrediction.boundingBox
    };
    console.log('worker-mostlikely ', mostLikely)
    result = mostLikely
  }
  self.postMessage(result);
});