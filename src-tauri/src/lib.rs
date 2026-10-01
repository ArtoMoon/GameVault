use std::process::Child;
use std::sync::{Arc, Mutex};
use tauri::Manager;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

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

            // Üretim (Release / Production) modunda Next.js standalone sunucusunu arka planda başlat
            if !cfg!(debug_assertions) {
                if let Ok(resource_dir) = app.path().resource_dir() {
                    let node_exe = resource_dir.join("node.exe");
                    let standalone_dir = resource_dir.join("standalone");
                    let server_js = standalone_dir.join("server.js");

                    if node_exe.exists() && server_js.exists() {
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
                                eprintln!("[MyLoL] Standalone sunucu başlatılamadı: {:?}", e);
                            }
                        }
                    } else {
                        eprintln!(
                            "[MyLoL] Kaynak dosyalar bulunamadı: {:?} / {:?}",
                            node_exe, server_js
                        );
                    }
                }
            }

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
