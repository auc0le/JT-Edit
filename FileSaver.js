    // Function to save pixel data to a .jt file
    function saveToFile() {
      if (selectedFormat != "png") {
        const jsonData = generateJsonData();
        const blob = new Blob([JSON.stringify(jsonData)], {
            type: 'application/json'
        });
        const fileName = jtFileName; // Change 'your-file-name' to your desired file name
        saveAs(blob, fileName);
      }else{
        if (currentMode == 'static'){
          savePixelArrayAsImage(imageFileName);
        }else{
          var tempFrameIndex = currentFrameIndex
          for (var i=0;i<totalFrames;i++){
            currentFrameIndex=i
            if (i<10){
              savePixelArrayAsImage(animationFileName.split(".")[0]+"_0"+i.toString()+"."+animationFileName.split(".")[1]);
            }else{
              savePixelArrayAsImage(animationFileName.split(".")[0]+"_"+i.toString()+"."+animationFileName.split(".")[1]);
            }//i
          }//for
        }//endif
        currentFrameIndex = tempFrameIndex
      }//png format
    }//saveToFile

    // Function to generate JSON data for .jt file
    function generateJsonData() {
       
      let graffitiDataArray;
      
      if (colorFormat === '24bit') {
        // Generate Type 2 (24-bit RGB) data array
        graffitiDataArray = generateType2DataArray();
      } else {
        // Generate Type 1 (3-bit indexed) data array using existing logic
        var tempFrameIndex = currentFrameIndex
        if (currentMode == "static") {
          currentFrameIndex=0;updateTextDisplay();
        }else{
          for (var i=0;i<totalFrames;i++){currentFrameIndex=i;updateTextDisplay();}
        }
        currentFrameIndex = tempFrameIndex 
        graffitiDataArray = [...redBinaryArray.flat(), ...greenBinaryArray.flat(), ...blueBinaryArray.flat()];
      }
      
      let jsonData = "";

        if (selectedFormat == "v1") {

            if (currentMode == "static") {
                jsonData = {
                    graffitiData:   graffitiDataArray,
                    graffitiType:   graffitiType,
                    mode:           mode,
                    pixelHeight:    pixelHeight,
                    pixelWidth:     pixelWidth,
                    speed:          speed,
                    stayTime:       stayTime
                };
            } else if (currentMode == "animation") {
                jsonData = {
                    aniData:        graffitiDataArray,
                    aniType:        aniType,
                    delays:         delays,
                    frameNum:       totalFrames,  
                    pixelHeight:    pixelHeight,
                    pixelWidth:     pixelWidth
                };
            }

        } else if (selectedFormat == "v2") {
            
            if (currentMode == "static") {
                jsonData = {
                    speed:          speed,
                    mode:           mode,
                    pixelHeight:    pixelHeight,
                    stayTime:       stayTime,
                    graffitiData:   graffitiDataArray,
                    pixelWidth:     pixelWidth,
                    graffitiType:   graffitiType
                };
            } else if (currentMode == "animation") {
                jsonData = {
                    pixelWidth:     pixelWidth,
                    aniData:        graffitiDataArray,
                    frameNum:       totalFrames,  
                    delays:         delays,
                    aniType:        aniType,
                    pixelHeight:    pixelHeight
                    
                };                
            }
        }

        return [{
            data: jsonData,
            dataType: dataType
        }];

    }
// Function to save pixel array as image
function savePixelArrayAsImage(fn) {
  var row,col,i,j

  var tempCanvas = document.createElement('canvas');
  var tempCtx = tempCanvas.getContext('2d');
  tempCanvas.width = selectedSize.split('x')[1] 
  tempCanvas.height = selectedSize.split('x')[0]
  //var imgData = {width:tempCanvas.width, height:tempCanvas.height, data: new Uint8ClampedArray(tempCanvas.width*tempCanvas.height*4) }
  var imgData = tempCtx.createImageData(tempCanvas.width, tempCanvas.height);

  var dataIndex=0;
  pixelArray = pixelArrayFrames[currentFrameIndex]

  //populate RGBA imgData[width:w, height:h, data:red,grn,blu,alph].data array from pixelArray[row][col]
  for (row=0;row<pixelArray.length;row++){
    for (col=0;col<pixelArray[0].length;col++){
      imgData.data[dataIndex] = pixarrToRgb(pixelArray[row][col])[0] //red
      imgData.data[dataIndex+1] = pixarrToRgb(pixelArray[row][col])[1] //green
      imgData.data[dataIndex+2] = pixarrToRgb(pixelArray[row][col])[2] //blue
      imgData.data[dataIndex+3] = 255                                  //alpha
      dataIndex+=4                                                     
    }
  }  
  tempCtx.putImageData(imgData, 0, 0);
  //save image
  var MIME_TYPE = "image/png";
  var imgURL = tempCanvas.toDataURL(MIME_TYPE);
  var dlLink = document.createElement('a');
  dlLink.download = fn;
  dlLink.href = imgURL;
  dlLink.dataset.downloadurl = [MIME_TYPE, dlLink.download, dlLink.href].join(':');
  document.body.appendChild(dlLink);
  dlLink.click();
  document.body.removeChild(dlLink);
}

// Function to generate Type 2 (24-bit RGB) data array
function generateType2DataArray() {
  let dataArray = [];
  
  if (currentMode === "static") {
    // Static image - single frame
    const frame = pixelArrayFrames[0];
    dataArray = generateType2FrameData(frame);
  } else if (currentMode === "animation") {
    // Animation - multiple frames
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      const frame = pixelArrayFrames[frameIndex];
      const frameData = generateType2FrameData(frame);
      dataArray = dataArray.concat(frameData);
    }
  }
  
  return dataArray;
}

// Function to generate Type 2 data for a single frame
function generateType2FrameData(frame) {
  const frameHeight = frame.length;
  const frameWidth = frame[0].length;
  let dataArray = [];
  
  // Handle different panel layouts based on dimensions
  if (frameHeight === 24 && (frameWidth === 48 || frameWidth === 64)) {
    // 24x48 or 24x64 panels use dual-block, column-major format
    const blockWidth = frameWidth / 2;
    
    // Generate Left Block (columns 0 to blockWidth-1) in column-major order
    for (let col = 0; col < blockWidth; col++) {
      for (let row = 0; row < frameHeight; row++) {
        const hexColor = frame[row][col];
        const rgb = hexToRgb(hexColor);
        dataArray.push(rgb.r, rgb.g, rgb.b);
      }
    }
    
    // Generate Right Block (columns blockWidth to frameWidth-1) in column-major order
    for (let col = blockWidth; col < frameWidth; col++) {
      for (let row = 0; row < frameHeight; row++) {
        const hexColor = frame[row][col];
        const rgb = hexToRgb(hexColor);
        dataArray.push(rgb.r, rgb.g, rgb.b);
      }
    }
  } else {
    // Standard format for other sizes (row-major)
    for (let row = 0; row < frameHeight; row++) {
      for (let col = 0; col < frameWidth; col++) {
        const hexColor = frame[row][col];
        const rgb = hexToRgb(hexColor);
        dataArray.push(rgb.r, rgb.g, rgb.b);
      }
    }
  }
  
  return dataArray;
}

// Function to convert hex color to RGB values
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}
