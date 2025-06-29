// global vars, set for preferred GUI start settings
var selectedFormat      = "v1";                //file format
var selectedSize        = "16x32";             //initial canvas size
var startColor          = "#FF0000";           //left mouse btn initial pixel paint color in hex format
var rtmouseBtnColor     = "#000000";           //right mouse btn initial pixel paint color in hex format
var initialPixelSize    = "20";                //initial pixel size
var currentMode         = "static";            //initial mode of static or animation
var bgColor             = "#b2b2b2";           //body background color in hex format
var jtFileName          = "image.jt";          //default save filename for jt files
var imageFileName       = "coolLED_img.png";   //default save filename for image files
var animationFileName   = "coolLED_ani.png";   //base save filename for animation files
var debug_GBL=false;                           //set to false to disable the debug_init() function
var autoScaling=true;                          //enable automatic responsive pixel scaling

//globals for swap frames dialog
var diag_idx1=1;                               
var diag_idx2=2;

// Screen breakpoints for responsive scaling
const SCREEN_BREAKPOINTS = {
    mobile: { maxWidth: 768, scalingFactor: 0.95, margin: 20 },
    tablet: { maxWidth: 1024, scalingFactor: 0.85, margin: 40 },
    desktop: { maxWidth: 1920, scalingFactor: 0.75, margin: 60 },
    ultrawide: { maxWidth: Infinity, scalingFactor: 0.65, margin: 80 }
};

// Function to calculate dynamic max pixel size based on canvas dimensions
function getDynamicMaxPixelSize(canvasWidth, canvasHeight) {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Reserve space for UI elements (toolbars, margins, etc.)
    const availableWidth = screenWidth - 100; // 100px for margins and UI
    const availableHeight = screenHeight - 300; // 300px for toolbars and UI
    
    // Calculate theoretical max pixel size for each dimension
    const maxWidthPixelSize = Math.floor(availableWidth / canvasWidth);
    const maxHeightPixelSize = Math.floor(availableHeight / canvasHeight);
    
    // Use the smaller of the two to ensure it fits, with absolute limits
    const dynamicMax = Math.min(maxWidthPixelSize, maxHeightPixelSize);
    
    // Apply reasonable bounds: minimum 20px, maximum 100px
    return Math.max(20, Math.min(dynamicMax, 100));
}

// Function to update pixel size input max attribute based on current canvas size
function updatePixelSizeInputMax() {
    const sizeDropdown = document.getElementById("sizeDropdown");
    const selectedSize = sizeDropdown.value;
    const [height, width] = selectedSize.split("x").map(Number);
    const dynamicMax = getDynamicMaxPixelSize(width, height);
    
    const pixelSizeInput = document.getElementById("pixelSizeInput");
    pixelSizeInput.max = dynamicMax;
    
    console.log(`Updated pixel size max to ${dynamicMax} for canvas ${width}x${height}`);
}                               

