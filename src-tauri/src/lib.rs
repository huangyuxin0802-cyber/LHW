mod macos_window;

use tauri::{AppHandle, Manager};

const ORB_SIZE: f64 = 128.0;
const PANEL_RADIUS: f64 = 28.0;

#[tauri::command]
fn set_desktop_window_shape(app: AppHandle, mode: String) -> Result<(), String> {
  let window = app
    .get_webview_window("main")
    .ok_or_else(|| "main window not found".to_string())?;

  match mode.as_str() {
    "orb" => {
      macos_window::shape_window(&window, ORB_SIZE / 2.0, true);
    }
    "panel" => {
      macos_window::shape_window(&window, PANEL_RADIUS, false);
    }
    _ => return Err(format!("unknown window shape mode: {mode}")),
  }

  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![set_desktop_window_shape])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      #[cfg(desktop)]
      {
        app.handle()
          .plugin(tauri_plugin_updater::Builder::new().build())?;
        app.handle().plugin(tauri_plugin_process::init())?;
      }

      if let Some(window) = app.get_webview_window("main") {
        macos_window::shape_window(&window, ORB_SIZE / 2.0, true);
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
