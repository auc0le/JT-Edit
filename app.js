// global vars for GUI
let redBinaryArray      = [[]];
let greenBinaryArray    = [[]];
let blueBinaryArray     = [[]];
let selectedFormat      = "v1"; 
let selectedSize        = "16x96";
var mousedown_Gbl=-1;    //store mouse button event (-1 = none, 0 = right mouse button, 2 = left mouse button)

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

        // Function to handle play/pause/next button clicks
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
            updateTextDisplay();
            // Redraw pixels if in animation mode
            if (currentMode === "animation") {
                drawPixels();
            }
        }

        // clone and directional buttons
        document.getElementById('cloneFrameButton').addEventListener('click', function() {
            copyCurrentFrameToEnd();
            updateFrameDisplay();
            drawPixels();
            updateTextDisplay();
        });

        document.getElementById('upButton').addEventListener('click', function() {
            shiftImageUp();
            drawPixels();
            updateTextDisplay();
        });

        document.getElementById('leftButton').addEventListener('click', function() {
            shiftImageLeft();
            drawPixels();
            updateTextDisplay();
        });

        document.getElementById('downButton').addEventListener('click', function() {
            shiftImageDown();
            drawPixels();
            updateTextDisplay();
        });

        document.getElementById('rightButton').addEventListener('click', function() {
            shiftImageRight();
            drawPixels();
            updateTextDisplay();
        });


        // Function to handle v1 vs v2 format change
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

        // Function to handle animation vs static mode change
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
        imageInput.addEventListener('change', function (event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    if (file.type === 'image/jpeg' || file.type === 'image/png') {
                        const img = new Image();
                        img.onload = function () {
                            loadPixelArrayFromImage(img);
                            drawPixels();
                        };
                        img.src = e.target.result;
                    } else if (file.name.endsWith('.jt')) {
                        // If the file is a .JT file
                        loadPixelArrayFromJTFile(e.target.result);
                        drawPixels();
                    } else {
                        console.error('Unsupported file type');
                    }
                };

                if (file.name.endsWith('.jt')) {
                    reader.readAsText(file);
                } else {
                    reader.readAsDataURL(file);
                }
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

        // Function to draw pixel colors while dragging mouse
        function togglePixelOnce(row, col) {
            if (mousedown_Gbl==0){                      //will draw selectedColor when holding left mouse button
              pixelArray[row][col] = selectedColor;
            } else if (mousedown_Gbl==2) {              //will draw black when holding right mouse button
              pixelArray[row][col] = "#000000";
            }
            drawPixels();
            updateTextDisplay();
        }

        // Function to draw pixel colors while dragging mouse
        function togglePixel(row, col) {
            if (mousedown_Gbl==0){                      //will draw selectedColor when holding left mouse button
              pixelArray[row][col] = selectedColor;
              drawPixels();
              updateTextDisplay();
            } else if (mousedown_Gbl==2) {              //will draw black when holding right mouse button
              pixelArray[row][col] = "#000000";
              drawPixels();
              updateTextDisplay();
            }
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
    
    //Event listeners for mouse buttons -- allows pixels to be drawn while holding mouse buttons
    document.addEventListener("mouseup", function(){ mousedown_Gbl=-1; });
    document.addEventListener("mousedown", event => { mousedown_Gbl=event.button; });

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

 // Function to load pixel array from .JT file
function loadPixelArrayFromJTFile(data) {
    try {
        const jsonDataString = data.trim().replace(/^\[|\]$/g, '');
        const jsonData = JSON.parse(jsonDataString);

        // Check the data type
        dataType = jsonData.dataType;
        
        if (dataType === 0 && jsonData.data.aniData) {
            console.log("animation JT file");
            currentMode = 'animation';
            totalFrames = jsonData.data.frameNum;
            console.log("totalFrames " + totalFrames);

            // Populate pixelArrayFrames with each frame
            //ken change############################################################
            pixelHeight     = jsonData.data.pixelHeight;
            pixelWidth      = jsonData.data.pixelWidth;
            pixelArrayFrames = convertToPixelArrayFrames(jsonData.data.aniData, pixelWidth, pixelHeight, totalFrames);
            //convertToPixelArrayFrames(jsonData.data.aniData, pixelWidth, pixelHeight, totalFrames);

            //console.log(pixelArrayFrames);
            //pixelArrayFrames = jsonData.data.aniData.map(frameData => {
            //    return frameData.pixelArray.map(row => row.map(value => Number(value)));
            //});
            //ken change############################################################

        } else if (dataType === 1 && jsonData.data.graffitiData) {
            console.log("static JT file");
            currentMode = 'static';
            totalFrames = 1;

            pixelHeight     = jsonData.data.pixelHeight;
            //ken change############################################################
            //pixelWidth      = jsonData.datapixelWidth; //dot missing on original code
            pixelWidth      = jsonData.data.pixelWidth;
            //ken change############################################################

            pixelArrayFrames = convertJTDataToPixelArrayFrames(jsonData.data.graffitiData, pixelWidth, pixelHeight, totalFrames);
            console.log(pixelArrayFrames);

        } else {
            console.error('Unsupported data type');
        }

        updateGUIMode();
        drawPixels();
        updateTextDisplay();

    } catch (error) {
        console.error('Error loading .JT file:', error);
    }
}

// Function to update GUI based on the current mode
function updateGUIMode() {
    // Adjust the GUI elements based on the current mode
    // For example, show/hide play buttons, update dropdown options, etc.
}

function convertJTDataToPixelArrayFrames(jtData, pixelWidth, pixelHeight, totalFrames) {
    const pixelArrayFrames = [];
    const pixelsPerFrame = pixelWidth * pixelHeight;
    const totalPixels = pixelsPerFrame * totalFrames;

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
        const frameStartIndex = frameIndex * pixelsPerFrame * 3;
        const pixelArray = [];

        for (let i = 0; i < pixelHeight; i++) {
            const row = [];
            for (let j = 0; j < pixelWidth; j++) {
                const pixelIndex = i * pixelWidth + j;
                const redIndex = frameStartIndex + pixelIndex;
                const greenIndex = frameStartIndex + pixelIndex + totalPixels; // Offset for green values
                const blueIndex = frameStartIndex + pixelIndex + totalPixels * 2; // Offset for blue values

                const red = jtData[redIndex];
                const green = jtData[greenIndex];
                const blue = jtData[blueIndex];
                
                const hexColor = rgbToHex(red, green, blue);
                row.push(hexColor);
            }
            pixelArray.push(row);
        }
        pixelArrayFrames.push(pixelArray);
    }
    return pixelArrayFrames;
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

                // Add click event listeners for pixel editing
                pixel.addEventListener('mouseover', () => {togglePixel(rowIndex, columnIndex)});
                pixel.addEventListener('mousedown', () => {togglePixelOnce(rowIndex, columnIndex)});
                //prevent context menu when using right mouse button
                pixel.addEventListener("contextmenu", event => {event.preventDefault();return false;});

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
        }    
        // Function to clone the current frame and put at the end
        function copyCurrentFrameToEnd() {
            if (pixelArrayFrames && pixelArrayFrames.length > 0 && currentFrameIndex >= 0) {
                const currentFrame = pixelArrayFrames[currentFrameIndex];
                const newFrame = JSON.parse(JSON.stringify(currentFrame));
                pixelArrayFrames.push(newFrame);

                totalFrames = pixelArrayFrames.length;
                currentFrameIndex = totalFrames - 1; // Set current frame to the newly added frame

            } else {
                console.error("No frame selected or frames array is empty.");
            }
        }

        function shiftImageUp() {
            if (pixelArrayFrames && pixelArrayFrames.length > 0 && currentFrameIndex >= 0) {
                const currentFrame = pixelArrayFrames[currentFrameIndex];
                const firstRow = currentFrame.shift();
                currentFrame.push(firstRow);

            } else {
                console.error("No frame selected or pixelArrayFrames is empty.");
            }
        }

        function shiftImageLeft() {
            if (pixelArrayFrames && pixelArrayFrames.length > 0 && currentFrameIndex >= 0) {
                const currentFrame = pixelArrayFrames[currentFrameIndex];
                const numberOfRows = currentFrame.length;
                const numberOfColumns = currentFrame[0].length;

                for (let row = 0; row < numberOfRows; row++) {
                    const firstElement = currentFrame[row].shift();
                    currentFrame[row].push(firstElement);
                }
            } else {
                console.error("No frame selected or pixelArrayFrames is empty.");
            }
        }

        function shiftImageDown() {
            if (pixelArrayFrames && pixelArrayFrames.length > 0 && currentFrameIndex >= 0) {
                const currentFrame = pixelArrayFrames[currentFrameIndex];    
                const lastRow = currentFrame.pop();
         
                currentFrame.unshift(lastRow);

            } else {
                console.error("No frame selected or pixelArrayFrames is empty.");
            }
        }

        function shiftImageRight() {
            if (pixelArrayFrames && pixelArrayFrames.length > 0 && currentFrameIndex >= 0) {
                const currentFrame = pixelArrayFrames[currentFrameIndex];
                const numberOfRows = currentFrame.length;

                for (let row = 0; row < numberOfRows; row++) {
                    const lastElement = currentFrame[row].pop();
                    currentFrame[row].unshift(lastElement);
                }
            } else {
                console.error("No frame selected or pixelArrayFrames is empty.");
            }
        }

        // Function to update frame display / frame count
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
init();
});


