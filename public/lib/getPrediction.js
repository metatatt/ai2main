export const getPrediction = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    const videoTrack = stream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(videoTrack);
    const imageBitmap = await imageCapture.grabFrame();
    const canvas = Object.assign(document.createElement('canvas'), { width: imageBitmap.width, height: imageBitmap.height });
    const context = canvas.getContext('2d');
    context.drawImage(imageBitmap, 0, 0);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    const formData = new FormData();
    formData.append('image', await new Promise((resolve) => canvas.toBlob(resolve, 'image/png')) );
    const azdata = await (await fetch('/azenv')).json();
    
    const response = await fetch(azdata.predictionEndpoint, {
      method: 'POST',
      body: formData,
      headers: {
        'Prediction-Key': azdata.predictionKey
      }
    });

    // Parse the predictions from the response
    const result = await response.json();
    const mostLikelyPrediction = result.predictions
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 1)[0];

    const showTag = {
      tag: mostLikelyPrediction.tagName,
      probability: mostLikelyPrediction.probability
    };

    if (showTag) {
      return `测试结果--${showTag.tag}: ${(showTag.probability * 100).toFixed(2)}%`;
    } else {
      return 'An error occurred while processing the image.';
    }
  } catch (error) {
    console.log("Error:", error);
    return 'Unable to access video stream.';
  }
};
