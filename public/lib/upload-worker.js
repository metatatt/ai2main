self.addEventListener('message', async event => {
  const imageBlob = event.data.imageBlob;
  const card = event.data.card;
  const containerName = card.keyContain;
  const connectionString = card.endConnect;
  const color = card.color;
  const threshold = card.probability;

  // Use Date object to format the date in YYYYMMDD format
  const now = new Date().toISOString().slice(0, 10).replace(/-/g, '').slice(0, 14);

  const fileName = card.id + now + '.png';
  
  const formData = new FormData();

  // Append imageBlob to formData
  formData.append('imageFile', imageBlob, fileName);

  console.log('formData loaded'); // This will immediately log after appending
  try {
    if (formData) {
      const response = await fetch('/saveblob', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('saveBlob result**', result);

      const checkResponse = {
        initTime: new Date().getTime(),
        imageBlob: imageBlob,
        tag: card.id,
        pendingCount: 1,
        color:card.color,
        probability: card.probability,
        boundingBox: { top: 0, left: 0, width: 1, height: 1,}
      } 

      self.postMessage(checkResponse);
    }
  } catch (error) {
    console.error('Error:', error);
  }
});