// global vars for GUI
var selectedColor
let redBinaryArray      = [[]];
let greenBinaryArray    = [[]];
let blueBinaryArray     = [[]];
var mousebtn_Gbl=-1;    //store mouse button event (-1 = none, 0 = right mouse button, 2 = left mouse button)
var isDragging = false;
var pendingPixelChanges = [];

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
let recent3BitColors = []; // Array to store recently used colors in 3-bit mode

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

    // === NEW FEATURE MANAGERS ===
    
    // Current tool state (make global for access from event handlers)
    window.currentTool = 'paint'; // 'paint', 'select-rect'
    let currentTool = window.currentTool; // Local reference
    let toolButtonsMap = {};
    
    
    // Initialize History Manager
    const historyManager = new window.JTEdit.History.HistoryManager({
        maxHistorySize: 100,
        onHistoryChange: updateHistoryUI
    });
    
    // Initialize Selection Manager
    const selectionManager = new window.JTEdit.SelectionManager(
        canvas,
        null // No callback needed
    );
    
    
    // Initialize Canvas Scaler
    const canvasScaler = new window.JTEdit.Scaling.CanvasScaler();
    
    // Initialize Scaling Dialog
    const scalingDialog = new window.JTEdit.Scaling.ScalingPreviewDialog(
        document.body,
        onScalingApply,
        onScalingCancel
    );

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
                    const playPauseIcon = document.querySelector("#playPauseButton i");
                    if (isPlaying) {
                        playPauseIcon.classList.remove("fa-play");
                        playPauseIcon.classList.add("fa-pause");
                        playAnimation();
                    } else {
                        playPauseIcon.classList.remove("fa-pause");
                        playPauseIcon.classList.add("fa-play");
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
            // Capture state before transform for undo
            const beforeState = JSON.parse(JSON.stringify(pixelArrayFrames[currentFrameIndex]));
            
            // Perform the shift
            shiftImageUp();
            
            // Capture state after transform and create PixelAction with individual pixel changes
            const afterState = JSON.parse(JSON.stringify(pixelArrayFrames[currentFrameIndex]));
            const changes = [];
            for (let row = 0; row < pixelHeight; row++) {
                for (let col = 0; col < pixelWidth; col++) {
                    if (beforeState[row][col] !== afterState[row][col]) {
                        changes.push({
                            row,
                            col,
                            oldColor: beforeState[row][col],
                            newColor: afterState[row][col]
                        });
                    }
                }
            }
            
            if (changes.length > 0) {
                // Use PixelAction to maintain compatibility with paint actions
                const action = new window.JTEdit.History.PixelAction(
                    changes,
                    pixelArrayFrames[currentFrameIndex],
                    currentFrameIndex
                );
                action.name = 'Shift Up'; // Override the default name
                action.canMergeWith = function(otherAction) { return false; }; // Prevent merging
                historyManager.execute(action);
            }
            
            drawPixels();
            updateTextDisplay();
        });

        document.getElementById('leftButton').addEventListener('click', function() {
            // Capture state before transform for undo
            const beforeState = JSON.parse(JSON.stringify(pixelArrayFrames[currentFrameIndex]));
            
            // Perform the shift
            shiftImageLeft();
            
            // Capture state after transform and create PixelAction with individual pixel changes
            const afterState = JSON.parse(JSON.stringify(pixelArrayFrames[currentFrameIndex]));
            const changes = [];
            for (let row = 0; row < pixelHeight; row++) {
                for (let col = 0; col < pixelWidth; col++) {
                    if (beforeState[row][col] !== afterState[row][col]) {
                        changes.push({
                            row,
                            col,
                            oldColor: beforeState[row][col],
                            newColor: afterState[row][col]
                        });
                    }
                }
            }
            
            if (changes.length > 0) {
                // Use PixelAction to maintain compatibility with paint actions
                const action = new window.JTEdit.History.PixelAction(
                    changes,
                    pixelArrayFrames[currentFrameIndex],
                    currentFrameIndex
                );
                action.name = 'Shift Left'; // Override the default name
                action.canMergeWith = function(otherAction) { return false; }; // Prevent merging
                historyManager.execute(action);
            }
            
            drawPixels();
            updateTextDisplay();
        });

        document.getElementById('downButton').addEventListener('click', function() {
            // Capture state before transform for undo
            const beforeState = JSON.parse(JSON.stringify(pixelArrayFrames[currentFrameIndex]));
            
            // Perform the shift
            shiftImageDown();
            
            // Capture state after transform and create PixelAction with individual pixel changes
            const afterState = JSON.parse(JSON.stringify(pixelArrayFrames[currentFrameIndex]));
            const changes = [];
            for (let row = 0; row < pixelHeight; row++) {
                for (let col = 0; col < pixelWidth; col++) {
                    if (beforeState[row][col] !== afterState[row][col]) {
                        changes.push({
                            row,
                            col,
                            oldColor: beforeState[row][col],
                            newColor: afterState[row][col]
                        });
                    }
                }
            }
            
            if (changes.length > 0) {
                // Use PixelAction to maintain compatibility with paint actions
                const action = new window.JTEdit.History.PixelAction(
                    changes,
                    pixelArrayFrames[currentFrameIndex],
                    currentFrameIndex
                );
                action.name = 'Shift Down'; // Override the default name
                action.canMergeWith = function(otherAction) { return false; }; // Prevent merging
                historyManager.execute(action);
            }
            
            drawPixels();
            updateTextDisplay();
        });

        document.getElementById('rightButton').addEventListener('click', function() {
            // Capture state before transform for undo
            const beforeState = JSON.parse(JSON.stringify(pixelArrayFrames[currentFrameIndex]));
            
            // Perform the shift
            shiftImageRight();
            
            // Capture state after transform and create PixelAction with individual pixel changes
            const afterState = JSON.parse(JSON.stringify(pixelArrayFrames[currentFrameIndex]));
            const changes = [];
            for (let row = 0; row < pixelHeight; row++) {
                for (let col = 0; col < pixelWidth; col++) {
                    if (beforeState[row][col] !== afterState[row][col]) {
                        changes.push({
                            row,
                            col,
                            oldColor: beforeState[row][col],
                            newColor: afterState[row][col]
                        });
                    }
                }
            }
            
            if (changes.length > 0) {
                // Use PixelAction to maintain compatibility with paint actions
                const action = new window.JTEdit.History.PixelAction(
                    changes,
                    pixelArrayFrames[currentFrameIndex],
                    currentFrameIndex
                );
                action.name = 'Shift Right'; // Override the default name
                action.canMergeWith = function(otherAction) { return false; }; // Prevent merging
                historyManager.execute(action);
            }
            
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
            if (currentMode === "animation") {
                controlButtons.classList.remove("hidden");
                controlButtons.style.display = "flex";
            } else {
                controlButtons.classList.add("hidden");
                controlButtons.style.display = "none";
            }
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

        // Event listener for palette icon click - removed (now using unified color selector)

        // Event listener for right click icon click - removed (now using unified color selector)
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
            
            // Update pixel size input max based on new canvas size
            updatePixelSizeInputMax();
            
            // Apply responsive scaling for new size
            applyResponsiveScaling();
            
            // Invalidate selection positioning cache when canvas size changes
            if (window.JTEdit && window.JTEdit.currentSelectionManager) {
                window.JTEdit.currentSelectionManager.onLayoutChange();
            }
            
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

        // Function to show help modal
        function showHelpModal() {
            const helpModal = document.getElementById("helpModal");
            helpModal.classList.add("modal--open");
            helpModal.setAttribute("aria-hidden", "false");
            
            // Set initial mode based on current application mode
            const currentMode = document.getElementById("modeDropdown").value;
            setHelpModalMode(currentMode);
            
            // Focus the close button for accessibility
            setTimeout(() => {
                document.getElementById("closeHelpModal").focus();
            }, 100);
        }

        // Function to hide help modal
        function hideHelpModal() {
            const helpModal = document.getElementById("helpModal");
            helpModal.classList.remove("modal--open");
            helpModal.setAttribute("aria-hidden", "true");
            
            // Return focus to help button
            document.getElementById("helpButton").focus();
        }

        // Function to set help modal mode (static vs animation)
        function setHelpModalMode(mode) {
            const staticSections = document.querySelectorAll('.static-only');
            const animationSections = document.querySelectorAll('.animation-only');
            const staticToggle = document.getElementById('staticModeToggle');
            const animationToggle = document.getElementById('animationModeToggle');
            
            if (mode === 'static') {
                // Show static sections, hide animation sections
                staticSections.forEach(section => section.style.display = 'block');
                animationSections.forEach(section => section.style.display = 'none');
                
                // Update toggle button states
                staticToggle.classList.add('btn--primary');
                animationToggle.classList.remove('btn--primary');
            } else {
                // Show animation sections, hide static sections
                staticSections.forEach(section => section.style.display = 'none');
                animationSections.forEach(section => section.style.display = 'block');
                
                // Update toggle button states
                animationToggle.classList.add('btn--primary');
                staticToggle.classList.remove('btn--primary');
            }
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

        // Advances to next color for background (updated for unified color selector)
        function changermbColor() {   
          var dd = document.getElementById("customColorPicker")
          var curcolorHex = rtmouseBtnColor;
          var nextcolorIndex = 0;
          
          // Find current color in dropdown
          for (var i=0; i<dd.options.length; i++){
            if (dd.options[i].value == curcolorHex){
              nextcolorIndex = (i + 1) % dd.options.length;
              break;
            }
          }
          
          rtmouseBtnColor = dd.options[nextcolorIndex].value;
          updateColorPreviews();
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
                // Initialize recent colors grid for 24-bit mode
                updateRecentColorsGrid();
            } else {
                picker3bit.style.display = 'block';
                picker24bit.style.display = 'none';
                // Initialize recent colors grid for 3-bit mode
                updateRecentColorsGrid();
            }
        }

        // Function to sync 24-bit picker with current selected color
        function sync24BitPickerColor() {
            const htmlColorPicker = document.getElementById("htmlColorPicker");
            
            if (htmlColorPicker) {
                htmlColorPicker.value = selectedColor;
            }
        }

        // Function to add color to recent colors
        function addToRecentColors(color) {
            if (colorFormat === '24bit') {
                if (!recentColors.includes(color)) {
                    recentColors.unshift(color);
                    if (recentColors.length > 5) {
                        recentColors.pop();
                    }
                    updateRecentColorsGrid();
                }
            } else {
                // 3-bit mode
                addTo3BitRecentColors(color);
            }
        }

        // Function to add color to 3-bit recent colors
        function addTo3BitRecentColors(color) {
            if (!recent3BitColors.includes(color)) {
                recent3BitColors.unshift(color);
                if (recent3BitColors.length > 5) {
                    recent3BitColors.pop();
                }
                update3BitRecentColorsGrid();
            }
        }

        // Function to update recent colors grid
        function updateRecentColorsGrid() {
            if (colorFormat === '24bit') {
                update24BitRecentColorsGrid();
            } else {
                update3BitRecentColorsGrid();
            }
        }

        // Function to update 24-bit recent colors grid
        function update24BitRecentColorsGrid() {
            const grid = document.getElementById("recentColorsGrid");
            grid.innerHTML = '';
            
            // Always create 5 slots for consistent UI in 24-bit mode
            for (let i = 0; i < 5; i++) {
                const colorDiv = document.createElement('div');
                
                if (i < recentColors.length) {
                    // Populated slot with existing color
                    const color = recentColors[i];
                    colorDiv.className = 'recent-color';
                    colorDiv.style.backgroundColor = color;
                    colorDiv.title = color;
                    colorDiv.addEventListener('click', () => {
                        selectedColor = color;
                        sync24BitPickerColor();
                        updatePaletteIconColor();
                        updateColorPreviews();
                    });
                } else {
                    // Empty slot placeholder
                    colorDiv.className = 'recent-color recent-color-empty';
                    colorDiv.style.backgroundColor = 'transparent';
                    colorDiv.title = 'Click to add a color';
                    colorDiv.addEventListener('click', () => {
                        // Trigger color picker to populate this empty slot
                        const htmlColorPicker = document.getElementById("htmlColorPicker");
                        if (htmlColorPicker) {
                            // Create a temporary event handler for this empty slot
                            const tempHandler = function() {
                                // Add the selected color to recent colors
                                addToRecentColors(htmlColorPicker.value);
                                // Set as current selected color
                                selectedColor = htmlColorPicker.value;
                                updatePaletteIconColor();
                                updateColorPreviews();
                                // Remove the temporary handler
                                htmlColorPicker.removeEventListener('change', tempHandler);
                            };
                            
                            htmlColorPicker.addEventListener('change', tempHandler);
                            htmlColorPicker.click();
                        }
                    });
                }
                
                grid.appendChild(colorDiv);
            }
        }

        // Function to update 3-bit recent colors grid
        function update3BitRecentColorsGrid() {
            const grid = document.getElementById("recentColorsGrid");
            if (!grid) return;
            
            grid.innerHTML = '';
            
            // Only show populated colors in 3-bit mode (no placeholders)
            recent3BitColors.forEach(color => {
                const colorDiv = document.createElement('div');
                colorDiv.className = 'recent-color';
                colorDiv.style.backgroundColor = color;
                colorDiv.title = color;
                colorDiv.addEventListener('click', () => {
                    selectedColor = color;
                    // Update the 3-bit color picker dropdown
                    const customColorPicker = document.getElementById("customColorPicker");
                    customColorPicker.value = color;
                    updatePaletteIconColor();
                    updateColorPreviews();
                });
                grid.appendChild(colorDiv);
            });
        }

    // --- End Event Listeners for GUI ---

    // --- Binding of event listeners ---
    document.getElementById("sizeDropdown").addEventListener("change", handleSizeChange);
    document.getElementById("pixelSizeInput").addEventListener("input", drawPixels);
    
    // Initialize pixel size input max based on initial canvas size
    updatePixelSizeInputMax();
    document.getElementById("paintBucketButton").addEventListener("click", handlePaintBucket);
    document.getElementById("RMBpaintBucketButton").addEventListener("click", RMBhandlePaintBucket);
    
    //Event listeners for mouse buttons -- allows pixels to be drawn while holding mouse buttons
    document.addEventListener("mouseup", function(){  
        // If we were dragging, commit the pending pixel changes to history
        if (isDragging && pendingPixelChanges.length > 0) {
            const action = new window.JTEdit.History.PixelAction(
                pendingPixelChanges,
                pixelArrayFrames[currentFrameIndex],
                currentFrameIndex
            );
            historyManager.execute(action);
            pendingPixelChanges = [];
        }
        isDragging = false;
        mousebtn_Gbl=-1; 
    });

    // Event listener for custom color picker change
    customColorPicker.addEventListener('change', function() {
        selectedColor = customColorPicker.value;
        updatePaletteIconColor();
        updateColorPreviews();
        
        // Add to recent colors in 3-bit mode
        if (colorFormat === '3bit') {
            addToRecentColors(selectedColor);
        }
    });

    // Event listeners for 24-bit color picker
    document.getElementById("htmlColorPicker").addEventListener('input', function() {
        selectedColor = this.value;
        updatePaletteIconColor();
        updateColorPreviews();
    });
    
    // Add to recent colors only when color picker dialog is closed
    document.getElementById("htmlColorPicker").addEventListener('change', function() {
        addToRecentColors(selectedColor);
    });


    document.getElementById("formatDropdown").addEventListener("change", handleFormatChange);
    document.getElementById("colorFormatDropdown").addEventListener("change", handleColorFormatChange);
    document.getElementById("debugToggle").addEventListener("click", toggleDebugDisplay);
    document.getElementById("helpButton").addEventListener("click", showHelpModal);

    // Zoom control event listeners
    document.getElementById("zoomInButton").addEventListener("click", zoomIn);
    document.getElementById("zoomOutButton").addEventListener("click", zoomOut);
    document.getElementById("fitToScreenButton").addEventListener("click", fitToScreen);
    document.getElementById("autoScaleToggle").addEventListener("change", toggleAutoScale);
    document.getElementById("gridToggle").addEventListener("change", toggleGrid);

    // Unified color selector event listeners
    document.getElementById("foregroundColorPreview").addEventListener("click", selectForegroundColor);
    document.getElementById("backgroundColorPreview").addEventListener("click", selectBackgroundColor);
    document.getElementById("swapColorsButton").addEventListener("click", swapColors);

    // Selection control event listeners

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

    // Help modal event listeners
    document.getElementById("closeHelpModal").addEventListener("click", hideHelpModal);
    document.getElementById("closeHelpModalFooter").addEventListener("click", hideHelpModal);
    
    // Help modal mode toggle event listeners
    document.getElementById("staticModeToggle").addEventListener("click", function() {
        setHelpModalMode('static');
    });
    
    document.getElementById("animationModeToggle").addEventListener("click", function() {
        setHelpModalMode('animation');
    });
    
    // Close modal when clicking outside
    document.getElementById("helpModal").addEventListener("click", function(event) {
        if (event.target === this) {
            hideHelpModal();
        }
    });
    
    // Close modal with escape key
    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape") {
            const helpModal = document.getElementById("helpModal");
            if (helpModal.classList.contains("modal--open")) {
                hideHelpModal();
                event.preventDefault();
            }
        }
    });

    // Window resize listener for responsive scaling
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            applyResponsiveScaling();
        }, 250); // Debounce resize events
    });

    // --- End Binding of event listeners ---

    // --- Image Utility functions ---

    // Function to get the binary component for a specific color
    // function getBinaryComponent(color, position) moved outside event listener



     
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
        
        // Apply responsive scaling for loaded file
        applyResponsiveScaling();
        
        // Invalidate selection positioning cache when JT file loads with new dimensions
        if (window.JTEdit && window.JTEdit.currentSelectionManager) {
            window.JTEdit.currentSelectionManager.onLayoutChange();
        }
        
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
        
        // Apply responsive scaling for loaded image
        applyResponsiveScaling();
        
        // Invalidate selection positioning cache when image loads with new dimensions
        if (window.JTEdit && window.JTEdit.currentSelectionManager) {
            window.JTEdit.currentSelectionManager.onLayoutChange();
        }
        
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
                } else {
                    // Reset play button icon when animation stops
                    const playPauseIcon = document.querySelector("#playPauseButton i");
                    playPauseIcon.classList.remove("fa-pause");
                    playPauseIcon.classList.add("fa-play");
                }
            }

            animate();
        }
    // --- End Animation functions ---

    // === NEW FEATURE FUNCTIONS ===
    
    // History Management Functions
    function updateHistoryUI(state) {
        const undoBtn = document.getElementById('undoButton');
        const redoBtn = document.getElementById('redoButton');
        const statusSpan = document.getElementById('historyStatus');
        
        undoBtn.disabled = !state.canUndo;
        redoBtn.disabled = !state.canRedo;
        
        const undoCount = state.history.undoStack.length;
        const redoCount = state.history.redoStack.length;
        statusSpan.textContent = undoCount > 0 ? `${undoCount} actions` : 'No actions';
    }
    
    // Tool Management Functions
    function initializeToolButtons() {
        toolButtonsMap = {
            'paint': document.getElementById('paintTool'),
            'select-rect': document.getElementById('selectRectTool')
        };
        
        Object.keys(toolButtonsMap).forEach(tool => {
            toolButtonsMap[tool].addEventListener('click', () => setCurrentTool(tool));
        });
        
        // Initialize undo/redo buttons
        document.getElementById('undoButton').addEventListener('click', () => {
            if (historyManager.undo()) {
                drawPixels();
                updateTextDisplay();
            }
        });
        
        document.getElementById('redoButton').addEventListener('click', () => {
            if (historyManager.redo()) {
                drawPixels();
                updateTextDisplay();
            }
        });
        
    }
    
    function setCurrentTool(tool) {
        // Clear active state from all tools
        Object.values(toolButtonsMap).forEach(btn => btn.classList.remove('active'));
        
        // Set new tool as active
        if (toolButtonsMap[tool]) {
            toolButtonsMap[tool].classList.add('active');
        }
        
        // Clear selection when switching away from select tools
        if (currentTool && currentTool.startsWith('select') && !tool.startsWith('select')) {
            selectionManager.clear();
        }
        
        currentTool = tool;
        window.currentTool = tool; // Keep global in sync
        
        // Clear any existing selection when switching to select tool
        if (tool.startsWith('select')) {
            selectionManager.clear();
        }
    }
    
    
    // Shape Callback Functions
    
    // Scaling Callback Functions
    function onScalingApply(options) {
        // Apply scaling to current frame or all frames
        const sourcePixels = pixelArrayFrames[currentFrameIndex];
        
        // Get the current target dimensions from the size dropdown
        const sizeDropdown = document.getElementById("sizeDropdown");
        const selectedSizeNew = sizeDropdown.value;
        const [newHeight, newWidth] = selectedSizeNew.split("x").map(Number);
        
        if (currentMode === 'animation') {
            // Scale all frames
            const scaledFrames = canvasScaler.scaleFrames(
                pixelArrayFrames,
                pixelWidth,
                pixelHeight,
                newWidth,  // Use consistent newWidth
                newHeight, // Use consistent newHeight
                options
            );
            
            pixelArrayFrames = scaledFrames;
        } else {
            // Scale current frame only
            const result = canvasScaler.scalePixelArray(
                sourcePixels,
                pixelWidth,
                pixelHeight,
                newWidth,  // Use consistent newWidth
                newHeight, // Use consistent newHeight
                options
            );
            
            pixelArrayFrames[currentFrameIndex] = result.pixels;
        }
        
        // Update canvas dimensions
        pixelHeight = newHeight;
        pixelWidth = newWidth;
        
        // Update pixel size input max based on new canvas size
        updatePixelSizeInputMax();
        
        // Apply responsive scaling to fit the new canvas on screen
        applyResponsiveScaling();
        
        // Invalidate selection positioning cache after scaling
        if (window.JTEdit && window.JTEdit.currentSelectionManager) {
            window.JTEdit.currentSelectionManager.onLayoutChange();
        }
        
        drawPixels();
        updateTextDisplay();
    }
    
    function onScalingCancel() {
        // User cancelled scaling - revert size dropdown
        const sizeDropdown = document.getElementById("sizeDropdown");
        sizeDropdown.value = `${pixelHeight}x${pixelWidth}`;
    }
    
    // Enhanced Pixel Click Handler (make global for access from event handlers)
    window.handlePixelClick = function handlePixelClick(row, col, event) {
        if (window.currentTool === 'paint') {
            // Original paint functionality with history tracking
            const button = event.button || (event.which - 1);
            const oldColor = pixelArrayFrames[currentFrameIndex][row][col];
            const newColor = button === 0 ? selectedColor : rtmouseBtnColor;
            
            if (oldColor !== newColor) {
                const action = new window.JTEdit.History.PixelAction(
                    [{row, col, oldColor, newColor}],
                    pixelArrayFrames[currentFrameIndex],
                    currentFrameIndex
                );
                
                historyManager.execute(action);
                drawPixels();
                updateTextDisplay();
            }
        } else if (window.currentTool.startsWith('select')) {
            // Handle selection tools
            if (event.type === 'mousedown') {
                const selectionManager = window.JTEdit.currentSelectionManager;
                // Check if clicking within existing selection
                if (selectionManager.hasSelection() && 
                    selectionManager.currentSelection.contains(row, col)) {
                    // Start move operation
                    event.preventDefault();
                    event.stopPropagation();
                    selectionManager.startMove(event);
                    return;
                }
                // Start new selection if not clicking on existing one
                selectionManager.startSelection(row, col);
            }
        }
    }
    
    // Enhanced Size Change Handler with Scaling
    function enhancedHandleSizeChange() {
        const sizeDropdown = document.getElementById("sizeDropdown");
        const selectedSizeNew = sizeDropdown.value;
        const [newHeight, newWidth] = selectedSizeNew.split("x").map(Number);
        
        // Check if there's content to scale
        const hasContent = pixelArrayFrames.some(frame => 
            frame.some(row => 
                row.some(pixel => pixel !== rtmouseBtnColor)
            )
        );
        
        if (hasContent && (newHeight !== pixelHeight || newWidth !== pixelWidth)) {
            // Show scaling dialog
            scalingDialog.show(
                pixelArrayFrames[currentFrameIndex],
                pixelWidth,
                pixelHeight,
                newWidth,
                newHeight
            );
        } else {
            // No content, proceed with normal size change
            handleSizeChange();
        }
        
        // Always invalidate selection cache when size changes
        if (window.JTEdit && window.JTEdit.currentSelectionManager) {
            window.JTEdit.currentSelectionManager.onLayoutChange();
        }
    }


    // Initialize the GUI
    // Create first pixel array from selectedSize global var using rtmouseBtnColor background
    pixelArrayFrames[0] = createPixelArray(selectedSize.split('x')[0],selectedSize.split('x')[1], rtmouseBtnColor); 
    updatePaletteIconColor();
    handleModeChange();
    updateColorPickerVisibility(); // Initialize color picker visibility
    updateColorPreviews(); // Initialize unified color selector
    initializeGrid(); // Initialize grid toggle state
    
    // Initialize new features
    initializeToolButtons();
    
    // Make managers available globally for keyboard shortcuts
    window.JTEdit.currentSelectionManager = selectionManager;
    window.JTEdit.currentHistoryManager = historyManager;
    
    // Update selection manager pixel size
    selectionManager.setPixelSize(parseInt(document.getElementById("pixelSizeInput").value));
    
    // Override size dropdown handler to use enhanced version
    document.getElementById("sizeDropdown").removeEventListener("change", handleSizeChange);
    document.getElementById("sizeDropdown").addEventListener("change", enhancedHandleSizeChange);
    
    // Add pixel size input handler to update managers
    document.getElementById("pixelSizeInput").addEventListener("input", function() {
        const newPixelSize = parseInt(this.value);
        selectionManager.setPixelSize(newPixelSize);
    });
    
    // Apply initial responsive scaling
    applyResponsiveScaling();
    drawPixels();
    
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



