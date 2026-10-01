use std::net::TcpStream;
use std::path::PathBuf;
use std::process::Child;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::Manager;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

fn find_runtime_paths(app: &tauri::App) -> Option<(PathBuf, PathBuf)> {
    let mut candidates = Vec::new();

    // 1. Exe dizini (Kurulu olduğu yer: örn. %LOCALAPPDATA%\GameVault)
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidates.push(exe_dir.to_path_buf());
            candidates.push(exe_dir.join("resources"));
        }
    }

    // 2. Tauri resource dizini
    if let Ok(res_dir) = app.path().resource_dir() {
        candidates.push(res_dir.clone());
        candidates.push(res_dir.join("resources"));
    }

    // 3. Çalışma dizini
    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd.clone());
        candidates.push(cwd.join("resources"));
        candidates.push(cwd.join("src-tauri").join("resources"));
    }

    for base in candidates {
        let node = base.join("node.exe");
        let server = base.join("standalone").join("server.js");
        if node.exists() && server.exists() {
            return Some((node, base.join("standalone")));
        }
    }

    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let server_child: Arc<Mutex<Option<Child>>> = Arc::new(Mutex::new(None));
    let server_child_exit = Arc::clone(&server_child);

    tauri::Builder::default()
        .setup(move |app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Üretim (Release) modunda Next.js standalone sunucusunu arka planda başlat
            if !cfg!(debug_assertions) {
                if let Some((node_exe, standalone_dir)) = find_runtime_paths(app) {
                    let server_js = standalone_dir.join("server.js");
                    let mut cmd = std::process::Command::new(&node_exe);
                    cmd.arg(&server_js)
                        .current_dir(&standalone_dir)
                        .env("PORT", "3000")
                        .env("HOSTNAME", "127.0.0.1");

                    #[cfg(target_os = "windows")]
                    {
                        const CREATE_NO_WINDOW: u32 = 0x08000000;
                        cmd.creation_flags(CREATE_NO_WINDOW);
                    }

                    match cmd.spawn() {
                        Ok(child) => {
                            if let Ok(mut lock) = server_child.lock() {
                                *lock = Some(child);
                            }
                        }
                        Err(e) => {
                            eprintln!("[GameVault] Sunucu başlatılamadı: {:?}", e);
                        }
                    }
                } else {
                    eprintln!("[GameVault] node.exe veya standalone/server.js bulunamadı!");
                }
            }

            // Port 3000 hazır olduğunda webview'i otomatik olarak yönlendir
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                let addr = "127.0.0.1:3000".parse().unwrap();
                for _ in 0..120 {
                    std::thread::sleep(Duration::from_millis(400));
                    if TcpStream::connect_timeout(&addr, Duration::from_millis(250)).is_ok() {
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let _ = window.eval("window.location.replace('http://127.0.0.1:3000')");
                        }
                        break;
                    }
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(move |_app_handle, event| {
            match event {
                tauri::RunEvent::Exit | tauri::RunEvent::ExitRequested { .. } => {
                    if let Ok(mut lock) = server_child_exit.lock() {
                        if let Some(mut child) = lock.take() {
                            let _ = child.kill();
                        }
                    }
                }
                _ => {}
            }
        });
}
