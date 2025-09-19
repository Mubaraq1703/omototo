// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Manager;
use tauri_plugin_http::reqwest;

#[tauri::command]
async fn main_window_ready(app_handle: tauri::AppHandle) -> Result<(), String> {
    // Notify that main window is ready
    println!("Main window is ready");
    Ok(())
}

#[tauri::command]
async fn check_server() -> Result<String, String> {
    let url = "https://omototo.onrender.com/index.html";

    // Check the single endpoint
    match reqwest::get(url).await {
        Ok(response) => {
            if response.status().is_success() {
                Ok("success".to_string())
            } else {
                Ok("server_error".to_string())
            }
        }
        Err(_) => Ok("network_error".to_string()),
    }
}

#[tauri::command]
async fn server_communication_complete(app_handle: tauri::AppHandle) -> Result<(), String> {
    // Get both windows
    let main_window = app_handle.get_webview_window("main").ok_or("Main window not found")?;
    let webview_window = app_handle.get_webview_window("webview").ok_or("Webview window not found")?;
    
    // Close the main window
    main_window.close().map_err(|e| format!("Failed to close main window: {}", e))?;
    
    // Show the webview window
    webview_window.show().map_err(|e| format!("Failed to show webview window: {}", e))?;
    webview_window.set_focus().map_err(|e| format!("Failed to focus webview window: {}", e))?;
    
    // Navigate the webview to the actual application
    webview_window.eval("window.location.href = 'https://omototo.onrender.com/index.html';")
        .map_err(|e| format!("Failed to navigate webview: {}", e))?;
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            main_window_ready,
            server_communication_complete,
            check_server
        ])
        .setup(|app| {
            if let Some(webview_window) = app.get_webview_window("webview") {
                if let Err(e) = webview_window.hide() {
                    eprintln!("Failed to hide webview window: {}", e);
                }
                if let Err(e) = webview_window.eval("window.location.href = 'webview.html';") {
                    eprintln!("Failed to load webview.html: {}", e);
                }
            } else {
                eprintln!("Webview window not found");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}