// --- Enhanced responsive pixel scaling system --- //
function getScreenBreakpoint() {
    const screenWidth = window.innerWidth;
    
    for (const [breakpointName, config] of Object.entries(SCREEN_BREAKPOINTS)) {
        if (screenWidth <= config.maxWidth) {
            return { name: breakpointName, ...config };
        }
    }
    return { name: 'ultrawide', ...SCREEN_BREAKPOINTS.ultrawide };
}

function calculateOptimalPixelSize(pixelWidth, pixelHeight, forceCalculation = false) {
    // If auto-scaling is off and this isn't a forced calculation (like Fit to Screen), return current value
    if (!autoScaling && !forceCalculation) {
        return parseInt(document.getElementById("pixelSizeInput").value) || 8;
    }
    
    const breakpoint = getScreenBreakpoint();
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Calculate available space accounting for UI elements and margins
    const availableWidth = (screenWidth - breakpoint.margin) * breakpoint.scalingFactor;
    const availableHeight = (screenHeight - 200) * breakpoint.scalingFactor; // 200px for UI elements
    
    // Calculate maximum pixel size that fits both dimensions
    const maxPixelWidth = Math.floor(availableWidth / pixelWidth);
    const maxPixelHeight = Math.floor(availableHeight / pixelHeight);
    
    // Get dynamic max pixel size based on canvas dimensions
    const dynamicMax = getDynamicMaxPixelSize(pixelWidth, pixelHeight);
    
    // Use the smaller dimension to ensure it fits, constrained by min and dynamic max
    const optimalSize = Math.max(1, Math.min(maxPixelWidth, maxPixelHeight, dynamicMax));
    
    console.log(`Screen: ${breakpoint.name}, Array: ${pixelWidth}x${pixelHeight}, Optimal size: ${optimalSize}px`);
    return optimalSize;
}

