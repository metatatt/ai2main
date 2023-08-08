self.addEventListener('message', async event => {
  const imageData = event.data;

  const azdata = await fetch('/azenv').then(response => response.json());
  const predictionKey = azdata.predictionKey;
  const predictionEndpoint = azdata.predictionEndpoint;

  const formData = new FormData();
  formData.append('image', new Blob([imageData], { type: 'image/jpeg' }));

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