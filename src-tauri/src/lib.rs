#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
  if path.is_empty() {
    return Err("Path is empty".into());
  }

  #[cfg(target_os = "windows")]
  {
    use std::process::Command;
    let clean_path = path.replace('/', "\\");
    let p = std::path::Path::new(&clean_path);
    if p.exists() {
      if p.is_file() {
        Command::new("explorer")
          .args(["/select,", &clean_path])
          .spawn()
          .map_err(|e| e.to_string())?;
      } else {
        Command::new("explorer")
          .arg(&clean_path)
          .spawn()
          .map_err(|e| e.to_string())?;
      }
    } else {
      if let Some(parent) = p.parent() {
        if parent.exists() {
          Command::new("explorer")
            .arg(parent.as_os_str())
            .spawn()
            .map_err(|e| e.to_string())?;
          return Ok(());
        }
      }
      Command::new("explorer")
        .arg(&clean_path)
        .spawn()
        .map_err(|e| e.to_string())?;
    }
    return Ok(());
  }

  #[cfg(target_os = "macos")]
  {
    use std::process::Command;
    let p = std::path::Path::new(&path);
    if p.exists() && p.is_file() {
      Command::new("open")
        .args(["-R", &path])
        .spawn()
        .map_err(|e| e.to_string())?;
    } else {
      Command::new("open")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    }
    return Ok(());
  }

  #[cfg(target_os = "linux")]
  {
    use std::process::Command;
    let p = std::path::Path::new(&path);
    let target = if p.is_file() {
      p.parent().unwrap_or(p)
    } else {
      p
    };
    Command::new("xdg-open")
      .arg(target)
      .spawn()
      .map_err(|e| e.to_string())?;
    return Ok(());
  }

  #[cfg(target_os = "android")]
  {
    return Ok(());
  }

  #[allow(unreachable_code)]
  Ok(())
}

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
  if url.is_empty() {
    return Err("URL is empty".into());
  }

  #[cfg(target_os = "windows")]
  {
    use std::process::Command;
    Command::new("cmd")
      .args(["/c", "start", "", &url])
      .spawn()
      .map_err(|e| e.to_string())?;
    return Ok(());
  }

  #[cfg(target_os = "macos")]
  {
    use std::process::Command;
    Command::new("open")
      .arg(&url)
      .spawn()
      .map_err(|e| e.to_string())?;
    return Ok(());
  }

  #[cfg(target_os = "linux")]
  {
    use std::process::Command;
    Command::new("xdg-open")
      .arg(&url)
      .spawn()
      .map_err(|e| e.to_string())?;
    return Ok(());
  }

  #[cfg(target_os = "android")]
  {
    return Ok(());
  }

  #[allow(unreachable_code)]
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![open_folder, open_url])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