function applyResponsiveScaling() {
    if (!autoScaling) return;
    
    const sizeDropdown = document.getElementById("sizeDropdown");
    const selectedSize = sizeDropdown.value;
    const [height, width] = selectedSize.split("x").map(Number);
    
    const optimalSize = calculateOptimalPixelSize(width, height);
    const pixelSizeInput = document.getElementById("pixelSizeInput");
    
    if (pixelSizeInput.value != optimalSize) {
        pixelSizeInput.value = optimalSize;
        drawPixels(); // Redraw with new pixel size
    }
}

// --- Legacy fitwidth function (enhanced) --- //
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

// --- Fit to screen function (one-time optimization) --- //
function fitToScreen() {
    // Calculate and apply optimal size once, without enabling auto-scaling
    const sizeDropdown = document.getElementById("sizeDropdown");
    const selectedSize = sizeDropdown.value;
    const [height, width] = selectedSize.split("x").map(Number);
    
    // Force calculation even if auto-scaling is disabled
    const optimalSize = calculateOptimalPixelSize(width, height, true);
    const pixelSizeInput = document.getElementById("pixelSizeInput");
    
    // Apply the optimal size but keep current auto-scaling preference
    pixelSizeInput.value = optimalSize;
    
    // Invalidate selection cache when fit to screen changes pixel size
    if (window.JTEdit && window.JTEdit.currentSelectionManager) {
        window.JTEdit.currentSelectionManager.onLayoutChange();
    }
    
    drawPixels();
    
    console.log(`Fit to Screen: Applied optimal size ${optimalSize}px (Auto Scale: ${autoScaling ? 'ON' : 'OFF'})`);
}

