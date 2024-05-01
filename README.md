The CoolLED1248 program controls color LED panels and uses .JT files.

However, it is horrible to edit these on the mobile phone. This project aims to create a browser based editor to allow for computer based editing.

It should support manual manipulation of individual pixes in the 3 bit (aka 7 + black) color space, as well as importing jpg images (and rasterizing them down to 3 bit color), and exporting to JT format.

In the samples folder, You can use the sample jpg and sample color table to edit in photoshop then import into the tool to convert to JT format.

Please contribute any changes you make on your system by sending a pull request!

...

<b>Panel Communication</b>

CoolLED1248
Versions 2.x of the Android app can import and export JT files.  If you have problems importing or with other functions, try version 2.1.4.

CoolLEDX Driver
If you want to send commands to a panel with a PC or SBC, you can try the coolledx python driver.  This is a work-in-progress so some capabilities may improve as the project matures.

To install the CoolLEDX driver on your system:
1.  clone the repository to your PC.

        git clone https://github.com/UpDryTwist/coolledx-driver.git

2.  From the coolledx-driver folder, copy the coolledx folder to your python library 

        cd /yourpath/coolledx-driver/
        cp -a coolledx /home/<yourusername>/.local/lib/python3.8/site-packages/.

3.  Install bleak

        pip install bleak

4.  If you get this error when trying to run commands from the coolledx driver,

        ImportError: cannot import name 'StrEnum' from 'enum' (/usr/lib/python3.8/enum.py)

    install StrEnum and edit the coolledx/__init__.py file so StrEnum is imported from strenum instead of enum

        python3 -m pip install StrEnum

    <pre>
    #---then edit the first few lines of coolledx/__init__.py file----
    #from enum import IntEnum, StrEnum
    from enum import IntEnum
    from strenum import StrEnum 
    #-----------------------------------------------------------------
    </pre>

<b>To send commands to the panel:</b>
1.  Change to the coolledx-driver directory and use scan.py to find your MAC address.

        python3 utils/scan.py
    <pre>
    --response---
    Scanning for 10.0 seconds (change duration with -t) . . .
    --------------------------------------------------------------------------------
    Device: CoolLEDX (XX:XX:XX:XX:XX:XX), RSSI: -61
    Height: 16, Width: 32
    </pre>

2.  Use utils/tweak_sign.py to send commands to the panel.

        python3 utils/tweak_sign.py x
    <pre>
    --response---
    usage: tweak_sign.py 
    [-h] [-a [ADDRESS]] [-t TEXT] [-s SPEED] [-b BRIGHTNESS] [-c COLOR] [-C BACKGROUND_COLOR]
    [-j START_COLOR_MARKER] [-k END_COLOR_MARKER] [-f FONT] [-H FONT_HEIGHT] [-l LOG]
    [-o ONOFF] [-m MODE] [-i IMAGE] [-n ANIMATION] [-N ANIMATION_SPEED] [-w WIDTH_TREATMENT]
    [-g HEIGHT_TREATMENT] [-z HORIZONTAL_ALIGNMENT] [-y VERTICAL_ALIGNMENT]
    tweak_sign.py: error: unrecognized arguments: x
    </pre>

<b>To send an image to the panel:</b>

        python3 utils/tweak_sign.py -a YOUR:MAC:FROM:SCAN:PY -i yourimage.png
    

