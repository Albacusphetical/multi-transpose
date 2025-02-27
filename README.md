

[![logo](https://raw.githubusercontent.com/Albacusphetical/multi-transpose/main/src-tauri/icons/128x128%402x.png)
](https://github.com/Albacusphetical/multi-transpose/releases/latest)
# [multi-transpose](https://github.com/Albacusphetical/multi-transpose/releases/latest)

Any-to-any transposition for VP, go from transpose X to Y instantly.

Cross-platform and compatible with websites and games that allow you to transpose with your keyboard.

Now with new scroll by keybind feature introduced in version 1.2.8!

[Install](https://github.com/Albacusphetical/multi-transpose/tree/main?tab=readme-ov-file#installation)

[![multi-transpose-showcase](https://github.com/user-attachments/assets/eda3aaae-aea3-4ff5-a94c-ac19d7b0dab2)
](https://github.com/Albacusphetical/multi-transpose/releases/latest)

Check out this [converter](https://github.com/ArijanJ/midi-converter) if you want to create multi-transpose sheets and copy and paste in transposes.

# How to use it?

See our [Usage Guide](https://github.com/Albacusphetical/multi-transpose/wiki/Usage-Guide) for an example.

# Installation

### Windows:

[Download](https://github.com/Albacusphetical/multi-transpose/releases/latest) the installer ([.exe](https://github.com/Albacusphetical/multi-transpose/releases/download/v1.3.1/multi-transpose_1.3.1_x64-setup.exe)) for the latest release. 

Open and run the installer, it may say the app is unsafe, however nothing is wrong with this, this is because it presses the transpose up/down keys for you as an example, you can verify this for yourself in the code above.

If you see this, press "more info", then press "run anyway" to start installing.

![windowsprotection](https://github.com/Albacusphetical/multi-transpose/assets/137510000/a3f57e8f-04b7-4fe6-b38a-34c8cfb43c83)

### Linux:

[Download](https://github.com/Albacusphetical/multi-transpose/releases/latest) the installer ([.AppImage](https://github.com/Albacusphetical/multi-transpose/releases/download/v1.3.1/multi-transpose_1.3.1_amd64.AppImage)/[.deb](https://github.com/Albacusphetical/multi-transpose/releases/download/v1.3.1/multi-transpose_1.3.1_amd64.deb)) for the latest release. 

*There are only instructions here for .AppImage, feel free to message me if you'd like to create instructions for .deb*

Once you have downloaded the .AppImage file, go to the file, right-click and go into properties then tick "Allow executing file as program":

![image](https://github.com/Albacusphetical/multi-transpose/assets/137510000/27d52fb3-87d6-4659-9d2d-5abfee090f27)


### MacOS:

[Download](https://github.com/Albacusphetical/multi-transpose/releases/latest) the installer ([.dmg](https://github.com/Albacusphetical/multi-transpose/releases/download/v1.3.1/multi-transpose_1.3.1_x64.dmg)) for the latest release.

Open the .dmg file first, if you see something like the following:

![image](https://github.com/Albacusphetical/multi-transpose/assets/137510000/987e54dc-6499-4256-adba-fcc20d0a264c)

In System Preferences, go to Security and Preferences > Security and Privacy and press open anyway:
![image](https://github.com/Albacusphetical/multi-transpose/assets/137510000/f44c893e-538f-40c3-84d3-05bb33018829)

Next, within the .dmg, move multi-transpose to Applications, this is important for the next step:

![image](https://github.com/Albacusphetical/multi-transpose/assets/137510000/0ce230d0-d1bb-4286-8f0b-0faf67018c7a)

Now, you need to give the app or whatever you run for multi-transpose, permissions in Accessibility and Input Monitoring.
This can be done by going to Security and Preferences > Security and Privacy > Privacy and do the following:

Make sure to select multi-transpose from your Applications folder!
![image](https://github.com/Albacusphetical/multi-transpose/assets/137510000/9d692808-6021-458f-b32a-2f88172773f6)
![image](https://github.com/Albacusphetical/multi-transpose/assets/137510000/7c9b2e45-7603-45bc-81b1-0fa4e8b709fa)

Now start multi-transpose from Applications, it will start, otherwise, if you see another pop-up like the app isn't recognised, go back to Security and Preferences > Security and Privacy and press open anyway again.

# Known Bugs

**Windows:** N/A

**Linux:** N/A

**MacOS:** 
- Some buttons/icons may be visually glitched depending on MacOS version but still function.
- Sheet Viewer can't be on top of an application that is in fullscreen mode.

# Project setup

You will need nodejs/npm, heres a guide by npm themselves: https://docs.npmjs.com/downloading-and-installing-node-js-and-npm

Once you have that set up, cd into src/, and run "npm install" in terminal. Do not run yet, next step, see below.

You will need Rust (you may currently need to use the latest nightly version) to be able to run Tauri. 
See Tauri's prerequisites here: https://tauri.app/v1/guides/getting-started/prerequisites#3-rust

Once you have set up Rust and have nodejs/npm setup, cd into src-tauri/, you can run either "npm run tauri dev" for development, or "npm run tauri build" to create a production build.

If you are on developing on MacOS, you will need to give the process running the app, security permissions for Accessibility and Input Monitoring, for example, if you are running the app via MacOS Terminal.

If you have made it this far without a sweat 🎉congratulations🎉, if not, feel free to let me know if you have trouble setting up otherwise.

This project depends on a fork of [rdev](https://github.com/Narsil/rdev) for keyboard events, check it out here:
https://github.com/Albacusphetical/rdev