// --- Zoom control functions --- //
function zoomIn() {
    const pixelSizeInput = document.getElementById("pixelSizeInput");
    const currentSize = parseInt(pixelSizeInput.value);
    
    // Get current canvas dimensions for dynamic max calculation
    const sizeDropdown = document.getElementById("sizeDropdown");
    const selectedSize = sizeDropdown.value;
    const [height, width] = selectedSize.split("x").map(Number);
    const dynamicMax = getDynamicMaxPixelSize(width, height);
    
    const newSize = Math.min(currentSize + 1, dynamicMax);
    
    if (newSize !== currentSize) {
        autoScaling = false;
        document.getElementById("autoScaleToggle").checked = false;
        pixelSizeInput.value = newSize;
        
        // Invalidate selection cache when zoom changes
        if (window.JTEdit && window.JTEdit.currentSelectionManager) {
            window.JTEdit.currentSelectionManager.onLayoutChange();
        }
        
        drawPixels();
    }
}

function zoomOut() {
    const pixelSizeInput = document.getElementById("pixelSizeInput");
    const currentSize = parseInt(pixelSizeInput.value);
    const newSize = Math.max(currentSize - 1, 1);
    
    if (newSize !== currentSize) {
        autoScaling = false;
        document.getElementById("autoScaleToggle").checked = false;
        pixelSizeInput.value = newSize;
        
        // Invalidate selection cache when zoom changes
        if (window.JTEdit && window.JTEdit.currentSelectionManager) {
            window.JTEdit.currentSelectionManager.onLayoutChange();
        }
        
        drawPixels();
    }
}

