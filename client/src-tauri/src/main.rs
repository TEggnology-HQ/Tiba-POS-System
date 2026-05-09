#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppSettings {
    pub server_url: Option<String>,
    pub language: Option<String>,
}

fn get_settings_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map(|mut path| {
            path.push("settings.json");
            path
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_settings(app: tauri::AppHandle) -> Result<AppSettings, String> {
    let path = get_settings_path(&app)?;
    if !path.exists() {
        return Ok(AppSettings::default());
    }

    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let settings: AppSettings = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(settings)
}

#[tauri::command]
fn save_server_url(app: tauri::AppHandle, url: String) -> Result<(), String> {
    let path = get_settings_path(&app)?;
    let mut settings = if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        AppSettings::default()
    };

    settings.server_url = Some(url);

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn save_language(app: tauri::AppHandle, lang: String) -> Result<(), String> {
    let path = get_settings_path(&app)?;
    let mut settings = if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        AppSettings::default()
    };

    settings.language = Some(lang);

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn get_system_locale() -> String {
    std::env::var("LANG")
        .unwrap_or_else(|_| "en_US".to_string())
        .split('.')
        .next()
        .unwrap_or("en")
        .to_string()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            get_settings,
            save_server_url,
            save_language,
            get_system_locale
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
