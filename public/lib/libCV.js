export async function getEachResult(imageArrayObj) {
  console.log('getEachResults ', imageArrayObj);

  // Set up canvas and context for image processing
  const canvasElement = document.getElementById('canvas');
  canvasElement.height = imageArrayObj.height;
  canvasElement.width = imageArrayObj.width;
  const canvasContext = canvasElement.getContext('2d', { willReadFrequently: true });
  // Put the image data on the canvas
  canvasContext.putImageData(imageArrayObj, 0, 0);
  // Obtain the image as a blob
  const imageBlob = await new Promise((resolve) => canvasElement.toBlob(resolve, 'image/png'));

  // Generate a unique filename for the blob by adding a timestamp to the original image filename
  const originalFileName = 'image.png'; // Change this to the original filename if available
  const timestamp = Date.now();
  const uniqueFileName = `u_${timestamp}_${originalFileName}`;

  //
  const azdata = await (await fetch('/azenv')).json();
  const endpoint = azdata.predictionEndpoint
  const key = azdata.predictionKey
  console.log(`libCVjs key ${key} endpoint ${endpoint}`)
  // Create a FormData object and append the image blob to it
  const formData = new FormData();
  formData.append('imageFile', imageBlob, uniqueFileName);


  try {
    // Send the image to the backend and save it to Azure Blob Storage
    const response = await fetch('/saveblob', {
      method: 'POST',
      body: formData,
      headers:{
        key: key,
        endpoint: endpoint
      }
    });

    // Handle the response from the server (saved image URI)
    const data = await response.json();

    // Get the saved image URI from the response and use it for further processing
    const savedImageURI = data.savedURI;
    console.log('Image saved to Azure Blob Storage:', savedImageURI);

    // Use the savedImageURI for any further processing or displaying the image
    // For example, you can update the UI with the saved image
    // document.getElementById('imageContainer').src = savedImageURI;

  } catch (error) {
    console.error('Error during image processing:', error.message);
    // Handle the error (e.g., display an error message on the UI)
  }
}