function toggleAutoScale() {
    const autoScaleToggle = document.getElementById("autoScaleToggle");
    autoScaling = autoScaleToggle.checked;
    
    if (autoScaling) {
        applyResponsiveScaling();
    }
}


// --- Grid Toggle Functions --- //
let gridEnabled = localStorage.getItem('gridEnabled') !== 'false'; // Default to true

function toggleGrid() {
    const gridToggle = document.getElementById("gridToggle");
    const pixelCanvas = document.getElementById("pixelCanvas");
    
    gridEnabled = gridToggle.checked;
    
    if (gridEnabled) {
        pixelCanvas.classList.remove('no-grid');
    } else {
        pixelCanvas.classList.add('no-grid');
    }
    
    // Save preference to localStorage
    localStorage.setItem('gridEnabled', gridEnabled);
}

function initializeGrid() {
    const gridToggle = document.getElementById("gridToggle");
    const pixelCanvas = document.getElementById("pixelCanvas");
    
    // Set initial state from localStorage
    gridToggle.checked = gridEnabled;
    
    if (!gridEnabled) {
        pixelCanvas.classList.add('no-grid');
    }
}

// --- Unified Color Selector Functions --- //
function updateColorPreviews() {
    const foregroundPreview = document.getElementById("foregroundColorPreview");
    const backgroundPreview = document.getElementById("backgroundColorPreview");
    
    if (foregroundPreview && backgroundPreview) {
        foregroundPreview.style.backgroundColor = selectedColor;
        backgroundPreview.style.backgroundColor = rtmouseBtnColor;
    }
}

