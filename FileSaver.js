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
       
      //update xxxBinaryArrays
      var tempFrameIndex = currentFrameIndex
      if (currentMode == "static") {
        currentFrameIndex=0;updateTextDisplay();
      }else{
        for (var i=0;i<totalFrames;i++){currentFrameIndex=i;updateTextDisplay();}
      }
      currentFrameIndex = tempFrameIndex 

        let graffitiDataArray = [...redBinaryArray.flat(), ...greenBinaryArray.flat(), ...blueBinaryArray.flat()];
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
