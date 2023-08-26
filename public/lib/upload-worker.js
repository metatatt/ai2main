self.addEventListener('message', async event => {
  const { imageBlob, card } = event.data;
  const { keyContain: containerName, endConnect: connectionString, color, probability } = card;

  const now = new Date().toISOString().slice(0, 10).replace(/-/g, '').slice(0, 14);
  const fileName = `${card.id}${now}.png`;
  
  const formData = new FormData();
  formData.append('imageFile', imageBlob, fileName);

  console.log('formData loaded');

  try {
    if (formData) {
      const response = await fetch('/saveblob', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('saveBlob result:', result);

      const checkResponse = {
        initTime: new Date().getTime(),
        imageBlob: imageBlob,
        tag: card.id,
        pendingCount: 1,
        color: color,
        probability: probability,
        boundingBox: { top: 0, left: 0, width: 1, height: 1 },
      };

      self.postMessage(checkResponse);
    }
  } catch (error) {
    console.error('Error:', error);
  }
});


