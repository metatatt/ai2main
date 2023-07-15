export const getPrediction = async (video) => {
try {
    const videoTrack = video.srcObject.getVideoTracks()[0];
    const imageCapture = new ImageCapture(videoTrack);
    const imageBitmap = await imageCapture.grabFrame();
  
    const canvas = document.createElement('canvas');
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    const context = canvas.getContext('2d');
    context.drawImage(imageBitmap, 0, 0);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  
    const formData = new FormData();
    formData.append('image', await new Promise((resolve) => canvas.toBlob(resolve, 'image/png')) );
  
    const { predictionEndpoint, predictionKey } = await (await fetch('/azenv')).json();
  
    const { predictions } = await (await fetch(predictionEndpoint, {
      method: 'POST',
      body: formData,
      headers: {
        'Prediction-Key': predictionKey
      }
    })).json();
  
    const mostLikelyPrediction = predictions
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 1)[0];
  
    const showTag = {
      tag: mostLikelyPrediction.tagName,
      probability: mostLikelyPrediction.probability
    };
  
    console.log("result ", showTag);
  
    return showTag ? `测试结果--${showTag.tag}: ${(showTag.probability * 100).toFixed(2)}%` : 'An error occurred while processing the image.';
  } catch (error) {
    console.log("Error:", error);
    return 'Unable to access video stream.';
  }
}