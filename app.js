// global vars for GUI
let redBinaryArray      = [[]];
let greenBinaryArray    = [[]];
let blueBinaryArray     = [[]];
let selectedFormat      = "v1"; 
let selectedSize        = "16x96";

// global vars for animation logic
let currentMode = "static";
let pixelArrayFrames = [[]];
let currentFrameIndex = 0;
let totalFrames = 1;

// global vars for file JSON data
let speed           = 255;
let mode            = 1;
let pixelHeight     = 16;
let pixelWidth      = 96;
let stayTime        = 3;
let graffitiType    = 1;
let aniType         = 1;
let delays          = 250;
let dataType        = 1; // default to static

document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('pixelCanvas');
    const textDisplay = document.getElementById('textDisplay');
    const customColorPicker = document.getElementById('customColorPicker');
    const paletteIcon = document.getElementById('paletteIcon');
    const imageInput = document.getElementById('imageInput');

    let selectedColor = customColorPicker.value; // Set default color to the first option    
    let isPlaying = false; // Variable to track animation state    

    // --- Event Listeners for GUI ---

        // Function to handle button clicks
        function handleButtonClick(buttonId) {
            switch (buttonId) {
                case "backButton":
                    // Handle back button click
                    currentFrameIndex = Math.max(0, currentFrameIndex - 1);
                    break;
                case "playPauseButton":
                    // Handle play/pause button click
                    isPlaying = !isPlaying;
                    if (isPlaying) {
                        playAnimation();
                    }
                    break;
                case "forwardButton":
                    // Handle forward button click
                    currentFrameIndex = Math.min(totalFrames - 1, currentFrameIndex + 1);
                    break;
                case "plusButton":
                    // Handle plus button click
                    if (currentMode === "animation") {
                        addFrame();
                    }
                    break;
                default:
                    break;
            }

            // Update frame display after button click
            updateFrameDisplay();
            // Redraw pixels if in animation mode
            if (currentMode === "animation") {
                drawPixels();
            }
        }

        // Function to handle format change
        function handleFormatChange() {
            const formatDropdown = document.getElementById("formatDropdown");
            selectedFormat = formatDropdown.value;

        }

        // Function to handle paint bucket button click
        function handlePaintBucket() {

            // Set all pixels in the current array to the selected color
            pixelArrayFrames[currentFrameIndex] = createPixelArray(pixelWidth, pixelHeight);
            drawPixels();
            updateTextDisplay();

        }

        // Function to handle mode change
        function handleModeChange() {
            const modeDropdown = document.getElementById("modeDropdown");
            currentMode = modeDropdown.value;

            // Toggle the visibility of the control buttons based on the mode
            const controlButtons = document.getElementById("controlButtons");
            controlButtons.style.display = currentMode === "animation" ? "flex" : "none";
            dataType = currentMode === "animation" ? 0 : 1; // 0 = animation, 1 = static
        }

        // Event listener for mode dropdown change
        document.getElementById("modeDropdown").addEventListener("change", () => {
            handleModeChange();
            drawPixels(); // Redraw pixels when mode changes
        });

        // Event listener for file input change
        imageInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = new Image();
                    img.onload = function() {
                        loadPixelArrayFromImage(img);
                        drawPixels();
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });

        // Event listener for palette icon click
        paletteIcon.addEventListener('click', function() {
            openColorPicker();
        });

        // Function to handle size change
        function handleSizeChange() {
            const sizeDropdown      = document.getElementById("sizeDropdown");
            const selectedSize      = sizeDropdown.value;
            const [width, height]   = selectedSize.split("x").map(Number);

            pixelHeight             = height;
            pixelWidth              = width;

            // Set the selected format based on the size
            selectedFormat = selectedSize === "16x64" ? "v2" : "v1";
            Array.from(formatDropdown.options).forEach((option) => {
                option.selected = option.value === selectedFormat;
            });

            // Update your pixel array and canvas size here
            pixelArrayFrames[currentFrameIndex] = createPixelArray(width, height);
            drawPixels();
            updateTextDisplay();
        }

        // Function to toggle pixel color
        function togglePixel(row, col) {
            pixelArray[row][col] = selectedColor;
            drawPixels();
            updateTextDisplay();
        }

        // Function to toggle the debug text display
        function toggleDebugDisplay() {
            const textDisplay = document.getElementById("textDisplay");
            textDisplay.style.display = (textDisplay.style.display === "none") ? "block" : "none";

            // Toggle the color of the bug/debug icon
            const debugToggleIcon = document.getElementById("debugToggle");
            const isDebugVisible = textDisplay.style.display === "block";
            debugToggleIcon.style.color = isDebugVisible ? "green" : "black";
        }


        // Function to update palette icon color
        function updatePaletteIconColor() {
            paletteIcon.style.color = selectedColor;
        }

        // Function to open color picker
        window.openColorPicker = function() {
            customColorPicker.click();
        };


    // --- End Event Listeners for GUI ---

    // --- Binding of event listeners ---
    document.getElementById("sizeDropdown").addEventListener("change", handleSizeChange);
    document.getElementById("pixelSizeInput").addEventListener("input", drawPixels);
    document.getElementById("paintBucketButton").addEventListener("click", handlePaintBucket);

    // Event listener for custom color picker change
    customColorPicker.addEventListener('change', function() {
        selectedColor = customColorPicker.value;
        updatePaletteIconColor();
    });

    document.getElementById("formatDropdown").addEventListener("change", handleFormatChange);
    document.getElementById("debugToggle").addEventListener("click", toggleDebugDisplay);

    // Function to open file input
    window.openFileInput = function() {
        imageInput.click();
    };

    document.getElementById("backButton").addEventListener("click", () => handleButtonClick("backButton"));
    document.getElementById("playPauseButton").addEventListener("click", () => handleButtonClick("playPauseButton"));
    document.getElementById("forwardButton").addEventListener("click", () => handleButtonClick("forwardButton"));
    document.getElementById("plusButton").addEventListener("click", () => handleButtonClick("plusButton"));

    // --- End Binding of event listeners ---

    // --- Image Utility functions ---
      // Function to get the binary component for a specific color
        function getBinaryComponent(color, position) {
            color = color.toUpperCase();

            const colorMap = {
                '#000000': '000', // Black
                '#FF0000': '001', // Red
                '#00FF00': '010', // Green
                '#FFFF00': '011', // Yellow
                '#0000FF': '100', // Blue
                '#FF00FF': '101', // Magenta
                '#00FFFF': '110', // Cyan
                '#FFFFFF': '111' // White
            };

            currentColor = colorMap[color];
            const binaryValue = currentColor.substring(position, position + 1) ?? '0'

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

        // Function to quantize color to 3-bit color space using Euclidean distance
        function quantizeColor(red, green, blue) {
            // Define a set of eight predefined colors in 3-bit color space
            const colors = [
                [255, 0, 0], // Red
                [0, 255, 0], // Green
                [0, 0, 255], // Blue
                [255, 255, 0], // Yellow
                [255, 0, 255], // Magenta
                [0, 255, 255], // Cyan
                [255, 255, 255], // White
                [0, 0, 0] // Black
            ];

            // Find the nearest color in the predefined set using Euclidean distance
            const nearestColor = colors.reduce((nearest, color) => {
                const distance = Math.sqrt(
                    Math.pow(red - color[0], 2) +
                    Math.pow(green - color[1], 2) +
                    Math.pow(blue - color[2], 2)
                );

                return distance < nearest.distance ? {
                    color,
                    distance
                } : nearest;
            }, {
                color: null,
                distance: Infinity
            }).color;

            return rgbToHex(...nearestColor);
        }
    // --- End Image Utility functions ---

    // Function to create pixel array with default color
    function createPixelArray(width, height) {
        const NewPixelArray = Array.from({
                length: height
            }, () =>
            Array.from({
                length: width
            }, () => selectedColor) // Initialize with default color
        );
        return NewPixelArray;
    }

    // Function to load pixel array from image
    function loadPixelArrayFromImage(img) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;

        tempCtx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = tempCtx.getImageData(0, 0, img.width, img.height).data;

        pixelArrayFrames = [[]];
        currentFrameIndex = 0;
        totalFrames = 1;
        pixelArrayFrames[currentFrameIndex] = createPixelArray(img.width, img.height);

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

        pixelArrayFrames[currentFrameIndex] = pixelArray;
        drawPixels();
        updateTextDisplay();
    }

    // Function to draw pixels on the canvas
    function drawPixels() {
        const pixelCanvas       = document.getElementById("pixelCanvas");
        pixelCanvas.innerHTML   = ""; // Clear previous pixels

        const sizeDropdown      = document.getElementById("sizeDropdown");
        selectedSize            = sizeDropdown.value;
        const [height, width]   = selectedSize.split("x").map(Number);
        pixelHeight             = height;
        pixelWidth              = width;
        
        const pixelSizeInput    = document.getElementById("pixelSizeInput");
        const pixelSize         = parseInt(pixelSizeInput.value, 10) || 8; // Default to 8 if invalid or not provided

        // Calculate the width of each pixel based on the container size and array width
        const containerWidth = document.getElementById("pixelCanvasContainer").offsetWidth;

        pixelCanvas.style.gridTemplateColumns = `repeat(${width}, ${pixelSize}px)`;

        pixelArray = pixelArrayFrames[currentFrameIndex];

        pixelArray.forEach((row, rowIndex) => {
            row.forEach((color, columnIndex) => {
                const pixel                 = document.createElement("div");
                pixel.className             = "pixel";
                pixel.style.backgroundColor = color;                
                pixel.style.width           = `${pixelSize}px`;
                pixel.style.height          = `${pixelSize}px`;

                // Add click event listener for pixel editing
                pixel.addEventListener('click', () => togglePixel(rowIndex, columnIndex));

                pixelCanvas.appendChild(pixel);
            });

        });

        updateTextDisplay();
    }

    // Function to update text display below canvas with binary representation of 3-bit color space
    function updateTextDisplay() {

            pixelArray = pixelArrayFrames[currentFrameIndex];

            redBinaryArray[currentFrameIndex] =[];
            greenBinaryArray[currentFrameIndex] = [];
            blueBinaryArray[currentFrameIndex] = [];

            const rowLength = pixelArray[0].length;

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
                        redBinaryArray[currentFrameIndex].push(parseInt(redBinary, 2));
                        redBinary = '';
                    }

                    if (greenBinary.length === 8) {
                        greenBinaryArray[currentFrameIndex].push(parseInt(greenBinary, 2));
                        greenBinary = '';
                    }

                    if (blueBinary.length === 8) {
                        blueBinaryArray[currentFrameIndex].push(parseInt(blueBinary, 2));
                        blueBinary = '';
                    }
                }
            } // rowLength

        const redDecimalText    = `Red: [${redBinaryArray[currentFrameIndex].join(', ')}]`;
        const greenDecimalText  = `Green: [${greenBinaryArray[currentFrameIndex].join(', ')}]`;
        const blueDecimalText   = `Blue: [${blueBinaryArray[currentFrameIndex].join(', ')}]`;

        textDisplay.textContent = `${redDecimalText}\n\n${greenDecimalText}\n\n${blueDecimalText}`;
    }

    // --- Animation functions ---
        // Function to add a frame
        function addFrame() {

            const NewPixelArray = createPixelArray(pixelWidth, pixelHeight);

            pixelArrayFrames.push(NewPixelArray);   
            totalFrames = pixelArrayFrames.length;
            currentFrameIndex = totalFrames - 1; // Set current frame to the newly added frame

            newBinaryArray = Array(pixelWidth * pixelHeight).fill(0);

            redBinaryArray.push(newBinaryArray);
            greenBinaryArray.push(newBinaryArray);
            blueBinaryArray.push(newBinaryArray);

        }    

        // Function to update frame display
        function updateFrameDisplay() {
            const currentFrameSpan = document.getElementById("currentFrame");
            const totalFramesSpan = document.getElementById("totalFrames");
            currentFrameSpan.textContent = currentFrameIndex + 1;
            totalFramesSpan.textContent = totalFrames;
        }    

        // Function to play the animation
        function playAnimation() {
            const interval = 500; // Adjust the interval as needed (in milliseconds)

            function animate() {
                if (isPlaying) {
                    currentFrameIndex = (currentFrameIndex + 1) % totalFrames;
                    drawPixels();
                    updateFrameDisplay();
                    setTimeout(animate, interval);
                }
            }

            animate();
        }

    // --- End Animation functions ---

    // Initialize the GUI
    pixelArrayFrames[0] = createPixelArray(96, 16); // Create pixel array
    updatePaletteIconColor();
    handleModeChange();
    drawPixels();
});