

[![logo](https://raw.githubusercontent.com/Albacusphetical/multi-transpose/main/src-tauri/icons/128x128%402x.png)
](https://github.com/Albacusphetical/multi-transpose/releases/latest)
# [multi-transpose](https://github.com/Albacusphetical/multi-transpose/releases/latest)

Any-to-any transposition for VP, go from transpose X to Y instantly. 

Compatible with websites and games that allow you to transpose with your keyboard.

[![multi-transpose-showcase](https://github.com/Albacusphetical/multi-transpose/assets/137510000/c77ade69-4302-4233-bdfa-e1e4e3ea0b8c)
](https://github.com/Albacusphetical/multi-transpose/releases/latest)

Check out this [converter](https://github.com/ArijanJ/midi-converter) if you want to create multi-transpose sheets and copy and paste in transposes.

# How to use it?

See our [Usage Guide](https://github.com/Albacusphetical/multi-transpose/wiki/Usage-Guide) for an example.

# Installation

### Windows:

[Download](https://github.com/Albacusphetical/multi-transpose/releases/latest) the installer ([.exe](https://github.com/Albacusphetical/multi-transpose/releases/download/v1.2.5/multi-transpose_1.2.5_x64-setup.exe)) for the latest release. 

Open and run the installer, it may say the app is unsafe, however nothing is wrong with this, this is because it presses the transpose up/down keys for you as an example, you can verify this for yourself in the code above.

If you see this, press "more info", then press "run anyway" to start installing.

![windowsprotection](https://github.com/Albacusphetical/multi-transpose/assets/137510000/a3f57e8f-04b7-4fe6-b38a-34c8cfb43c83)

### Linux:

Soon...

### MacOS:

Soon...

# Project setup

You will need nodejs/npm, heres a guide by npm themselves: https://docs.npmjs.com/downloading-and-installing-node-js-and-npm

Once you have that set up, cd into src/, and run "npm install" in terminal. Do not run yet, next step, see below.

You will need Rust (you may currently need to use the latest nightly version) to be able to run Tauri. 
See Tauri's prerequisites here: https://tauri.app/v1/guides/getting-started/prerequisites#3-rust

Once you have set up Rust and have nodejs/npm setup, cd into src-tauri/, you can run either "npm run tauri dev" for development, or "npm run tauri build" to create a production build.

If you have made it this far without a sweat 🎉congratulations🎉, if not, feel free to let me know if you have trouble setting up otherwise.

This project depends on a fork of [rdev](https://github.com/Narsil/rdev) for keyboard events, check it out here:
https://github.com/Albacusphetical/rdev
