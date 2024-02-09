// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod event_processing;
mod keyboard;

use crate::keyboard::{TRANSPOSE_DOWN_BIND, TRANSPOSE_UP_BIND, keydown, keyup};

use tauri::{Manager};
use tauri_plugin_sql::{Builder, Migration, MigrationKind};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use inputbot::KeybdKey::{F24Key};
use lazy_static::lazy_static;

// first time using rust... forgive me if you see sacrilegious things :-)

static mut PAUSED: bool = true;
static mut CURRENT_TRANSPOSE: i32 = 0;

lazy_static! {
    static ref TRANSPOSES: Mutex<Vec<i32>> = Mutex::new(vec![0]);
    static ref SELECTED_INDEX: Arc<Mutex<usize>> = Arc::new(Mutex::new(0));
}

unsafe fn calculate_next_transpose_difference(next_transpose: i32) -> i32 {
    if next_transpose == CURRENT_TRANSPOSE {
        return 0;
    }

    (CURRENT_TRANSPOSE - next_transpose).abs()
}

unsafe fn transpose(transpose: i32) {
    if transpose == CURRENT_TRANSPOSE {
        return;
    }

    let is_transposing_up = CURRENT_TRANSPOSE < transpose;
    let transpose_amount: i32 = calculate_next_transpose_difference(transpose);
    for _ in 0..transpose_amount {
        if PAUSED {
            // emergency stop
            CURRENT_TRANSPOSE = transpose;
            return;
        }

        if is_transposing_up {
            transpose_up()
        }
        else {
            transpose_down()
        }
    }

    CURRENT_TRANSPOSE = transpose;
}

unsafe fn transpose_up() {
    keydown(TRANSPOSE_UP_BIND.unwrap());
    keyup(TRANSPOSE_UP_BIND.unwrap());
}

unsafe fn transpose_down() {
    keydown(TRANSPOSE_DOWN_BIND.unwrap());
    keyup(TRANSPOSE_DOWN_BIND.unwrap());
}

fn main() {
    let db_migrations = vec![
        // Define your migrations here
        Migration {
            version: 1,
            description: "init_tables",
            sql: include_str!("./migrations/init_tables.sql"),
            kind: MigrationKind::Up,
        }
    ];

    // gui
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                // idk why these migrations won't run, these tables will just have to be added from the frontend for now I guess
                // .add_migrations("sqlite:multi_transpose.db", db_migrations)
                .build(),
        )
        .on_window_event(|event| match event.event() {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                if event.window().label() == "main" {
                    // ensure no windows persist
                    let windows = event.window().windows();
                    for (_, window) in windows {
                        window.close().unwrap();
                    }
                }
            }
            _ => {}
        })
        .setup(|app| {
            // app ready

            // use the app handle for communication with the frontend
            let app_ = Arc::new(Mutex::new(app.handle()));
            let last_press = Arc::new(Mutex::new(None::<Instant>));

            let app_handle = app_.clone();
            app.listen_global("backend_event", move |event| unsafe {
                let last_press = Arc::clone(&last_press);
                let app_handle = app_handle.lock().unwrap().clone();
                event_processing::process_event(event, app_handle, last_press);
            });

            // random bind to make sure inputbot starts listening until app shutdown (F24 is a key?)
            F24Key.bind(|| {});

            thread::spawn(|| {
                inputbot::handle_input_events(true);
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
