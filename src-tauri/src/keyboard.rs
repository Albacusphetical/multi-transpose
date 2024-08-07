use tauri::{AppHandle, Manager};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use rdev::{Event, EventType, simulate, key_from_code, code_from_key, Key};
use serde_json::{json, Value};
use serde::{Serialize, Deserialize};
use crate::{CURRENT_TRANSPOSE, SELECTED_INDEX, transpose, transpose_up, transpose_down, PAUSED, TRANSPOSES, SCROLL_VALUE};
use crate::event_processing::Payload;
use crate::audio::{Sound, play_sound};
use lazy_static::lazy_static;
use log::{info, error};

#[derive(Serialize, Deserialize)]
#[serde(untagged)]
enum KeyRepr {
    Key(Key),
    Unknown(String)
}

// for identifying key pressed before setting keybind, value is controlled by frontend
pub static mut KEY_LISTEN: bool = false;

// keybindings
pub static mut PAUSE_BIND: Option<u64> = None;
pub static mut TRANSPOSE_UP_BIND: Option<u64> = None;
pub static mut TRANSPOSE_DOWN_BIND: Option<u64> = None;
pub static mut NEXT_TRANSPOSE_BIND: Option<u64> = None;
pub static mut PREVIOUS_TRANSPOSE_BIND: Option<u64> = None;
pub static mut SCROLL_DOWN_BIND: Option<u64> = None;

// safety for held keys, a keybind action should be only executed on the first keypress
lazy_static! {
    static ref KEY_HELD: Mutex<HashMap<Key, bool>> = Mutex::new(HashMap::new());
}

fn insert_key_is_held_value(key: Key, value: bool) {
    KEY_HELD.lock().unwrap().insert(key, value);
}

fn get_key_is_held_value(key: &Key) -> bool {
    let key = KEY_HELD.lock().unwrap().get(key).cloned();

    if key.is_none() {
        return false;
    }

    key.unwrap()
}

fn key_held_contains(key: &Key) -> bool {
    KEY_HELD.lock().unwrap().contains_key(key)
}

unsafe fn check_key_held(key: Key) -> bool {
    if !key_held_contains(&key) {
        insert_key_is_held_value(key, false);
        return false;
    }

    get_key_is_held_value(&key)
}

