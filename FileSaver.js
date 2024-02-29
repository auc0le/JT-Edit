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

        let graffitiDataArray = [...redBinaryArray, ...greenBinaryArray, ...blueBinaryArray];
        let jsonData = "";

        if (selectedFormat == "v1") {
            // Generate JSON data with the specified format
            jsonData = {
                graffitiData:   graffitiDataArray,
                graffitiType:   graffitiType,
                mode:           mode,
                pixelHeight:    pixelHeight,
                pixelWidth:     pixelWidth,
                speed:          speed,
                stayTime:       stayTime
            };

        } else if (selectedFormat == "v2") {
            // Generate JSON data with the specified format
            jsonData = {
                speed:          speed,
                mode:           mode,
                pixelHeight:    pixelHeight,
                stayTime:       stayTime,
                graffitiData:   graffitiDataArray,
                pixelWidth:     pixelWidth,
                graffitiType:   graffitiType
            };
        }

        return [{
            data: jsonData,
            dataType: 1
        }];

    }