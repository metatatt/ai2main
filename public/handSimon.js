// Copyright 2023 The MediaPipe Authors.


import {
    HandLandmarker,
    FilesetResolver
  } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";
  
  const demosSection = document.getElementById("demos");
  console.log('hand Simon')
  let handLandmarker = undefined;
  let runningMode = "IMAGE";
  let enableWebcamButton = document.getElementById("webcamButton");
  let webcamRunning = false;
  let angleDegArray =[];
  
  // Before we can use HandLandmarker class we must wait for it to finish
  // loading. Machine Learning models can be large and take a moment to
  // get everything needed to run.
  const createHandLandmarker = async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
        delegate: "GPU"
      },
      runningMode: runningMode,
      numHands: 2
    });
    demosSection.classList.remove("invisible");
    console.log('1-handLandmarker ',  handLandmarker)
  };
  createHandLandmarker();


  
  /********************************************************************
  // Demo 2: Continuously grab image from webcam stream and detect it.
  ********************************************************************/
  
  const video = document.getElementById("webcam");
  const canvasElement = document.getElementById(
    "output_canvas"
  ) ;
  const canvasCtx = canvasElement.getContext("2d");
  
  // Check if webcam access is supported.
  const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;
  
  // If webcam supported, add event listener to button for when user
  // wants to activate it.
  if (hasGetUserMedia()) {
    enableWebcamButton = document.getElementById("webcamButton");
    enableWebcamButton.addEventListener("click", enableCam);
  } else {
    console.warn("getUserMedia() is not supported by your browser");
  }
  
  // Enable the live webcam view and start detection.
  function enableCam() {
    console.log('2-handLandmarker ',  handLandmarker)
    if (!handLandmarker) {
      console.log("Wait! objectDetector not loaded yet.");
      return;
    }
  
    if (webcamRunning === true) {
      webcamRunning = false;
      enableWebcamButton.innerText = "ENABLE PREDICTIONS";
    } else {
      webcamRunning = true;
      enableWebcamButton.innerText = "DISABLE PREDICTIONS";
    }
  
    // getUsermedia parameters.
    const constraints = {
      video: true
    };
  
    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      video.srcObject = stream;
      video.addEventListener("loadeddata", predictWebcam);
    });
  }
  
  let lastVideoTime = -1;
  let results = undefined;
  const factorOne = 0.4
  console.log(video);
  async function predictWebcam() {
    canvasElement.style.width = video.videoWidth;;
    canvasElement.style.height = video.videoHeight;
    canvasElement.width = video.videoWidth;
    canvasElement.height = video.videoHeight;
    
    // Now let's start detecting the stream.
    if (runningMode === "IMAGE") {
      runningMode = "VIDEO";
      await handLandmarker.setOptions({ runningMode: "VIDEO" });
    }
    let startTimeMs = performance.now();
    if (lastVideoTime !== video.currentTime) {
      lastVideoTime = video.currentTime;
      results = handLandmarker.detectForVideo(video, startTimeMs);
      console.log('results ', results)
      console.log('videoElement ', video)

    }
  
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    if (results.landmarks) {
      console.log('resultLand ',results.landmarks )
      for (const landmarks of results.landmarks) {
          drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
            color: "#00FF00",
            lineWidth: 5
          }, factorOne);
          drawLandmarks(canvasCtx, landmarks, { color: "#FF0000", lineWidth: 2 }, factorOne);
          const pointAt = canvasLoc(landmarks[8],canvasElement.width ,canvasElement.height )
          const tf = isTwoFingerPointing(landmarks);
          enableWebcamButton.innerText = `${tf} -now pointing at:${pointAt.x} ${pointAt.y}`;
      }
    }
    canvasCtx.restore();
  
    // Call this function again to keep predicting when the browser is ready.
    if (webcamRunning === true) {
      window.requestAnimationFrame(predictWebcam);
    }
  }

  function canvasLoc(landmarks,canvasWidth,canvasHeight){
    const canvasX = landmarks.x*canvasWidth
    const canvasY = landmarks.y*canvasHeight
    return ({x: canvasX, y: canvasY})
    
  }
  function isTwoFingerPointing(landmarks){
    const newAngle = angleDeg(landmarks);
    angleDegArray.push(newAngle); // Use push to add newAngle to angleDegArray
    if (angleDegArray.length > 4) {
      angleDegArray.shift(); // Remove the first element to keep the array size to 4
    }
    const averageAngle = angleDegArray.reduce((sum, angle) => sum + angle, 0) / angleDegArray.length;
    console.log("Average Angle between vector A and B:", averageAngle);
    return averageAngle <= 8;
  }
  

  function angleDeg(landmarks) {
    const p5 = landmarks[5];
    const p8 = landmarks[8];
    const p9 = landmarks[9];
    const p12 = landmarks[12];
  
    // Calculate vectors A and B
    const vectorA = { x: p8.x - p5.x, y: p8.y - p5.y };
    const vectorB = { x: p12.x - p9.x, y: p12.y - p9.y };
  
    // Calculate the angle between vectors A and B
    const dotProduct = vectorA.x * vectorB.x + vectorA.y * vectorB.y;
    const magnitudeA = Math.sqrt(vectorA.x * vectorA.x + vectorA.y * vectorA.y);
    const magnitudeB = Math.sqrt(vectorB.x * vectorB.x + vectorB.y * vectorB.y);
    const cosAngle = dotProduct / (magnitudeA * magnitudeB);
    const angleRad = Math.acos(cosAngle);
    const angleDeg = (angleRad * 180) / Math.PI;
  
    console.log("Angle between vector A and B:", angleDeg);
    return angleDeg
  }
  