// callback for rdev listener for keyboard events
pub fn callback(event: Event, app_handle: &AppHandle, last_press: &Arc<Mutex<Option<Instant>>>) {
    match event.event_type {
        EventType::KeyPress(key) => unsafe {
            if KEY_LISTEN {
                /* This will prevent any keybinds running in order to identify the key pressed and send the key to the frontend.
                   Identifying the key was originally done on browser, but not cross-platform friendly.
                */

                let mut key_repr: KeyRepr = KeyRepr::Key(key);

                let keycode = code_from_key(key);
                if !keycode.is_none() && key == Key::Unknown(keycode.unwrap() as u32) {
                    key_repr = KeyRepr::Unknown(format!("Key{:?}", keycode.unwrap()));
                }

                let json = serde_json::to_string(&json!({"key": key_repr, "keycode": keycode})).unwrap();
                app_handle.emit_all("key_consume", Payload { message: json });

                return;
            }

            if NEXT_TRANSPOSE_BIND.is_none()
                || PREVIOUS_TRANSPOSE_BIND.is_none()
                || PAUSE_BIND.is_none()
            {
                return;
            }

            #[cfg(target_os = "windows")]
                let pause_key = key_from_code(PAUSE_BIND.unwrap() as u32);
            #[cfg(target_os = "windows")]
                let next_transpose_key = key_from_code(NEXT_TRANSPOSE_BIND.unwrap() as u32);
            #[cfg(target_os = "windows")]
                let previous_transpose_key = key_from_code(PREVIOUS_TRANSPOSE_BIND.unwrap() as u32);
            #[cfg(target_os = "windows")]
                let scroll_down_key = key_from_code(SCROLL_DOWN_BIND.unwrap() as u32);

            #[cfg(target_os = "linux")]
                let pause_key = key_from_code(PAUSE_BIND.unwrap() as u32);
            #[cfg(target_os = "linux")]
                let next_transpose_key = key_from_code(NEXT_TRANSPOSE_BIND.unwrap() as u32);
            #[cfg(target_os = "linux")]
                let previous_transpose_key = key_from_code(PREVIOUS_TRANSPOSE_BIND.unwrap() as u32);
            #[cfg(target_os = "linux")]
                let scroll_down_key = key_from_code(SCROLL_DOWN_BIND.unwrap() as u32);

            #[cfg(target_os = "macos")]
                let pause_key = key_from_code(PAUSE_BIND.unwrap() as u16);
            #[cfg(target_os = "macos")]
                let next_transpose_key = key_from_code(NEXT_TRANSPOSE_BIND.unwrap() as u16);
            #[cfg(target_os = "macos")]
                let previous_transpose_key = key_from_code(PREVIOUS_TRANSPOSE_BIND.unwrap() as u16);
            #[cfg(target_os = "macos")]
                let scroll_down_key = key_from_code(SCROLL_DOWN_BIND.unwrap() as u32);

            if !SCROLL_DOWN_BIND.is_none() && key == scroll_down_key {
                scroll_bind_event();
            }

            if !PAUSE_BIND.is_none() && key == pause_key {
                if check_key_held(pause_key) {
                    return;
                }

                insert_key_is_held_value(pause_key, true);

                if TRANSPOSE_UP_BIND.is_none()
                    || TRANSPOSE_DOWN_BIND.is_none()
                    || NEXT_TRANSPOSE_BIND.is_none()
                    || PREVIOUS_TRANSPOSE_BIND.is_none()
                {
                    // prevent resuming if there are required keybindings still
                    return;
                }

                PAUSED = !PAUSED;
                if PAUSED {
                    play_sound(Sound::Pause, app_handle.clone());
                }
                else {
                    play_sound(Sound::Resume, app_handle.clone());
                }

                let json = serde_json::to_string(&json!({"paused": PAUSED})).unwrap();
                app_handle.emit_all("frontend_event", Payload { message: json });
            }
            else if !NEXT_TRANSPOSE_BIND.is_none() && key == next_transpose_key {
                if check_key_held(next_transpose_key) {
                    return;
                }

                insert_key_is_held_value(next_transpose_key, true);

                next_transpose_bind_fn(app_handle.app_handle(), last_press.clone());
            }
            else if !PREVIOUS_TRANSPOSE_BIND.is_none() && key == previous_transpose_key {
                if check_key_held(previous_transpose_key) {
                    return;
                }

                insert_key_is_held_value(previous_transpose_key, true);

                previous_transpose_bind_fn(app_handle.app_handle(), last_press.clone());
            }
        },
        EventType::KeyRelease(key) => unsafe {
            if KEY_LISTEN { // see KeyPress above
                return;
            }

            if NEXT_TRANSPOSE_BIND.is_none()
                || PREVIOUS_TRANSPOSE_BIND.is_none()
                || PAUSE_BIND.is_none()
            {
                return;
            }

            #[cfg(target_os = "windows")]
                let pause_key = key_from_code(PAUSE_BIND.unwrap() as u32);
            #[cfg(target_os = "windows")]
                let next_transpose_key = key_from_code(NEXT_TRANSPOSE_BIND.unwrap() as u32);
            #[cfg(target_os = "windows")]
                let previous_transpose_key = key_from_code(PREVIOUS_TRANSPOSE_BIND.unwrap() as u32);

            #[cfg(target_os = "linux")]
                let pause_key = key_from_code(PAUSE_BIND.unwrap() as u32);
            #[cfg(target_os = "linux")]
                let next_transpose_key = key_from_code(NEXT_TRANSPOSE_BIND.unwrap() as u32);
            #[cfg(target_os = "linux")]
                let previous_transpose_key = key_from_code(PREVIOUS_TRANSPOSE_BIND.unwrap() as u32);

            #[cfg(target_os = "macos")]
                let pause_key = key_from_code(PAUSE_BIND.unwrap() as u16);
            #[cfg(target_os = "macos")]
                let next_transpose_key = key_from_code(NEXT_TRANSPOSE_BIND.unwrap() as u16);
            #[cfg(target_os = "macos")]
                let previous_transpose_key = key_from_code(PREVIOUS_TRANSPOSE_BIND.unwrap() as u16);


            if !PAUSE_BIND.is_none() && key == pause_key {
                insert_key_is_held_value(pause_key, false);
            }
            else if !NEXT_TRANSPOSE_BIND.is_none() && key == next_transpose_key {
                insert_key_is_held_value(next_transpose_key, false);
            }
            else if !PREVIOUS_TRANSPOSE_BIND.is_none() && key == previous_transpose_key {
                insert_key_is_held_value(previous_transpose_key, false);
            }
        },
        _ => (),
    };
}

pub unsafe fn send_key(code: u64) {
    #[cfg(target_os = "windows")]
        let code = code as u32;
    #[cfg(target_os = "macos")]
        let code = code as u16;
    #[cfg(target_os = "linux")]
        let code = code as u32;

    match simulate(&EventType::KeyPress(key_from_code(code))) {
        Ok(()) => (),
        Err(SimulateError) => {
            error!("Failed to send KeyPress event for key: {:?}", SimulateError);
        }
    }

    match simulate(&EventType::KeyRelease(key_from_code(code))) {
        Ok(()) => (),
        Err(SimulateError) => {
            error!("Failed to send KeyPress event for key: {:?}", SimulateError);
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
    play_sound(Sound::Next, app_handle.clone());

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
    play_sound(Sound::Previous, app_handle.clone());

    *last_press = Some(Instant::now());
    *selected_index = next_index;

    let json = serde_json::to_string(&json!({"current_index": next_index})).unwrap();
    app_handle.emit_all("frontend_event", Payload { message: json }).unwrap();
}

unsafe fn scroll_bind_event() {
    if PAUSED {
        return;
    }

    match simulate(&EventType::Wheel {
        delta_x: 0,
        delta_y: -SCROLL_VALUE,
    }) {
        Ok(()) => (),
        Err(SimulateError) => {
            println!("We could not send scroll event");
        }
    }
}