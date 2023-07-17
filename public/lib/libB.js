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


function addBoundingBox(image, boundingBox, tagName) {
  return new Promise((resolve, reject) => {
    // Create a new HTMLImageElement
    const img = new Image();
    
    // Set the source of the image to the base64-encoded data
    img.src = image;

    // Create a canvas element to draw the image and bounding box
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set the canvas size to match the image dimensions
    canvas.width = img.width;
    canvas.height = img.height;

    // Draw the image onto the canvas once it has loaded
    img.onload = function() {
      ctx.drawImage(img, 0, 0);

      // Calculate the coordinates of the bounding box on the canvas
      const x = boundingBox.left * img.width;
      const y = boundingBox.top * img.height;
      const boxWidth = boundingBox.width * img.width;
      const boxHeight = boundingBox.height * img.height;

      // Draw the bounding box on the canvas
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.rect(x, y, boxWidth, boxHeight);
      ctx.stroke();

      // Draw the tag name on the bounding box
      ctx.fillStyle = 'red';
      ctx.font = '16px Arial';
      ctx.fillText(tagName, x, y - 5);

      // Convert the modified image to base64 format
      const modifiedImage = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');

      resolve(modifiedImage);
    };

    img.onerror = function() {
      reject(new Error('Failed to load image.'));
    };
  });
}



export async function displayPage(eachPrintObj) {
    const header1 = document.querySelector('.popup-header1');
    const header2 = document.querySelector('.popup-header2');
    const body = document.querySelector('.popup-body');
    const next = document.querySelector('.popup-buttonR');
    const back = document.querySelector('.popup-buttonL');
    const close = document.querySelector('.popup-buttonC');
    const popupInfo = document.querySelector('.popup-info');
    console.log('displayPage (eachPrintObj): ', eachPrintObj)

    next.innerHTML  = eachPrintObj.buttonR
    back.innerHTML  = eachPrintObj.buttonL
    close.innerHTML = eachPrintObj.buttonC

    popupInfo.innerHTML = eachPrintObj.info;
    header1.innerHTML = eachPrintObj.head1;
    header2.innerHTML = eachPrintObj.head2;
    body.innerHTML = eachPrintObj.line;

    if (eachPrintObj.image) {
      const imageElement = Object.assign(document.createElement('img'), {
        src: eachPrintObj.image,
        alt: 'Visual Image',
        className: 'img-main',
      });
    
      body.appendChild(imageElement);
      const imgMainZindex = getComputedStyle(imageElement).getPropertyValue('z-index');

      const boundingBox = eachPrintObj.boundingBox;

      // Create a bounding box element
      const boundingBoxElement = document.createElement('div');
      boundingBoxElement.className = 'bounding-box';
      boundingBoxElement.style.left = boundingBox.left*200 + 'px';
      boundingBoxElement.style.top = boundingBox.top*200 + 'px';
      boundingBoxElement.style.width = boundingBox.width*1000 + 'px';
      boundingBoxElement.style.height = boundingBox.height*1000 + 'px';
      boundingBoxElement.style.border = '2px solid red'; // Add border to make it visible
      boundingBoxElement.className = 'img-overlay';
      boundingBoxElement.style.zIndex = parseInt(imgMainZindex) + 1;

      // Append the bounding box element to the body
      body.appendChild(boundingBoxElement);
    
      imageElement.addEventListener('click', () => {
        displayFullScreen(imageElement);
      });
    }
    
    next.style.display = eachPrintObj.buttonR === null ? 'none' : 'block';
    back.style.display = eachPrintObj.buttonL === null ? 'none' : 'block';
    popupInfo.style.display = eachPrintObj.info === null ? 'none' : 'block';
    
  } //displayDetailPage

