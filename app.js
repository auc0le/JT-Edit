// global vars, set for preferred GUI start settings
var selectedFormat      = "v1";                //file format
var selectedSize        = "16x32";             //initial canvas size
var startColor          = "#FFFFFF";           //left mouse btn initial pixel paint color in hex format
var rtmouseBtnColor     = "#000000";           //right mouse btn initial pixel paint color in hex format
var initialPixelSize    = "20";                //initial pixel size
var currentMode         = "static";            //initial mode of static or animation
var bgColor             = "#b2b2b2";           //body background color in hex format
var jtFileName          = "image.jt";          //default save filename for jt files
var imageFileName       = "coolLED_img.png";   //default save filename for image files
var animationFileName   = "coolLED_ani.png";   //base save filename for animation files
var debug_GBL=false;                           //set to false to disable the debug_init() function

//globals for swap frames dialog
var diag_idx1=1;                               
var diag_idx2=2;                               

// global vars for GUI
var selectedColor
let redBinaryArray      = [[]];
let greenBinaryArray    = [[]];
let blueBinaryArray     = [[]];
var mousebtn_Gbl=-1;    //store mouse button event (-1 = none, 0 = right mouse button, 2 = left mouse button)

// global vars for animation logic
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
let colorFormat     = '3bit'; // '3bit' or '24bit'
let recentColors    = []; // Array to store recently used colors in 24-bit mode

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

// Helper function to convert hex to RGB values
function hexToRgbValues(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : {r: 0, g: 0, b: 0};
}

