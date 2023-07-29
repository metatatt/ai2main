export async function getEachResult(imageArrayObj) {
  console.log('getEachResults ', imageArrayObj);

  // Set up canvas and context for image processing
  const canvasElement = document.getElementById('canvas');
  canvasElement.height = imageArrayObj.height;
  canvasElement.width = imageArrayObj.width;
  const canvasContext = canvasElement.getContext("2d", { willReadFrequently: true });

  // Put the image data on the canvas
  canvasContext.putImageData(imageArrayObj, 0, 0);

  const formData = new FormData();
  formData.append('image', await new Promise((resolve) => canvasElement.toBlob(resolve, 'image/png')));

  // Obtain image data source as a data URL
  const imageDataSource = canvasElement.toDataURL(); // Not imageData (?)

  // Fetch prediction endpoint details from the server
  const azdata = await (await fetch('/azenv')).json();

  // Send the image for prediction to the prediction endpoint
  const response = await fetch(azdata.predictionEndpoint, {
    method: 'POST',
    body: formData,
    headers: {
      'Prediction-Key': azdata.predictionKey,
    },
  });

  const result = await response.json();
  //
  console.log('libB.js 从Azure 得到的预测 result ', result);
  // Retrieve the most likely prediction
  const mostLikelyPrediction = result.predictions
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 1)[0];

  if (mostLikelyPrediction) {
    // Prepare the showTag object with the prediction details and image source
    const showTagObj = {
      tag: mostLikelyPrediction.tagName,
      probability: Math.floor(mostLikelyPrediction.probability * 100),
      image: imageDataSource, // Add the image source to the showTag output
      boundingBox: mostLikelyPrediction.boundingBox
    };
    const eachTaggedResult = JSON.stringify(showTagObj);
        // Set a timeout to update UI and display the showTag result
      setTimeout(() => {
      }, 200);

    return eachTaggedResult;
  }
    return null;
}

