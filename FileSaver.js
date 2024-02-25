// Function to initialize a 2D pixel array
function createPixelArray(width, height) {
    return Array.from({ length: height }, () => Array(width).fill('#000000'));
}

// Declare pixelArray variable
let pixelArray = createPixelArray(96, 16);

// Function to save pixel data to a .jt file
function saveToFile() {
    const jsonData = generateJsonData();
    const blob = new Blob([JSON.stringify(jsonData)], { type: 'application/json' });
    const fileName = 'your-file-name.jt'; // Change 'your-file-name' to your desired file name
    saveAs(blob, fileName);
}

// Function to generate JSON data for .jt file
function generateJsonData() {
    const rowLength = pixelArray[0].length;
    let decimalArray = [];

    for (let j = 0; j < rowLength; j++) {
        let decimalString = '';
        for (let i = 0; i < pixelArray.length; i++) {
            const color = pixelArray[i][j];
            const decimalValue = color === '#000000' ? 0 : 255;
            decimalString += decimalValue.toString();

            // Group every 8 bits and convert to decimal
            if (decimalString.length === 8) {
                decimalArray.push(parseInt(decimalString, 2));
                decimalString = '';
            }
        }
    }

    // Generate JSON data with the specified format
    const jsonData = {
        data: {
            graffitiData: decimalArray
        },
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
