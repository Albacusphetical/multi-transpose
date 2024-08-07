use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use log::info;
use tauri::{AppHandle, Event, Manager};
use serde_json::{json, Value};
use serde_json::Value::Object;
use crate::keyboard::{KEY_LISTEN, PAUSE_BIND, TRANSPOSE_DOWN_BIND, previous_transpose_bind_fn, TRANSPOSE_UP_BIND, next_transpose_bind_fn, PREVIOUS_TRANSPOSE_BIND, NEXT_TRANSPOSE_BIND, SCROLL_DOWN_BIND};
use crate::audio::{MUTED, VOLUME};
use crate::{PAUSED, SELECTED_INDEX, TRANSPOSES, CURRENT_TRANSPOSE, SCROLL_VALUE};
use rdev::{simulate, EventType};

#[derive(Clone, serde::Serialize)]
pub struct Payload {
    pub message: String,
}

pub unsafe fn process_event(event: Event, app_handle: AppHandle, last_press: Arc<Mutex<Option<Instant>>>) {
    let json: Value = serde_json::from_str(event.payload().unwrap()).expect("failed to parse json");

    info!("EVENT FROM FRONTEND: {:?}", json);
    if let Some(new_transposes) = json.get("transposes") {
        change_transposes_event(new_transposes);

        let json = serde_json::to_string(&json!({"current_index": 0})).unwrap();
        app_handle.emit_all("frontend_event", Payload { message: json }).unwrap();
    }
    else if let Some(new_index) = json.get("selected_index") {
        select_index_event(new_index, app_handle);
    }
    else if let Some(key_listen) = json.get("key_listen") {
        /* This will prevent any keybinds running in order to identify the key pressed and send the key to the frontend.
           Identifying the key was originally done on browser, but not cross-platform friendly.
        */

        key_listen_event(key_listen);
    }
    else if let Some(keybind) = json.get("bind") {
        set_keybind_event(keybind, app_handle, last_press);
    }
    else if let Some(pause) = json.get("pause") {
        pause_event(pause, app_handle);
    }
    else if let Some(muted) = json.get("muted") {
        muted_event(muted);
    }
    else if let Some(volume) = json.get("volume") {
        volume_event(volume);
    }
    else if let Some(scroll_value) = json.get("scroll_value") {
        scroll_value_event(scroll_value);
    }
}

unsafe fn pause_event(pause: &Value, app_handle: AppHandle) {
    PAUSED = pause.as_bool().unwrap();

    let json = serde_json::to_string(&json!({"paused": PAUSED})).unwrap();
    app_handle.emit_all("frontend_event", Payload { message: json });
}

unsafe fn muted_event(muted: &Value) {
    MUTED = muted.as_bool().unwrap();
}

unsafe fn volume_event(volume: &Value) {
    VOLUME = volume.as_f64().unwrap() as f32;
}

unsafe fn scroll_value_event(scroll_value: &Value) {
    SCROLL_VALUE = scroll_value.as_i64().unwrap();
}

unsafe fn change_transposes_event(new_transposes: &Value) {
    let mut transposes = TRANSPOSES.lock().unwrap();
    let mut selected_index = SELECTED_INDEX.lock().unwrap();

    *selected_index = 0;
    *transposes = serde_json::from_value(new_transposes.clone()).expect("failed to convert 'transposes' field to vector");

    CURRENT_TRANSPOSE = transposes[*selected_index];
}

unsafe fn select_index_event(new_index: &Value, app_handle: AppHandle) {
    let new_index = new_index.as_u64().unwrap() as usize;
    let mut transposes = TRANSPOSES.lock().unwrap();
    let mut selected_index = SELECTED_INDEX.lock().unwrap();

    *selected_index = new_index;
    CURRENT_TRANSPOSE = transposes[new_index];

    let json = serde_json::to_string(&json!({"current_index": new_index})).unwrap();

    app_handle.emit_all("frontend_event", Payload { message: json });
}

unsafe fn key_listen_event(key_listen: &Value) {
    KEY_LISTEN = key_listen.as_bool().unwrap();
}

unsafe fn set_keybind_event(keybind: &Value, app_handle: AppHandle, last_press: Arc<Mutex<Option<Instant>>>) {
    let keycode = keybind.get("keycode").unwrap().as_u64().unwrap();
    let bind_name = keybind.get("name").unwrap().as_str().unwrap();

    match bind_name {
        "pause" => PAUSE_BIND = Some(keycode),
        "transpose_up" => TRANSPOSE_UP_BIND = Some(keycode),
        "transpose_down" => TRANSPOSE_DOWN_BIND = Some(keycode),
        "next_transpose" => NEXT_TRANSPOSE_BIND = Some(keycode),
        "previous_transpose" => PREVIOUS_TRANSPOSE_BIND = Some(keycode),
        "scroll_down" => SCROLL_DOWN_BIND = Some(keycode),
        _ => {}
    }
}