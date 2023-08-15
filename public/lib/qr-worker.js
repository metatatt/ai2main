self.addEventListener('message', async event => {
  console.log('qr  ' )
  let result = ''; // Initialize result as an empty string
  const imageData = event.data.imageData;
  console.log('qr img ', imageData)
  try {
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, { // Use imageData.width and imageData.height
          inversionAttempts: 'dontInvert',
      });
      
      if (qrCode && qrCode.data.startsWith('@pr-')) { // Change "code" to "qrCode"
        result = {
          time: new Date().getTime(),
          readyFor:'qr',
          cv: null,
          qr:qrCode.data,
        };
        console.log('qr result--', result)
      }
  } catch (error) {
      console.error('Error decoding QR code:', error);
      return null;
  }
  console.log('qr result--', result)
  self.postMessage(result);
});