document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('pixelCanvas');
    const textDisplay = document.getElementById('textDisplay');
    const customColorPicker = document.getElementById('customColorPicker');
    const paletteIcon = document.getElementById('paletteIcon');
    const imageInput = document.getElementById('imageInput');
    const colorFormatDropdown = document.getElementById('colorFormatDropdown');
    
    //set customColorPicker dropdown option to the startColor global var
    customColorPicker.value=startColor;
    selectedColor = customColorPicker.value; // Set selectedColor from dropdown   
    
    //set dropdowns to match global vars
    document.getElementById("pixelSizeInput").value=initialPixelSize;
    document.getElementById("sizeDropdown").value=selectedSize;
    document.getElementById("formatDropdown").value=selectedFormat;
    document.getElementById("modeDropdown").value=currentMode;
    
    // Initialize color picker visibility (will be called after functions are defined)

    let isPlaying = false; // Variable to track animation state

    //set the background color
    document.body.style.backgroundColor=bgColor;

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
                case "minusButton":
                    // Handle minus button click
                    if (currentMode === "animation") {
                        deleteFrame();
                    }
                    break;
                case "swapButton":
                    // Handle minus button click
                    if (currentMode === "animation") {
                        swap_diag();
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

        // Function to handle color format change
        function handleColorFormatChange() {
            const colorFormatDropdown = document.getElementById("colorFormatDropdown");
            const oldFormat = colorFormat;
            colorFormat = colorFormatDropdown.value;
            
            // Update graffitiType and aniType based on color format
            if (colorFormat === '24bit') {
                graffitiType = 2;
                aniType = 2;
            } else {
                graffitiType = 1;
                aniType = 1;
            }
            
            // Update color picker visibility
            updateColorPickerVisibility();
            
            // Convert existing pixel data if format changed
            if (oldFormat !== colorFormat && pixelArrayFrames && pixelArrayFrames.length > 0) {
                convertPixelArrayFormat(oldFormat, colorFormat);
                drawPixels();
                updateTextDisplay();
            }
            
            console.log("Color format changed to:", colorFormat);
        }

        // Function to convert pixel array between formats
        function convertPixelArrayFormat(fromFormat, toFormat) {
            if (fromFormat === toFormat) return;
            
            for (let frameIndex = 0; frameIndex < pixelArrayFrames.length; frameIndex++) {
                const frame = pixelArrayFrames[frameIndex];
                for (let row = 0; row < frame.length; row++) {
                    for (let col = 0; col < frame[row].length; col++) {
                        const currentColor = frame[row][col];
                        
                        if (fromFormat === '24bit' && toFormat === '3bit') {
                            // Convert 24-bit to 3-bit by quantizing
                            const rgb = hexToRgbValues(currentColor);
                            const quantizedColor = quantizeColor(rgb.r, rgb.g, rgb.b);
                            frame[row][col] = quantizedColor;
                        }
                        // For 3-bit to 24-bit, no conversion needed - colors are already valid hex
                    }
                }
            }
        }


        // Function to handle paint bucket button click
        function handlePaintBucket() {
            // Set all pixels in the current array to the selected color
            pixelArrayFrames[currentFrameIndex] = createPixelArray(pixelHeight, pixelWidth, selectedColor);
            drawPixels();
            updateTextDisplay();
        }

        // Function to handle RMB paint bucket button click
        function RMBhandlePaintBucket() {
            // Set all pixels in the current array to the selected color
            pixelArrayFrames[currentFrameIndex] = createPixelArray(pixelHeight, pixelWidth, rtmouseBtnColor);
            drawPixels();
            updateTextDisplay();
        }

        // Function to handle animation vs static mode change
        function handleModeChange() {
            //stop animation
            isPlaying=false;
            const modeDropdown = document.getElementById("modeDropdown");
            currentMode = modeDropdown.value;

            // Toggle the visibility of the control buttons based on the mode
            const controlButtons = document.getElementById("controlButtons");
            controlButtons.style.display = currentMode === "animation" ? "block" : "none";
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

        // Event listener for right click icon click
        document.getElementById("rtclickIcon").style.color = rtmouseBtnColor
        document.getElementById("rtclickIcon").addEventListener("mousedown", changermbColor);
        // Event listener for document, disable context menu and assign mousebtn_Gbl event.button
        document.addEventListener("contextmenu", event => {mousebtn_Gbl=event.button;event.preventDefault();return false;});

        // Function to handle size change
        function handleSizeChange() {
            //stop animation  
            isPlaying=false;
            //erase current image
            pixelArrayFrames = [[]];
            currentFrameIndex = 0;
            totalFrames = 1;
            ///////////////////////
            document.getElementById("totalFrames").innerText="1";document.getElementById("currentFrame").innerText="1"
            const sizeDropdown      = document.getElementById("sizeDropdown");
            const selectedSize      = sizeDropdown.value;
            const [height, width]   = selectedSize.split("x").map(Number);      //height & width were getting swapped here

            pixelHeight             = height;
            pixelWidth              = width;

            // Set the selected format based on the size
            selectedFormat = selectedSize === "16x64" ? "v2" : "v1";
            Array.from(formatDropdown.options).forEach((option) => {
                option.selected = option.value === selectedFormat;
            });

            // Update your pixel array and canvas size here
            pixelArrayFrames[currentFrameIndex] = createPixelArray(height, width, rtmouseBtnColor);//use rtmouseBtnColor bg 
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
            debugToggleIcon.childNodes[0].src = isDebugVisible ? "icons/bugG.png" : "icons/bug.png"
        }


        // Function to update palette icon color
        function updatePaletteIconColor() {
          var el = document.getElementById("paletteIcon")
          var dd = document.getElementById("customColorPicker")
          var clrtxt = dd.options[dd.selectedIndex].innerText
          el.childNodes[0].src="icons/palette"+clrtxt+".png"
        }
        
        // Advances to next color on paletteIcon click
        function openColorPicker() {        
          if (colorFormat === '24bit') {
              // For 24-bit mode, trigger the HTML5 color picker
              document.getElementById("htmlColorPicker").click();
          } else {
              // For 3-bit mode, cycle through colors in dropdown
              var el = document.getElementById("customColorPicker")
              var myevent = new Event('change');

              if (el.selectedIndex + 1 < el.length){  //cycle through colors in dropdown
                el.selectedIndex++;
              }else{
                el.selectedIndex = 0;
              }
              el.dispatchEvent(myevent)
          }
        }

        // Advances to next color on rtclickIcon click
        function changermbColor() {   
          var dd = document.getElementById("customColorPicker")   
          var el = document.getElementById("rtclickIcon").childNodes[0]
          var curcolor = el.src.split("/")[el.src.split("/").length-1].replace("rt","").replace(".png","")
          var nextcolor
          //find next color
            for (var i=0;i<dd.options.length;i++){
              if (dd.options[i].innerText == curcolor){
                if (i<dd.options.length-1){
                nextcolor = dd.options[i+1].innerText
                } else {  
                nextcolor = dd.options[0].innerText
                }
                break;
              }
            }//for
          el.src="icons/rt"+nextcolor+".png"   
          rtmouseBtnColor = colorNameToHex(nextcolor);        
      }//func

        // Function to update color picker visibility based on current mode
        function updateColorPickerVisibility() {
            const picker3bit = document.getElementById("customColorPicker");
            const picker24bit = document.getElementById("colorPicker24bit");
            
            if (colorFormat === '24bit') {
                picker3bit.style.display = 'none';
                picker24bit.style.display = 'flex';
                // Sync the current color to the 24-bit picker
                sync24BitPickerColor();
            } else {
                picker3bit.style.display = 'block';
                picker24bit.style.display = 'none';
            }
        }

        // Function to sync 24-bit picker with current selected color
        function sync24BitPickerColor() {
            const htmlColorPicker = document.getElementById("htmlColorPicker");
            const hexColorInput = document.getElementById("hexColorInput");
            
            htmlColorPicker.value = selectedColor;
            hexColorInput.value = selectedColor.toUpperCase();
        }

        // Function to add color to recent colors
        function addToRecentColors(color) {
            if (!recentColors.includes(color)) {
                recentColors.unshift(color);
                if (recentColors.length > 5) {
                    recentColors.pop();
                }
                updateRecentColorsGrid();
            }
        }

        // Function to update recent colors grid
        function updateRecentColorsGrid() {
            const grid = document.getElementById("recentColorsGrid");
            grid.innerHTML = '';
            
            recentColors.forEach(color => {
                const colorDiv = document.createElement('div');
                colorDiv.className = 'recent-color';
                colorDiv.style.backgroundColor = color;
                colorDiv.title = color;
                colorDiv.addEventListener('click', () => {
                    selectedColor = color;
                    sync24BitPickerColor();
                    updatePaletteIconColor();
                });
                grid.appendChild(colorDiv);
            });
        }

    // --- End Event Listeners for GUI ---

    // --- Binding of event listeners ---
    document.getElementById("sizeDropdown").addEventListener("change", handleSizeChange);
    document.getElementById("pixelSizeInput").addEventListener("input", drawPixels);
    document.getElementById("paintBucketButton").addEventListener("click", handlePaintBucket);
    document.getElementById("RMBpaintBucketButton").addEventListener("click", RMBhandlePaintBucket);
    
    //Event listeners for mouse buttons -- allows pixels to be drawn while holding mouse buttons
    document.addEventListener("mouseup", function(){  mousebtn_Gbl=-1; });

    // Event listener for custom color picker change
    customColorPicker.addEventListener('change', function() {
        selectedColor = customColorPicker.value;
        updatePaletteIconColor();
    });

    // Event listeners for 24-bit color picker
    document.getElementById("htmlColorPicker").addEventListener('input', function() {
        selectedColor = this.value;
        document.getElementById("hexColorInput").value = this.value.toUpperCase();
        addToRecentColors(selectedColor);
        updatePaletteIconColor();
    });

    document.getElementById("hexColorInput").addEventListener('input', function() {
        const hexValue = this.value;
        if (hexValue.match(/^#[0-9A-Fa-f]{6}$/)) {
            selectedColor = hexValue.toUpperCase();
            document.getElementById("htmlColorPicker").value = selectedColor;
            addToRecentColors(selectedColor);
            updatePaletteIconColor();
        }
    });

    document.getElementById("formatDropdown").addEventListener("change", handleFormatChange);
    document.getElementById("colorFormatDropdown").addEventListener("change", handleColorFormatChange);
    document.getElementById("debugToggle").addEventListener("click", toggleDebugDisplay);

    // Function to open file input
    window.openFileInput = function() {
        imageInput.click();
    };

    document.getElementById("backButton").addEventListener("click", () => handleButtonClick("backButton"));
    document.getElementById("playPauseButton").addEventListener("click", () => handleButtonClick("playPauseButton"));
    document.getElementById("forwardButton").addEventListener("click", () => handleButtonClick("forwardButton"));
    document.getElementById("plusButton").addEventListener("click", () => handleButtonClick("plusButton"));
    document.getElementById("minusButton").addEventListener("click", () => handleButtonClick("minusButton"));
    document.getElementById("swapButton").addEventListener("click", () => handleButtonClick("swapButton"));

    // --- End Binding of event listeners ---

    // --- Image Utility functions ---

    // Function to get the binary component for a specific color
    // function getBinaryComponent(color, position) moved outside event listener

        // Function to convert hex to RGB
        function hexToRgb(hex) {
            const bigint = parseInt(hex.slice(1), 16);
            const red = (bigint >> 16) & 255;
            const green = (bigint >> 8) & 255;
            const blue = bigint & 255;
            return [red, green, blue];
        }


     
    // --- End Image Utility functions ---

    // Function to create pixel array with selected color
    function createPixelArray(height, width, color) {                 //changed to height, width for consistency with size dropdown format
        const NewPixelArray = Array.from({                            //added color parameter so frames can be created with any bg color
                length: height                                        
            }, () =>
            Array.from({
                length: width
            }, () => color) // paint bg with requested color
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
            console.log("delays " + jsonData.data.delays);

            // Populate pixelArrayFrames with each frame
            pixelHeight     = jsonData.data.pixelHeight;
            pixelWidth      = jsonData.data.pixelWidth;
            delays          = jsonData.data.delays;
            document.getElementById("delay_id").value=delays.toString();
            
            // Detect format based on aniType and set colorFormat
            aniType = jsonData.data.aniType || 1;
            if (aniType === 2) {
                colorFormat = '24bit';
                console.log("24-bit RGB animation file detected");
                pixelArrayFrames = convertToPixelArrayFramesType2(jsonData.data.aniData, pixelWidth, pixelHeight, totalFrames);
            } else {
                colorFormat = '3bit';
                console.log("3-bit indexed animation file detected");
                pixelArrayFrames = convertToPixelArrayFrames(jsonData.data.aniData, pixelWidth, pixelHeight, totalFrames);
            }

        } else if (dataType === 1 && jsonData.data.graffitiData) {
            console.log("static JT file");
            currentMode = 'static';
            totalFrames = 1;
            pixelHeight     = jsonData.data.pixelHeight;
            pixelWidth      = jsonData.data.pixelWidth;
            
            // Detect format based on graffitiType and set colorFormat
            graffitiType = jsonData.data.graffitiType || 1;
            if (graffitiType === 2) {
                colorFormat = '24bit';
                console.log("24-bit RGB static file detected");
                pixelArrayFrames = convertToPixelArrayFramesType2(jsonData.data.graffitiData, pixelWidth, pixelHeight, totalFrames);
            } else {
                colorFormat = '3bit';
                console.log("3-bit indexed static file detected");
                pixelArrayFrames = convertToPixelArrayFrames(jsonData.data.graffitiData, pixelWidth, pixelHeight, totalFrames);
            }

        } else {
            console.error('Unsupported data type');
        }
        
        // Update the color format dropdown to match detected format
        document.getElementById("colorFormatDropdown").value = colorFormat;
        //update mode dropdown
        document.getElementById("modeDropdown").value=currentMode;handleModeChange();
        drawPixels();
        updateTextDisplay();

    } catch (error) {
        console.error('Error loading .JT file:', error);
    }
}

    // Function to load pixel array from image
    function loadPixelArrayFromImage(img) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        tempCtx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = tempCtx.getImageData(0, 0, img.width, img.height).data;
        img_gbl = tempCtx.getImageData(0, 0, img.width, img.height)
        //update size format
        document.getElementById("sizeDropdown").value=img.height.toString()+"x"+img.width.toString();handleSizeChange();
        //update mode format
        document.getElementById("modeDropdown").value='static';handleModeChange();

        pixelArrayFrames = [[]];
        currentFrameIndex = 0;
        totalFrames = 1;
        pixelArrayFrames[currentFrameIndex] = createPixelArray(img.height, img.width, rtmouseBtnColor);

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

    // Function to update text display below canvas with binary representation of 3-bit color space
    // function updateTextDisplay() moved outside event listener

    // --- Animation functions ---
        // Function to add a frame
        function addFrame() {

            const NewPixelArray = createPixelArray(pixelHeight, pixelWidth, rtmouseBtnColor);  //fill with rtmouseBtnColor
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

        // Function to play the animation
        function playAnimation() {
            //var interval = 500; // Adjust the interval as needed (in milliseconds)

            function animate() {
                if (isPlaying) {
                    currentFrameIndex = (currentFrameIndex + 1) % totalFrames;
                    drawPixels();
                    updateFrameDisplay();
                    setTimeout(animate, delays);
                }
            }

            animate();
        }
    // --- End Animation functions ---

//  ---  function convertJTDataToPixelArrayFrames() does not work ---
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
//   ------------------------------------------------------------------------------   

    // Initialize the GUI
    // Create first pixel array from selectedSize global var using rtmouseBtnColor background
    pixelArrayFrames[0] = createPixelArray(selectedSize.split('x')[0],selectedSize.split('x')[1], rtmouseBtnColor); 
    updatePaletteIconColor();
    handleModeChange();
    drawPixels();
    updateColorPickerVisibility(); // Initialize color picker visibility
    if (debug_GBL){debug_init();}  //init some parameters for debug
});
//////////////////end of DOMContentLoaded///////////////////////////////////////////////////////////////////////////////

// --- Functions added outside of DOMContentLoaded event listener and callable from console --- ///

        // Function to update frame display / frame count
        function updateFrameDisplay() {
            const currentFrameSpan = document.getElementById("currentFrame");
            const totalFramesSpan = document.getElementById("totalFrames");
            var ctxt="";ttxt="";
            if (currentFrameIndex + 1 < 10){ctxt="0";}
            if (totalFrames<10){ttxt="0";}
            currentFrameSpan.textContent = ctxt + (currentFrameIndex + 1).toString();
            totalFramesSpan.textContent = ttxt + (totalFrames).toString();
            delays = parseInt(document.getElementById("delay_id").value);
        }  

// --- Reads animation and static data from coolLED v2.1.x --- //
function convertToPixelArrayFrames(jtData, pixelWidth, pixelHeight, totalFrames) {
    //set the size
    document.getElementById("sizeDropdown").value=pixelHeight.toString()+"x"+pixelWidth.toString();
    //set to frame 0
    currentFrameIndex=0;
    document.getElementById("backButton").click()
    const pixelArrayFrames = [];
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

// --- Convert Type 2 (24-bit RGB) JT data to pixel array frames --- //
function convertToPixelArrayFramesType2(jtData, pixelWidth, pixelHeight, totalFrames) {
    document.getElementById("sizeDropdown").value = pixelHeight.toString() + "x" + pixelWidth.toString();
    currentFrameIndex = 0;
    
    const pixelArrayFrames = [];
    const pixelsPerFrame = pixelWidth * pixelHeight;
    
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
        const pixelArray = [];
        const frameStartIndex = frameIndex * pixelsPerFrame * 3; // 3 bytes per pixel (RGB)
        
        // Initialize the pixel array with the correct dimensions
        for (let row = 0; row < pixelHeight; row++) {
            pixelArray[row] = new Array(pixelWidth);
        }
        
        // Handle different panel layouts based on dimensions
        if (pixelHeight === 24 && (pixelWidth === 48 || pixelWidth === 64)) {
            // 24x48 or 24x64 panels use dual-block, column-major format
            convertType2DualBlock(jtData, frameStartIndex, pixelArray, pixelWidth, pixelHeight);
        } else {
            // Standard format for other sizes (row-major)
            convertType2Standard(jtData, frameStartIndex, pixelArray, pixelWidth, pixelHeight);
        }
        
        pixelArrayFrames.push(pixelArray);
    }
    
    return pixelArrayFrames;
}

// --- Convert Type 2 data for dual-block panels (24x48, 24x64) --- //
function convertType2DualBlock(jtData, frameStartIndex, pixelArray, pixelWidth, pixelHeight) {
    const blockWidth = pixelWidth / 2; // Each block is half the total width
    const blockSize = blockWidth * pixelHeight * 3; // RGB bytes per block
    
    // Process Left Block (columns 0 to blockWidth-1)
    let dataIndex = frameStartIndex;
    for (let col = 0; col < blockWidth; col++) {
        for (let row = 0; row < pixelHeight; row++) {
            const red = jtData[dataIndex];
            const green = jtData[dataIndex + 1];
            const blue = jtData[dataIndex + 2];
            dataIndex += 3;
            
            const hexColor = rgbToHex(red, green, blue);
            pixelArray[row][col] = hexColor;
        }
    }
    
    // Process Right Block (columns blockWidth to pixelWidth-1)
    for (let col = blockWidth; col < pixelWidth; col++) {
        for (let row = 0; row < pixelHeight; row++) {
            const red = jtData[dataIndex];
            const green = jtData[dataIndex + 1];
            const blue = jtData[dataIndex + 2];
            dataIndex += 3;
            
            const hexColor = rgbToHex(red, green, blue);
            pixelArray[row][col] = hexColor;
        }
    }
}

// --- Convert Type 2 data for standard panels (row-major format) --- //
function convertType2Standard(jtData, frameStartIndex, pixelArray, pixelWidth, pixelHeight) {
    let dataIndex = frameStartIndex;
    
    for (let row = 0; row < pixelHeight; row++) {
        for (let col = 0; col < pixelWidth; col++) {
            const red = jtData[dataIndex];
            const green = jtData[dataIndex + 1];
            const blue = jtData[dataIndex + 2];
            dataIndex += 3;
            
            const hexColor = rgbToHex(red, green, blue);
            pixelArray[row][col] = hexColor;
        }
    }
}

// --- bit shift function --- //
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

// --- convert text color to hex value --- //
function colorNameToHex(color){
   const mymap={
                "Black":"#000000", // Black
                "Red":"#FF0000", // Red
                "Green":"#00FF00", // Green
                "Yellow":"#FFFF00", // Yellow
                "Blue":"#0000FF", // Blue
                "Magenta":"#FF00FF", // Magenta
                "Cyan":"#00FFFF", // Cyan
                "White":"#FFFFFF" // White
              };
  return mymap[color].toString();
}

// --- return RGB array from hex --- //
function pixarrToRgb(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  const red = (bigint >> 16) & 255;
  const green = (bigint >> 8) & 255;
  const blue = bigint & 255;
  return [red, green, blue];
}

// --- fits pixelCanvasContainer to body width --- //
function fitwidth(x){
  var psize     = document.getElementById("pixelSizeInput");
  var canvas = document.getElementById("pixelCanvasContainer");
  var temp;

  if (x==undefined){  //first run
    //set to max
    psize.value = psize.max
    trigger();
    setTimeout(fitwidth,1,1);
  } else {  //subsequent runs
    var matrixwidth = parseInt(window.getComputedStyle( canvas ).width) 
    var bodywidth = parseInt(window.getComputedStyle( document.body ).width) 
      if (matrixwidth > bodywidth){
        psize.value--;
        trigger();
        if (psize.value > psize.min){setTimeout(fitwidth,1,1);}    
      }
  }

  function trigger(){var myevent = new Event('input');psize.dispatchEvent(myevent)}
}

    // Function to update text display below canvas with RGB data representation
    function updateTextDisplay() {
        pixelArray = pixelArrayFrames[currentFrameIndex];

        if (colorFormat === '24bit') {
            // For 24-bit RGB format, show direct RGB byte values
            updateTextDisplay24bit();
        } else {
            // For 3-bit format, show bit-packed binary representation
            updateTextDisplay3bit();
        }
    }//updateTextDisplay

    // Function to update text display for 24-bit RGB format
    function updateTextDisplay24bit() {
        const redArray = [];
        const greenArray = [];
        const blueArray = [];

        // Extract RGB values in row-major order (same as JT file format)
        for (let row = 0; row < pixelArray.length; row++) {
            for (let col = 0; col < pixelArray[row].length; col++) {
                const hexColor = pixelArray[row][col];
                const rgb = hexToRgbValues(hexColor);
                redArray.push(rgb.r);
                greenArray.push(rgb.g);
                blueArray.push(rgb.b);
            }
        }

        const redDecimalText = `Red (24-bit): [${redArray.join(', ')}]`;
        const greenDecimalText = `Green (24-bit): [${greenArray.join(', ')}]`;
        const blueDecimalText = `Blue (24-bit): [${blueArray.join(', ')}]`;

        document.getElementById('textDisplay').textContent = `${redDecimalText}\n\n${greenDecimalText}\n\n${blueDecimalText}`;
    }

    // Function to update text display for 3-bit indexed format
    function updateTextDisplay3bit() {
        redBinaryArray[currentFrameIndex] = [];
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

        const redDecimalText = `Red (3-bit): [${redBinaryArray[currentFrameIndex].join(', ')}]`;
        const greenDecimalText = `Green (3-bit): [${greenBinaryArray[currentFrameIndex].join(', ')}]`;
        const blueDecimalText = `Blue (3-bit): [${blueBinaryArray[currentFrameIndex].join(', ')}]`;

        document.getElementById('textDisplay').textContent = `${redDecimalText}\n\n${greenDecimalText}\n\n${blueDecimalText}`;
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
            var pixel                       = document.createElement("div");
                pixel.className             = "pixel";
                pixel.style.backgroundColor = color;                
                pixel.style.width           = `${pixelSize}px`;
                pixel.style.height          = `${pixelSize}px`;

                // Add click event listeners for pixel editing
                pixel.addEventListener('mousemove', () => {togglePixel(rowIndex, columnIndex)});
                pixel.addEventListener('mousedown', () => {mousebtn_Gbl=event.button;togglePixel(rowIndex, columnIndex)}); 

                //prevent context menu when using right mouse button
                //pixel.addEventListener("contextmenu", event => {mousebtn_Gbl=event.button;event.preventDefault();return false;});

                pixelCanvas.appendChild(pixel);
            });

        });

        updateTextDisplay();
    }//drawPixels

      // Function to draw pixel colors while dragging mouse
        function togglePixel(row, col) {
            if (mousebtn_Gbl==0){                      //will draw selectedColor when holding left mouse button
              pixelArray[row][col] = selectedColor;
              drawPixels();
              updateTextDisplay();
            } else if (mousebtn_Gbl==2) {              //will draw rtmouseBtnColor when holding right mouse button
              pixelArray[row][col] = rtmouseBtnColor;
              drawPixels();
              updateTextDisplay();
            }
        }

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

  // --- frame swapping functions --- //
  function swapFrames(x,y){
    var temparr
    if ( x > totalFrames || y > totalFrames ){return;}  //return if frames dont exist
    if ( x < 1 || y < 1 || totalFrames == 1 ){return;}  //return if frames dont exist
    if ( x == y ){return;}                              //return if frames are same
    x--;y--;                                            //convert displayed frame numbers to index
    temparr = pixelArrayFrames[y]                       //save y in temparr
    pixelArrayFrames[y] = pixelArrayFrames[x]           //save x in y
    pixelArrayFrames[x] = temparr                       //save y to x
    drawPixels();setTimeout(updateFrameDisplay,100);                              
  }
  
  function deleteFrame(){
    var i,j
    if (totalFrames>1){                                 //only delete if frames > 1
      if (currentFrameIndex<totalFrames-1){             //if not the last frame, swap everyone down
        for (i=currentFrameIndex;i<totalFrames-1;i++){  //-1, since last one will be deleted 
          swapFrames(i+1,i+2)                           //+1, since swapFrames() uses displayed frame number
        }   
      }
        pixelArrayFrames.length--;                      //delete last frame
        totalFrames--;
        currentFrameIndex=totalFrames-1;
        drawPixels();setTimeout(updateFrameDisplay,100);
      }                              
  }

