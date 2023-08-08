self.addEventListener('message', async event => {
  const imageBlob = event.data.imageBlob;
  const predictionKey = event.data.predictionKey;
  const predictionEndpoint = event.data.predictionEndpoint;

  const formData = new FormData();
  formData.append('image', imageBlob, 'image.png'); // Adjust filename and type as needed
  console.log('formD ', formData)
  console.log('predKey ', this.predictionKey)
  const response = await fetch(predictionEndpoint, {
    method: 'POST',
    body: formData,
    headers: {
      'Prediction-Key': predictionKey,
    },
  });

  const result = await response.json();
  console.log('web worker result ', result);
  self.postMessage(result);
});