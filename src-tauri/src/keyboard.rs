extern crate winapi;

use std::ptr::null;
use tauri::{AppHandle, Manager};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use serde_json::json;
use winapi::um::winuser::{INPUT, INPUT_KEYBOARD, KEYBDINPUT, SendInput, KEYEVENTF_KEYUP, KEYEVENTF_SCANCODE, KEYEVENTF_EXTENDEDKEY, MapVirtualKeyW, MAPVK_VK_TO_VSC};
use winapi::shared::minwindef::{WORD, DWORD};
use crate::{CURRENT_TRANSPOSE, SELECTED_INDEX, transpose, transpose_up, transpose_down, PAUSED, TRANSPOSES};
use crate::event_processing::Payload;

// keybindings
pub static mut PAUSE_BIND: Option<u64> = None;
pub static mut TRANSPOSE_UP_BIND: Option<u64> = None;
pub static mut TRANSPOSE_DOWN_BIND: Option<u64> = None;
pub static mut NEXT_TRANSPOSE_BIND: Option<u64> = None;
pub static mut PREVIOUS_TRANSPOSE_BIND: Option<u64> = None;

// hold down the key
pub unsafe fn keydown(key: u64) {
    let key = MapVirtualKeyW(key as u32, MAPVK_VK_TO_VSC) as WORD;

    let mut kbd_input: INPUT = INPUT {
        type_: INPUT_KEYBOARD,
        u: unsafe { std::mem::zeroed() },
    };

    *kbd_input.u.ki_mut() = KEYBDINPUT {
        wVk: 0,
        wScan: 0xE0,
        dwFlags: KEYEVENTF_SCANCODE,
        time: 0,
        dwExtraInfo: 0
    };

    SendInput(1, &mut kbd_input, std::mem::size_of::<INPUT>() as i32);

    *kbd_input.u.ki_mut() = KEYBDINPUT {
        wVk: 0,
        wScan: key,
        dwFlags: KEYEVENTF_SCANCODE | KEYEVENTF_EXTENDEDKEY,
        time: 0,
        dwExtraInfo: 0,
    };

    SendInput(1, &mut kbd_input, std::mem::size_of::<INPUT>() as i32);
}


// release the key
pub unsafe fn keyup(key: u64) {
    let key = MapVirtualKeyW(key as u32, MAPVK_VK_TO_VSC) as WORD;

    let mut kbd_input: INPUT = INPUT {
        type_: INPUT_KEYBOARD,
        u: unsafe { std::mem::zeroed() },
    };

    // keyup
    *kbd_input.u.ki_mut() = KEYBDINPUT {
        wVk: 0,
        wScan: key,
        dwFlags: KEYEVENTF_SCANCODE | KEYEVENTF_KEYUP | KEYEVENTF_EXTENDEDKEY,
        time: 0,
        dwExtraInfo: 0,
    };

    SendInput(1, &mut kbd_input, std::mem::size_of::<INPUT>() as i32);

    *kbd_input.u.ki_mut() = KEYBDINPUT {
        wVk: 0,
        wScan: 0xE0, // Extended scan code for arrow keys when NumLock is on
        dwFlags: KEYEVENTF_SCANCODE | KEYEVENTF_KEYUP,
        time: 0,
        dwExtraInfo: 0,
    };

    SendInput(1, &mut kbd_input, std::mem::size_of::<INPUT>() as i32);
}

// keybinding callback functions
pub unsafe fn transpose_up_bind_fn(app_handle: AppHandle, last_press: Arc<Mutex<Option<Instant>>>) {
    if PAUSED {
        return;
    }

    let mut transposes = TRANSPOSES.lock().unwrap().to_vec();
    let mut selected_index = SELECTED_INDEX.lock().unwrap();
    let mut last_press = last_press.lock().unwrap();
    let next_index = (*selected_index + 1) % transposes.len(); // circular

    if let Some(instant) = *last_press {
        if instant.elapsed() < Duration::from_millis(100) {
            // Not enough time has passed since the last key press,
            // so ignore this key press.
            return;
        }
    }

    transpose(transposes[next_index]);

    *last_press = Some(Instant::now());
    *selected_index = next_index;

    let json = serde_json::to_string(&json!({"current_index": next_index})).unwrap();
    app_handle.emit_all("frontend_event", Payload { message: json}).unwrap();
}

pub unsafe fn transpose_down_bind_fn(app_handle: AppHandle, last_press: Arc<Mutex<Option<Instant>>>) {
    if PAUSED {
        return;
    }

    let mut transposes = TRANSPOSES.lock().unwrap().to_vec();
    let mut selected_index = SELECTED_INDEX.lock().unwrap();
    let mut last_press = last_press.lock().unwrap();

    let next_index = (*selected_index + transposes.len() - 1) % transposes.len(); // circular

    if let Some(instant) = *last_press {
        if instant.elapsed() < Duration::from_millis(100) {
            // Not enough time has passed since the last key press,
            // so ignore this key press.
            return;
        }
    }

    transpose(transposes[next_index]);

    *last_press = Some(Instant::now());
    *selected_index = next_index;

    let json = serde_json::to_string(&json!({"current_index": next_index})).unwrap();
    app_handle.emit_all("frontend_event", Payload { message: json }).unwrap();
}