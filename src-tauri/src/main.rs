// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(target_os = "windows")]
mod windows {
    pub use windows::Win32::UI::WindowsAndMessaging::{SetWindowLongPtrW, GetWindowLongPtrW, GWL_EXSTYLE, WS_EX_NOACTIVATE};
    pub use windows::Win32::Foundation::HWND;
}

#[cfg(target_os = "windows")]
use windows::*;

#[cfg(target_os = "macos")]
mod macos {
    pub use cocoa::appkit::NSWindow;
    pub use cocoa::base::id as id;
    pub use objc::sel;
    pub use objc::sel_impl;
    pub use objc::runtime::NO;
    pub use objc::msg_send;
}

#[cfg(target_os = "macos")]
use macos::*;

#[cfg(target_os = "linux")]
mod linux {
    pub use gtk::gdk::WindowExt;
    pub use tauri::WindowExtGtk;
}

#[cfg(target_os = "linux")]
use linux::*;

mod event_processing;
mod keyboard;
mod audio;

use crate::keyboard::{TRANSPOSE_DOWN_BIND, TRANSPOSE_UP_BIND, send_key};

use tauri::Manager;
use tauri_plugin_sql::{Builder, Migration, MigrationKind};
use tauri_plugin_log::{LogTarget};
use log::{error, info};
use std::sync::{Arc, Mutex};
use std::{panic, thread};
use std::time::{Instant};
use lazy_static::lazy_static;
use rdev::listen;

// first time using rust... forgive me if you see sacrilegious things :-)

static mut PAUSED: bool = true;
static mut CURRENT_TRANSPOSE: i32 = 0;
static mut SCROLL_VALUE: i64 = 0;

// transposition logic

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

    info!("Beginning transposing...");
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
    info!("Finished transposing!");

    CURRENT_TRANSPOSE = transpose;
}

unsafe fn transpose_up() {
    send_key(TRANSPOSE_UP_BIND.unwrap());
}

unsafe fn transpose_down() {
    send_key(TRANSPOSE_DOWN_BIND.unwrap());
}

#[tauri::command]
fn set_window_focusable(window: tauri::Window, focusable: bool) {
    #[cfg(target_os = "windows")]
    {
        if let Ok(hwnd) = window.hwnd() {
            unsafe {
                let hwnd = windows::HWND(hwnd.0 as isize);
                let mut style = windows::GetWindowLongPtrW(hwnd, windows::GWL_EXSTYLE);

                if focusable {
                    style &= !(windows::WS_EX_NOACTIVATE.0 as isize);
                }
                else {
                    style |= windows::WS_EX_NOACTIVATE.0 as isize;
                }

                windows::SetWindowLongPtrW(hwnd, windows::GWL_EXSTYLE, style);
            }
        }
        else {
            error!("Failed to get window handle");
        }
    }


    #[cfg(target_os = "macos")]
    {
        // not 100% necessary, app windows on macos can stay on top of others if not in fullscreen mode
        // TODO: consider revisiting this functionality on macos
    }

    #[cfg(target_os = "linux")]
    {
        if let Some(gtk_window) = window.gtk_window() {
            if (focusable) {
                linux::gtk_window.set_accept_focus(true);
            }
            else {
                linux::gtk_window.set_accept_focus(false);
            }
        }
    }
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

    // Set a custom panic hook to log panics
    panic::set_hook(Box::new(|panic_info| {
        // Extract panic message and location
        let message = if let Some(s) = panic_info.payload().downcast_ref::<&str>() {
            s.to_string()
        }
        else if let Some(s) = panic_info.payload().downcast_ref::<String>() {
            s.clone()
        }
        else {
            "Unknown panic".to_string()
        };

        let location = if let Some(location) = panic_info.location() {
            format!("{}:{}", location.file(), location.line())
        }
        else {
            "Unknown location".to_string()
        };

        // Log the panic message
        error!("Thread panicked at {}: {}", location, message);
    }));

    // gui
    tauri::Builder::default()
        .device_event_filter(tauri::DeviceEventFilter::Always)
        .invoke_handler(tauri::generate_handler![set_window_focusable])
        .plugin(
            tauri_plugin_sql::Builder::default()
                // idk why these migrations won't run, these tables will just have to be added from the frontend for now I guess
                // .add_migrations("sqlite:multi_transpose.db", db_migrations)
                .build(),
        )
        .plugin(tauri_plugin_log::Builder::default().targets([
            LogTarget::LogDir,
            LogTarget::Stdout,
        ]).build())
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

            // use the tauri app handle for communication with the frontend
            let app_ = Arc::new(Mutex::new(app.handle()));
            let last_press = Arc::new(Mutex::new(None::<Instant>));

            let app_handle = app_.clone();
            app.listen_global("backend_event", {
                let app_handle = Arc::clone(&app_handle);
                let last_press = Arc::clone(&last_press);
                move |event| unsafe {
                    let last_press = Arc::clone(&last_press);
                    let app_handle = app_handle.lock().unwrap().clone();
                    event_processing::process_event(event, app_handle, last_press);
                }
            });

            thread::spawn({
                let app_handle = app_.clone();
                let last_press = Arc::clone(&last_press);
                move || {
                    let app_handle = app_handle.lock().unwrap().clone();
                    if let Err(error) = listen(move |event| keyboard::callback(event, &app_handle, &last_press)) {
                        error!("Error: {:?}", error);
                    }
                }
            });


            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