// swap_diag dialog functions##########################################
function swap_diag(){
if (totalFrames==1){return;}
if (diag_idx2>totalFrames){diag_idx2=totalFrames}
if (diag_idx1>totalFrames){diag_idx1=totalFrames}
if (diag_idx1==diag_idx2){diag_idx1--;}
var x='<table border=0 style="margin-right: auto; margin-left: auto;"><tr><td class=bigbutton colspan=2>&nbsp;&nbsp;&nbsp;Swap Frames&nbsp;&nbsp;&nbsp;</td>'
+'</tr></table>'

+'<table border=0 cellspacing=3 style="margin-right: auto; margin-left: auto;"><tr>'
+'<td colspan=3 style="text-align:center;font-size:16px;font-weight:bold;">- Swap -</td><td></td>'
+'<td colspan=3 style="text-align:center;font-size:16px;font-weight:bold;">- with -</td></tr>'
+'<tr><td><input class=bigbutton type="button" value="&nbsp;&#9660;&nbsp;" onclick=swap_diag_btn1(-1) /></td>'
+'<td class=bigbutton id=diag_swap_id1>'+diag_idx1+'</td>'
+'<td><input class=bigbutton type="button" value="&nbsp;&#9650;&nbsp;" onclick=swap_diag_btn1(1) /></td>'
+'<td></td>'
+'<td><input class=bigbutton type="button" value="&nbsp;&#9660;&nbsp;" onclick=swap_diag_btn2(-1) /></td>'
+'<td class=bigbutton id=diag_swap_id2>'+diag_idx2+'</td>'
+'<td><input class=bigbutton type="button" value="&nbsp;&#9650;&nbsp;" onclick=swap_diag_btn2(1) /></td>'
+'</tr></table>'

+'<table cellpadding=6 style="width: 100%;"><tr><td>'
+'<input style="float: left; font-size: 30px; min-width: 3ch;" type="button" value="Cancel" onclick=swap_diag_close() /></td>'
+'<td><input style="float: right; font-size: 30px; min-width: 3ch;" type="button" value="OK" '
+'onclick=swap_diag_ok(swapFrames()) /></td></tr></table>'

document.querySelector('.swapdiag-content').innerHTML=x
id('swapdiagid').style.display='block';
/*center the diag
var myht = document.querySelector('.swapdiag-content').clientHeight
var tht = document.querySelector('body').clientHeight
var ans = tht/2 - myht/2
document.querySelector('.swapdiag').style.paddingTop=ans.toString()+"px"
*/
}