function displayFullScreen(imageElement) {
  const popupContainer = document.querySelector('.popup-container');
  const popupMessage = document.querySelector('.popup-message');
  const originalZIndex = popupContainer.style.zIndex;
  const originalBackgroundColor = popupContainer.style.backgroundColor;


  popupContainer.style.zIndex = '999';
  popupContainer.style.backgroundColor = '#F2EEE4';
  popupMessage.style.display = 'none';

  const img = new Image();
  img.src = imageElement.src;
  popupContainer.appendChild(img);
  img.classList.add('full-screen-view');

  const exitButton = document.createElement('div');
  exitButton.classList.add('exit-button');
  exitButton.innerHTML = '<img src="./img/close.svg" alt="Close">';
  popupContainer.appendChild(exitButton);

  exitButton.addEventListener('click', () => {
    popupContainer.removeChild(img);
    popupContainer.removeChild(exitButton);
    popupContainer.style.zIndex = originalZIndex;
    popupContainer.style.backgroundColor = originalBackgroundColor;
    popupMessage.style.display = 'block';
  });
}

  

export function prepPageObj(header, results){
  const printObj = {};
  //Sequence order: printObj[0] for summary page, printObj[1][2] for results[0], [3][4] for results[2] and so on
  //printObj[1] for text and printObj[2] for image
  printObj[0] = {
    head1:  'Visual Inspection Summary',
    head2: `based on a total of ${results.length} Examined Visual(s)`,
    line:`- The Visual is Identified as ${results[0].audit.tag} Compliant.<br><br>`
        +`- With a Confidence Level of ${results[0].audit.probability}%<br><br><br>`
        +`- The perspective Dataset size is: ${header.header1}`,
    info: '<img src="./img/info.svg" alt="Next">',
    buttonR:'View All <img src="./img/next-w.svg" alt="Next">',
    buttonL: '',
    buttonC:'<img src="./img/close.svg" alt="Close">',
    buttonTag:'View All ',
    image: "",
    boundingBox: ""
  };
  for (let i = 0; i < results.length; i++) {
    printObj[(i*2)+1] = {
      head1: `Examined Visual ${i+1} of ${results.length}`,
      head2: "Inspection Details",
      line: `- The Visual is Identified as ${results[i].audit.tag}.<br><br>`
        + `- With a Confidence Level of ${results[i].audit.probability}%<br><br>`
        + `- Inspection Markers are shown below: `,
      info:'',    
      buttonR: 'Next <img src="./img/next-w.svg" alt="Next">',
      buttonTag:'Next',
      buttonL: 'Back <img src="./img/prev-w.svg" alt="Back">',
      buttonC:'<img src="./img/close.svg" alt="Close">',
      image: "",
      boundingBox: ""
    };
    printObj[(i*2)+2] = {
      head1: `Examined Visual ${i+1} of ${results.length}`,
      head2: "Marker Map", 
      info:'',
      line: "",
      buttonR: i === results.length-1  ? '' : 'Next <img src="./img/next-w.svg" alt="Next">',
      buttonTag:'Next',
      buttonL: 'Back <img src="./img/prev-w.svg" alt="Back">',
      buttonC:'<img src="./img/close.svg" alt="Close">',
      image: results[i].audit.image,
      boundingBox:  results[i].audit.boundingBox 
    };
  }
  
  return printObj
}

// Purpose: This function aims to select the two most "static" images from the scanImageArray for further audit check.
// The underlying assumption is that the images with minimal location difference from the last successful scan are more \
// likely to be the final images and suitable for audit check.

export function selectBestTwo(scanImageArray) {
  if (scanImageArray.length === 1) {
    // Only one element in the array, set both indexes to 0
    const finalImageDataArray = [
      scanImageArray[0].imageData,
      scanImageArray[0].imageData
    ];
    return finalImageDataArray;
  }

  // Find the indexes (i, j) with the lowest deltaX value
  let lowestDeltaX = Infinity;
  let iIndex = -1;
  let jIndex = -1;

  // Iterate through the scanImageArray to compare the deltaX values
  for (let i = 0; i < scanImageArray.length; i++) {
    for (let j = i + 1; j < scanImageArray.length; j++) {
      const deltaX = Math.abs(scanImageArray[i].deltaX - scanImageArray[j].deltaX);
      if (deltaX < lowestDeltaX) {
        lowestDeltaX = deltaX;
        iIndex = i;
        jIndex = j;
      }
    }
  }

  // Return the imageData of scanImageArray[iIndex] and scanImageArray[jIndex]
  const finalImageDataArray = [
    scanImageArray[iIndex].imageData,
    scanImageArray[jIndex].imageData
  ];

  return finalImageDataArray;
}
