

[![logo](https://raw.githubusercontent.com/Albacusphetical/multi-transpose/main/src-tauri/icons/128x128%402x.png)
](https://github.com/Albacusphetical/multi-transpose/releases/latest)
# [multi-transpose](https://github.com/Albacusphetical/multi-transpose/releases/latest)

Any-to-any transposition for VP, go from transpose X to Y instantly. 

Compatible with websites and games that allow you to transpose with your keyboard.

[![multi-transpose-showcase](https://github.com/Albacusphetical/multi-transpose/assets/137510000/c77ade69-4302-4233-bdfa-e1e4e3ea0b8c)
](https://github.com/Albacusphetical/multi-transpose/releases/latest)

# How to use it?

See our [Usage Guide](https://github.com/Albacusphetical/multi-transpose/wiki/Usage-Guide) for an example.

# Installation

[Download](https://github.com/Albacusphetical/multi-transpose/releases/latest) the installer (.exe) for the latest release for your platform. 

Open and run the installer, it may say the app is unsafe, however nothing is wrong with this, this is because it presses the transpose up/down keys for you as an example, you can verify this for yourself in the code above.

If you see this, press "more info", then press "run anyway" to start installing.

![windowsprotection](https://github.com/Albacusphetical/multi-transpose/assets/137510000/a3f57e8f-04b7-4fe6-b38a-34c8cfb43c83)


# Project setup

You will need nodejs/npm, heres a guide by npm themselves: https://docs.npmjs.com/downloading-and-installing-node-js-and-npm

Once you have that set up, cd into src/, and run "npm install" in terminal. Do not run yet, next step, see below.

You will need Rust (you may currently need to use the latest nightly version) to be able to run Tauri. 
See Tauri's prerequisites here: https://tauri.app/v1/guides/getting-started/prerequisites#3-rust

Once you have set up Rust, cd into src-tauri/, and before building, first you must apply any patches available.
Run "cargo install patch-crate", then once thats installed, run "cargo patch-crate". 

Once you have applied patches, and have nodejs/npm setup, you can run either "npm run tauri dev" for development, or "npm run tauri build" to create a production build.

If you have made it this far without a sweat 🎉congratulations🎉, if not, feel free to let me know if you have trouble setting up otherwise.