function swap_diag_close(){id('swapdiagid').style.display='none'}

function swap_diag_ok(){
  swapFrames(parseInt(diag_idx1), parseInt(diag_idx2))
swap_diag_close()
}

function swap_diag_btn1(dir){
  if (diag_idx1+dir>totalFrames){return;}
  if (diag_idx1+dir<1){return;}
  if (diag_idx1+dir == diag_idx2){
    if (diag_idx1+dir+dir < totalFrames+1 && diag_idx1+dir+dir > 0){
      diag_idx1+=dir;
    }else{
      return;
    }
  }
  diag_idx1+=dir
  id("diag_swap_id1").innerHTML=diag_idx1
}

function swap_diag_btn2(dir){
if (diag_idx2+dir>totalFrames){return;}
if (diag_idx2+dir<1){return;}
  if (diag_idx2+dir == diag_idx1){
    if (diag_idx2+dir+dir < totalFrames+1 && diag_idx2+dir+dir > 0){
      diag_idx2+=dir;
    }else{
      return;
    }
  }
diag_idx2+=dir
id("diag_swap_id2").innerHTML=diag_idx2
}

function id(x){return document.getElementById(x);}
// end swap_diag dialog functions##########################################

// --- debug functions --- //
function debug_update(){
  //updates display, for debugging
  document.getElementById('upButton').click();document.getElementById('downButton').click();
}

function debug_init(){ 
  //init some parameters, for debugging
  document.getElementById("sizeDropdown").value="16x32";
  document.getElementById("pixelSizeInput").value="15";
  document.getElementById("customColorPicker").value="#000000"
  document.getElementById("paletteIcon").style.color="#000000"
  var myevent = new Event('change');
  document.getElementById("customColorPicker").dispatchEvent(myevent)
  document.getElementById("paintBucketButton").click();
  document.getElementById("debugToggle").click();
}
