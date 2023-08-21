self.addEventListener('message', async event => {
  const imageBlob = event.data.imageBlob;

    const predictionKey = event.data.card.key;
    const predictionEndpoint = event.data.card.endpoint;
    const threshold = event.data.card.probability;
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

      let checkResponse ={}
    if (mostLikely) {
      // Prepare the response object with the prediction details and image source
      checkResponse = {
        initTime: new Date().getTime(),
        imageBlob: imageBlob,
        tag: mostLikely.tagName,
        probability: Math.floor(mostLikely.probability * 100),
        boundingBox: mostLikely.boundingBox
      } 
    } else {
      checkResponse = {
        initTime: new Date().getTime(),
        imageBlob: null,
        tag: '',
        probability: 0,
        boundingBox: null
      } 
      };
      self.postMessage(checkResponse);
    }
  });
