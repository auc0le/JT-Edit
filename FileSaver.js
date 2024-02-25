// Function to save pixel data to a .jt file
function saveToFile() {
    const jsonData = generateJsonData();
    const blob = new Blob([JSON.stringify(jsonData)], { type: 'application/json' });
    const fileName = 'image.jt'; // Change 'your-file-name' to your desired file name
    saveAs(blob, fileName);
}

// Function to generate JSON data for .jt file
function generateJsonData() {

    let graffitiDataArray = [...redBinaryArray, ...greenBinaryArray, ...blueBinaryArray];

    // Generate JSON data with the specified format
    const jsonData = {
        graffitiData: graffitiDataArray,
        graffitiType: 1,
        mode: 1,
        pixelHeight: 16,
        pixelWidth: 96,
        speed: 255,
        stayTime: 3
    };

    return [{
        data: jsonData,
        dataType: 1
    }];
}
