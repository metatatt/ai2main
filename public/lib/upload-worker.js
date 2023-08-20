self.addEventListener('message', async event => {
  const imageBlob = event.data.imageBlob;

  const cardId = event.data.cardId;
  console.log('upload here ** ');

  // Use Date object to format the date in YYYYMMDD format
  const now = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  const fileName = 'WI' + cardId + now + '.png';
  const connectionString = event.data.connectionString;
  const containerName = event.data.containerName;
  console.log('imageBlob ** ', imageBlob);

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
        time: new Date().getTime(),
        isAiming: true,
        isACard: false,
        isATarget: false,
        tag: result,
      };

      self.postMessage(checkResponse);
    }
  } catch (error) {
    console.error('Error:', error);

    // You might want to handle the error and post a response here
    const errorResponse = {
      error: error.message,
    };
    console.log('saveBlob err**', errorResponse);
    self.postMessage(errorResponse);
  }
});



