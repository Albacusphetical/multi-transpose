use tauri::{AppHandle, Manager};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use rdev::{Event, EventType, simulate, key_from_code, Key};
use serde_json::json;
use crate::{CURRENT_TRANSPOSE, SELECTED_INDEX, transpose, transpose_up, transpose_down, PAUSED, TRANSPOSES};
use crate::event_processing::Payload;

// keybindings
pub static mut PAUSE_BIND: Option<u64> = None;
pub static mut TRANSPOSE_UP_BIND: Option<u64> = None;
pub static mut TRANSPOSE_DOWN_BIND: Option<u64> = None;
pub static mut NEXT_TRANSPOSE_BIND: Option<u64> = None;
pub static mut PREVIOUS_TRANSPOSE_BIND: Option<u64> = None;

// callback for rdev listener for keyboard events
pub fn callback(event: Event, app_handle: &AppHandle, last_press: &Arc<Mutex<Option<Instant>>>) {
    match event.event_type {
        EventType::KeyPress(key) => unsafe {
            #[cfg(target_os = "windows")]
                let pause_key = key_from_code(PAUSE_BIND.unwrap() as u16);
            #[cfg(target_os = "windows")]
                let next_transpose_key = key_from_code(NEXT_TRANSPOSE_BIND.unwrap() as u16);
            #[cfg(target_os = "windows")]
                let previous_transpose_key = key_from_code(PREVIOUS_TRANSPOSE_BIND.unwrap() as u16);

            #[cfg(target_os = "linux")]
                let pause_key = key_from_code(PAUSE_BIND.unwrap() as u32);
            #[cfg(target_os = "linux")]
                let next_transpose_key = key_from_code(NEXT_TRANSPOSE_BIND.unwrap() as u32);
            #[cfg(target_os = "linux")]
                let previous_transpose_key = key_from_code(PREVIOUS_TRANSPOSE_BIND.unwrap() as u32);

            // no clue if this will compile on mac
            #[cfg(target_os = "macos")]
                let pause_key = key_from_code(PAUSE_BIND.unwrap() as u16);
            #[cfg(target_os = "macos")]
                let next_transpose_key = key_from_code(NEXT_TRANSPOSE_BIND.unwrap() as u16);
            #[cfg(target_os = "macos")]
                let previous_transpose_key = key_from_code(PREVIOUS_TRANSPOSE_BIND.unwrap() as u16);


            if !PAUSE_BIND.is_none() && key == pause_key {
                if TRANSPOSE_UP_BIND.is_none()
                    || TRANSPOSE_DOWN_BIND.is_none()
                    || NEXT_TRANSPOSE_BIND.is_none()
                    || PREVIOUS_TRANSPOSE_BIND.is_none()
                {
                    // prevent resuming if there are required keybindings still
                    return;
                }

                PAUSED = !PAUSED;

                let json = serde_json::to_string(&json!({"paused": PAUSED})).unwrap();
                app_handle.emit_all("frontend_event", Payload { message: json });
            }
            else if !NEXT_TRANSPOSE_BIND.is_none() && key == next_transpose_key {
                next_transpose_bind_fn(app_handle.app_handle(), last_press.clone());
            }
            else if !PREVIOUS_TRANSPOSE_BIND.is_none() && key == previous_transpose_key {
                previous_transpose_bind_fn(app_handle.app_handle(), last_press.clone());
            }
        },
        _ => (),
    };
}

pub unsafe fn send_key(code: u64) {
    #[cfg(target_os = "windows")]
        let code = code as u16;
    #[cfg(target_os = "macos")] // unsure if this will compile
        let code = code as u16;
    #[cfg(target_os = "linux")]
        let code = code as u32;

    match simulate(&EventType::KeyPress(key_from_code(code))) {
        Ok(()) => (),
        Err(SimulateError) => {
            println!("Failed to send KeyPress event for key: {:?}", SimulateError);
        }
    }

    match simulate(&EventType::KeyRelease(key_from_code(code))) {
        Ok(()) => (),
        Err(SimulateError) => {
            println!("Failed to send KeyPress event for key: {:?}", SimulateError);
        }
    }
}

// keybinding callback functions
pub unsafe fn next_transpose_bind_fn(app_handle: AppHandle, last_press: Arc<Mutex<Option<Instant>>>) {
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

pub unsafe fn previous_transpose_bind_fn(app_handle: AppHandle, last_press: Arc<Mutex<Option<Instant>>>) {
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