function selectForegroundColor() {
    if (colorFormat === '24bit') {
        document.getElementById("htmlColorPicker").click();
    } else {
        openColorPicker();
    }
}

function selectBackgroundColor() {
    if (colorFormat === '24bit') {
        // For 24-bit mode, create temporary color picker for background
        const tempColorPicker = document.createElement('input');
        tempColorPicker.type = 'color';
        tempColorPicker.value = rtmouseBtnColor;
        tempColorPicker.style.display = 'none';
        document.body.appendChild(tempColorPicker);
        
        tempColorPicker.addEventListener('change', function() {
            rtmouseBtnColor = this.value;
            updateColorPreviews();
            document.body.removeChild(tempColorPicker);
        });
        
        tempColorPicker.click();
    } else {
        // For 3-bit mode, cycle through colors for background
        changermbColor();
    }
}

// Function to update palette icon color (legacy function - now updates color previews)
function updatePaletteIconColor() {
  // Legacy function now just updates color previews since we have unified color selector
  updateColorPreviews();
}

function swapColors() {
    const temp = selectedColor;
    selectedColor = rtmouseBtnColor;
    rtmouseBtnColor = temp;
    
    // Update the color picker values
    if (colorFormat === '24bit') {
        document.getElementById("htmlColorPicker").value = selectedColor;
        // hexColorInput doesn't exist in the current UI, skip it
    } else {
        // Update the 3-bit color picker
        const customColorPicker = document.getElementById("customColorPicker");
        customColorPicker.value = selectedColor;
    }
    
    updateColorPreviews();
    updatePaletteIconColor();
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

        // Update selection manager pixel size if it has changed
        if (window.JTEdit && window.JTEdit.currentSelectionManager) {
            window.JTEdit.currentSelectionManager.setPixelSize(pixelSize);
        }

        // Calculate the width of each pixel based on the container size and array width
        const containerWidth = document.getElementById("pixelCanvasContainer").offsetWidth;

        pixelArray = pixelArrayFrames[currentFrameIndex];
        
        // Get actual dimensions from the pixel array, not just the dropdown
        const actualHeight = pixelArray ? pixelArray.length : height;
        const actualWidth = pixelArray && pixelArray.length > 0 ? pixelArray[0].length : width;
        
        // Update global variables to match actual array dimensions
        pixelHeight = actualHeight;
        pixelWidth = actualWidth;
        
        pixelCanvas.style.gridTemplateColumns = `repeat(${actualWidth}, ${pixelSize}px)`;

        pixelArray.forEach((row, rowIndex) => {
            row.forEach((color, columnIndex) => {
            var pixel                       = document.createElement("div");
                pixel.className             = "pixel";
                pixel.style.backgroundColor = color;                
                pixel.style.width           = `${pixelSize}px`;
                pixel.style.height          = `${pixelSize}px`;
                pixel.setAttribute('data-row', rowIndex);
                pixel.setAttribute('data-col', columnIndex);

                // Add click event listeners for pixel editing (enhanced for new tools)
                pixel.addEventListener('mousedown', (event) => {
                    mousebtn_Gbl = event.button;
                    window.handlePixelClick(rowIndex, columnIndex, event);
                });
                
                pixel.addEventListener('mousemove', (event) => {
                    if (window.currentTool === 'paint') {
                        togglePixel(rowIndex, columnIndex);
                    } else if (window.currentTool.startsWith('select') && window.JTEdit.currentSelectionManager.isSelecting) {
                        window.JTEdit.currentSelectionManager.updateSelection(rowIndex, columnIndex);
                    }
                }); 

                //prevent context menu when using right mouse button
                //pixel.addEventListener("contextmenu", event => {mousebtn_Gbl=event.button;event.preventDefault();return false;});

                pixelCanvas.appendChild(pixel);
            });

        });

        updateTextDisplay();
    }//drawPixels

      // Function to draw pixel colors while dragging mouse
        function togglePixel(row, col) {
            if (mousebtn_Gbl==0 || mousebtn_Gbl==2){
                const oldColor = pixelArray[row][col];
                const newColor = mousebtn_Gbl==0 ? selectedColor : rtmouseBtnColor;
                
                if (oldColor !== newColor) {
                    // Mark as dragging and track the change
                    isDragging = true;
                    
                    // Check if we already have a change for this pixel in the current drag
                    const existingChangeIndex = pendingPixelChanges.findIndex(
                        change => change.row === row && change.col === col
                    );
                    
                    if (existingChangeIndex >= 0) {
                        // Update the new color for existing change
                        pendingPixelChanges[existingChangeIndex].newColor = newColor;
                    } else {
                        // Add new pixel change
                        pendingPixelChanges.push({row, col, oldColor, newColor});
                    }
                    
                    // Apply the change visually
                    pixelArray[row][col] = newColor;
                    drawPixels();
                    updateTextDisplay();
                }
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

function debug_init(){ 
  //init some parameters, for debugging
  document.getElementById("sizeDropdown").value="16x32";
  document.getElementById("pixelSizeInput").value="15";
  document.getElementById("customColorPicker").value="#000000"
  // Removed paletteIcon reference - using unified color selector now
  var myevent = new Event('change');
  document.getElementById("customColorPicker").dispatchEvent(myevent)
  document.getElementById("paintBucketButton").click();
  document.getElementById("debugToggle").click();
}
