document.addEventListener('DOMContentLoaded', function () {
    const canvas = document.getElementById('pixelCanvas');
    const textDisplay = document.getElementById('textDisplay');
    const customColorPicker = document.getElementById('customColorPicker');
    const paletteIcon = document.getElementById('paletteIcon');
    const imageInput = document.getElementById('imageInput');
    let selectedColor = customColorPicker.value; // Set default color to the first option

    // Event listener for custom color picker change
    customColorPicker.addEventListener('change', function () {
        selectedColor = customColorPicker.value;
        updatePaletteIconColor();
    });

    // Event listener for file input change
    imageInput.addEventListener('change', function (event) {
        const file = event.target.files[0];

        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = new Image();
                img.onload = function () {
                    loadPixelArrayFromImage(img);
                    drawPixels();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Event listener for palette icon click
    paletteIcon.addEventListener('click', function () {
        openColorPicker();
    });

    let pixelArray = createPixelArray(96, 16); // Create pixel array

    // Function to create pixel array with default color
    function createPixelArray(width, height) {
        const pixelArray = Array.from({ length: height }, () =>
            Array.from({ length: width }, () => selectedColor) // Initialize with default color
        );
        return pixelArray;
    }


    // Function to load pixel array from image
    function loadPixelArrayFromImage(img) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;

        tempCtx.drawImage(img, 0, 0, img.width, img.height);

        const imageData = tempCtx.getImageData(0, 0, img.width, img.height).data;
        pixelArray = createPixelArray(img.width, img.height);

        let dataIndex = 0;
        for (let y = 0; y < img.height; y++) {
            for (let x = 0; x < img.width; x++) {
                const red = imageData[dataIndex];
                const green = imageData[dataIndex + 1];
                const blue = imageData[dataIndex + 2];

                // Convert to 3-bit color space
                const quantizedColor = quantizeColor(red, green, blue);
                pixelArray[y][x] = quantizedColor;

                dataIndex += 4; // Move to the next pixel in the image data (RGBA format)
            }
        }

        drawPixels();
        updateTextDisplay();
    }

    // Function to quantize color to 3-bit color space
    function quantizeColor(red, green, blue) {
        // Define a set of seven predefined colors in 3-bit color space (excluding gray)
        const colors = [
            [255, 0, 0],    // Red
            [0, 255, 0],    // Green
            [0, 0, 255],    // Blue
            [255, 255, 0],  // Yellow
            [255, 0, 255],  // Magenta
            [0, 255, 255],  // Cyan
            [0, 0, 0]       // Black
        ];

        // Find the closest color in the predefined set
        const closestColor = colors.reduce((closest, color) => {
            const distance = Math.abs(red - color[0]) + Math.abs(green - color[1]) + Math.abs(blue - color[2]);
            return distance < closest.distance ? { color, distance } : closest;
        }, { color: null, distance: Infinity }).color;

        return rgbToHex(...closestColor);
    }

    // Function to draw pixels on canvas
    function drawPixels() {
        canvas.innerHTML = ''; // Clear the canvas

        pixelArray.forEach((row, rowIndex) => {
            row.forEach((color, columnIndex) => {
                const pixel = document.createElement('div');
                pixel.className = 'pixel';
                pixel.style.backgroundColor = color;
                pixel.addEventListener('click', () => togglePixel(rowIndex, columnIndex));
                canvas.appendChild(pixel);
            });
        });

        updateTextDisplay();
    }

    // Function to toggle pixel color
    function togglePixel(row, col) {
        pixelArray[row][col] = selectedColor;
        drawPixels();
        updateTextDisplay();
    }

    // Function to update text display below canvas with binary representation of 3-bit color space
    function updateTextDisplay() {
        const rowLength = pixelArray[0].length;
        let redBinaryArray = [];
        let greenBinaryArray = [];
        let blueBinaryArray = [];

        for (let j = 0; j < rowLength; j++) {
            let redBinary = '';
            let greenBinary = '';
            let blueBinary = '';

            for (let i = 0; i < pixelArray.length; i++) {
                const color = pixelArray[i][j];
                const redValue = getBinaryComponent(color, 2);
                const greenValue = getBinaryComponent(color, 1);
                const blueValue = getBinaryComponent(color, 0);

                redBinary += redValue;
                greenBinary += greenValue;
                blueBinary += blueValue;

                // Group every 8 bits and convert to decimal
                if (redBinary.length === 8) {
                    redBinaryArray.push(parseInt(redBinary, 2));
                    redBinary = '';
                }

                if (greenBinary.length === 8) {
                    greenBinaryArray.push(parseInt(greenBinary, 2));
                    greenBinary = '';
                }

                if (blueBinary.length === 8) {
                    blueBinaryArray.push(parseInt(blueBinary, 2));
                    blueBinary = '';
                }
            }
        }

        const redDecimalText = `Red: [${redBinaryArray.join(', ')}]`;
        const greenDecimalText = `Green: [${greenBinaryArray.join(', ')}]`;
        const blueDecimalText = `Blue: [${blueBinaryArray.join(', ')}]`;

        textDisplay.textContent = `${redDecimalText}\n\n${greenDecimalText}\n\n${blueDecimalText}`;
    }

    // Function to get the binary component for a specific color
    function getBinaryComponent(color, position) {
        
        color = color.toUpperCase();

        const colorMap = {
            '#000000': '000',   // Black
            '#FF0000': '001',   // Red
            '#00FF00': '010',   // Green
            '#FFFF00': '011',   // Yellow
            '#0000FF': '100',   // Blue
            '#FF00FF': '101',   // Magenta
            '#00FFFF': '110',   // Cyan
            '#FFFFFF': '111'    // White'
        };

        currentColor = colorMap[color];
        const binaryValue = currentColor.substring(position,position+1) ?? '0'

        return binaryValue
    }

    // Function to convert hex to RGB
    function hexToRgb(hex) {
        const bigint = parseInt(hex.slice(1), 16);
        const red = (bigint >> 16) & 255;
        const green = (bigint >> 8) & 255;
        const blue = bigint & 255;
        return [red, green, blue];
    }

    // Function to convert RGB to hex
    function rgbToHex(r, g, b) {
        return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
    }

    // Function to update palette icon color
    function updatePaletteIconColor() {
        paletteIcon.style.color = selectedColor;
    }

    // Function to open color picker
    window.openColorPicker = function () {
        customColorPicker.click();
    };

    // Function to open file input
    window.openFileInput = function () {
        imageInput.click();
    };

    // Initialize with default color
    updatePaletteIconColor();
    drawPixels();
});
