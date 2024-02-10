use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Event, Manager};
use serde_json::{json, Value};
use serde_json::Value::Object;
use crate::keyboard::{PAUSE_BIND, TRANSPOSE_DOWN_BIND, previous_transpose_bind_fn, TRANSPOSE_UP_BIND, next_transpose_bind_fn, PREVIOUS_TRANSPOSE_BIND, NEXT_TRANSPOSE_BIND};
use crate::{PAUSED, SELECTED_INDEX, TRANSPOSES, CURRENT_TRANSPOSE};

#[derive(Clone, serde::Serialize)]
pub struct Payload {
    pub message: String,
}

pub unsafe fn process_event(event: Event, app_handle: AppHandle, last_press: Arc<Mutex<Option<Instant>>>) {
    let json: Value = serde_json::from_str(event.payload().unwrap()).expect("failed to parse json");

    // println!("EVENT FROM FRONTEND: {:?}", json);
    if let Some(new_transposes) = json.get("transposes") {
        change_transposes_event(new_transposes);

        let json = serde_json::to_string(&json!({"current_index": 0})).unwrap();
        app_handle.emit_all("frontend_event", Payload { message: json }).unwrap();
    }
    else if let Some(new_index) = json.get("selected_index") {
        select_index_event(new_index, app_handle);
    }
    else if let Some(keybind) = json.get("bind") {
        set_keybind_event(keybind, app_handle, last_press);
    }
    else if let Some(pause) = json.get("pause") {
        pause_event(pause, app_handle);
    }
}

unsafe fn pause_event(pause: &Value, app_handle: AppHandle) {
    PAUSED = pause.as_bool().unwrap();

    let json = serde_json::to_string(&json!({"paused": PAUSED})).unwrap();
    app_handle.emit_all("frontend_event", Payload { message: json });
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

unsafe fn set_keybind_event(keybind: &Value, app_handle: AppHandle, last_press: Arc<Mutex<Option<Instant>>>) {
    let app_handle = Mutex::new(app_handle);
    let keycode = keybind.get("keycode").unwrap().as_u64().unwrap();
    let bind_name = keybind.get("name").unwrap().as_str().unwrap();

    match bind_name {
        "pause" => PAUSE_BIND = Some(keycode),
        "transpose_up" => TRANSPOSE_UP_BIND = Some(keycode),
        "transpose_down" => TRANSPOSE_DOWN_BIND = Some(keycode),
        "next_transpose" => NEXT_TRANSPOSE_BIND = Some(keycode),
        "previous_transpose" => PREVIOUS_TRANSPOSE_BIND = Some(keycode),
        _ => {}
    }
}