//ken fuctions###########################################################################
//reads animation data from coolLED v2.1.6
function convertToPixelArrayFrames(jtData, pixelWidth, pixelHeight, totalFrames) {
    //set the size
    document.getElementById("sizeDropdown").value=pixelHeight.toString()+"x"+pixelWidth.toString();
    //set to frame 0
    currentFrameIndex=0;
    document.getElementById("backButton").click()
    const pixelArrayFrames = [];
    //const pixelsPerFrame = pixelWidth * pixelHeight;
    //const totalPixels = pixelsPerFrame * totalFrames;
    const pixelsPerColor = pixelWidth * pixelHeight/8   //is 64 for 16x32 file, 64*3=192 elements for 3 colors
    var i,j;var curRow;var frameIndex;var curRowx=0;
    var redArr=[];var greenArr=[];var blueArr=[];
    var redArrFm=[];var greenArrFm=[];var blueArrFm=[];
    var redbit=[];var greenbit=[];var bluebit=[];
    var redrow=[];var greenrow=[];var bluerow=[];
    var temparr=[];var tempred=[];var tempgrn=[];var tempblu=[];

    //read jtDdata into color arrays
    var greenoffset = pixelsPerColor*totalFrames    //64*2   = 128 
    var blueoffset  = pixelsPerColor*totalFrames*2  //64*2*2 = 256
    for (i=0;i<greenoffset;i++){         
      redArr.push(jtData[i]);
    }
    for (i=greenoffset;i<blueoffset;i++){         
      greenArr.push(jtData[i])
    }
    for (i=blueoffset;i<jtData.length;i++){         
      blueArr.push(jtData[i])
    }

    //push color data to color frame arrays
    for (frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      tempred=[];tempgrn=[];tempblu=[];
      for (i=frameIndex*pixelsPerColor;i<frameIndex*pixelsPerColor+pixelsPerColor;i++) {
        tempred.push(redArr[i])
        tempgrn.push(greenArr[i])
        tempblu.push(blueArr[i])
      }
    redArrFm.push(tempred);
    greenArrFm.push(tempgrn);
    blueArrFm.push(tempblu);
    }//frame

  //populate color row arrays with pixelframe data
  for (frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    redbit=[];greenbit=[];bluebit=[];pixelArray = []
  //pixelframe data is in bit positions 7 to 0 for each group of eight in pixel columns
  for (j=0;j<pixelsPerColor;j++){ //get values from color arrays
    for (curRow=0;curRow<pixelHeight;curRow++){  //16 rows per col, 8 rows per array element
      //each color in array is 8 rows
        if ( curRow%8 == 0 && curRow!=0 ){j++;}
        redrow[curRow] = bitshft(redArrFm[frameIndex][j],7-curRow % 8)
        greenrow[curRow] = bitshft(greenArrFm[frameIndex][j],7-curRow % 8)
        bluerow[curRow] = bitshft(blueArrFm[frameIndex][j],7-curRow % 8)
    }//curRow
    //push arrays
        redbit.push(redrow);
        greenbit.push(greenrow);
        bluebit.push(bluerow);
        redrow=[];greenrow=[];bluerow=[]
  }//color arr

  //generate pixelframe array from color arrays
    for (curRow=0;curRow<pixelHeight;curRow++){
      temparr=[]  
      for (j=0;j<redbit.length;j++){
        temparr.push( putBinaryComponent( bluebit[j][curRow].toString()+greenbit[j][curRow].toString()+redbit[j][curRow].toString() ) )
      } 
      pixelArray.push(temparr)
    }//curRow
    pixelArrayFrames.push(pixelArray)
  }//frame

return pixelArrayFrames
}//function

//bit shift function
function bitshft(myint,n){return (myint >> n) & 0x1;}

function putBinaryComponent(color) {
            color = color.toUpperCase();
            const colorMap = {
                '000':'#000000', // Black
                '001':'#FF0000', // Red
                '010':'#00FF00', // Green
                '011':'#FFFF00', // Yellow
                '100':'#0000FF', // Blue
                '101':'#FF00FF', // Magenta
                '110':'#00FFFF', // Cyan
                '111':'#FFFFFF' // White
            };
            return colorMap[color];
}            

function myupdate(){
  document.getElementById('upButton').click();document.getElementById('downButton').click();
}

function init(){
document.getElementById("sizeDropdown").value="16x32";
document.getElementById("customColorPicker").value="#000000"
document.getElementById("paletteIcon").style.color="#000000"
var myevent = new Event('change');
document.getElementById("customColorPicker").dispatchEvent(myevent)
document.getElementById("paintBucketButton").click();
document.getElementById("debugToggle").click();
}
