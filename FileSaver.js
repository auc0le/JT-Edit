    // Function to save pixel data to a .jt file
    function saveToFile() {
        const jsonData = generateJsonData();
        const blob = new Blob([JSON.stringify(jsonData)], {
            type: 'application/json'
        });
        const fileName = 'image.jt'; // Change 'your-file-name' to your desired file name
        saveAs(blob, fileName);
    }

    // Function to generate JSON data for .jt file
    function generateJsonData() {

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
            } else if (currentMode = "Animation") {
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
            } else if (currentMode = "Animation") {
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