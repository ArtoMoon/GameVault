use std::fs;
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::{
    atomic::{AtomicBool, AtomicU16, Ordering},
    Arc, Mutex,
};
use std::time::Duration;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, Url, WindowEvent,
};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

/// Tercih edilen sabit port. Yaygın geliştirme portlarından (3000, 5173, 8080...)
/// uzak tutulur ki başka uygulamalarla çakışmasın. Port sabit kaldığı sürece
/// WebView origin'i de sabit kalır (localStorage ayarları korunur).
const PREFERRED_PORT: u16 = 47_310;
/// Tercih edilen port doluysa denenecek ek port sayısı.
const PORT_SCAN_RANGE: u16 = 40;

#[derive(serde::Serialize, serde::Deserialize)]
struct DesktopPrefs {
    #[serde(default = "default_true")]
    close_to_tray: bool,
}

fn default_true() -> bool {
    true
}

impl Default for DesktopPrefs {
    fn default() -> Self {
        Self {
            close_to_tray: true,
        }
    }
}

struct DesktopState {
    close_to_tray: AtomicBool,
    prefs_path: PathBuf,
    server_port: AtomicU16,
}

#[tauri::command]
fn get_server_url(state: tauri::State<'_, DesktopState>) -> Option<String> {
    let port = state.server_port.load(Ordering::Relaxed);
    if port == 0 {
        return None;
    }
    if is_gamevault_server(port) {
        Some(format!("http://127.0.0.1:{port}"))
    } else {
        None
    }
}

/// İndirilen yeni kurulum dosyasını (.exe) `%TEMP%` dizinine indirip
/// doğrudan başlatır ve mevcut uygulamayı kapatır.
#[tauri::command]
fn download_and_install_update(app: AppHandle, download_url: String) -> Result<String, String> {
    if !download_url.starts_with("https://") && !download_url.starts_with("http://") {
        return Err("Geçersiz indirme adresi.".into());
    }

    let installer_path = std::env::temp_dir().join("GameVault-Update-Setup.exe");

    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let ps_script = format!(
            "$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri '{}' -OutFile '{}' -UseBasicParsing; Start-Process -FilePath '{}'",
            download_url.replace('\'', "''"),
            installer_path.display().to_string().replace('\'', "''"),
            installer_path.display().to_string().replace('\'', "''")
        );
        Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-WindowStyle",
                "Hidden",
                "-Command",
                &ps_script,
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("Güncelleyici başlatılamadı: {e}"))?;
    }

    // Kısa gecikmeyle mevcut uygulamayı kapat ki kurulum dosyası üzerine yazabilsin
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_millis(2500));
        app.exit(0);
    });

    Ok(installer_path.display().to_string())
}

fn load_prefs(path: &PathBuf) -> DesktopPrefs {
    fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_prefs(path: &PathBuf, prefs: &DesktopPrefs) {
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(prefs) {
        let _ = fs::write(path, json);
    }
}

#[tauri::command]
fn get_close_to_tray(state: tauri::State<'_, DesktopState>) -> bool {
    state.close_to_tray.load(Ordering::Relaxed)
}

#[tauri::command]
fn set_close_to_tray(enabled: bool, state: tauri::State<'_, DesktopState>) -> bool {
    state.close_to_tray.store(enabled, Ordering::Relaxed);
    save_prefs(
        &state.prefs_path,
        &DesktopPrefs {
            close_to_tray: enabled,
        },
    );
    enabled
}

#[tauri::command]
fn hide_to_tray(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return Err("Invalid URL scheme".into());
    }
    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        Command::new("rundll32")
            .args(["url.dll,FileProtocolHandler", &url])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let show_item = MenuItem::with_id(app, "show", "GameVault'u Aç", true, None::<&str>)?;
    let hide_item = MenuItem::with_id(app, "hide", "Tepsiye Küçült", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, "quit", "Tamamen Çıkış Yap", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_item, &hide_item, &sep, &quit_item])?;

    let mut builder = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("GameVault – Universal Gaming Dashboard")
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_main_window(app),
            "hide" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder.build(app)?;
    Ok(())
}

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

/// Boş bir port bulur: önce tercih edilen aralığı dener, hepsi doluysa
/// işletim sisteminden rastgele boş bir port ister.
fn find_free_port() -> u16 {
    for port in PREFERRED_PORT..PREFERRED_PORT + PORT_SCAN_RANGE {
        if TcpListener::bind(("127.0.0.1", port)).is_ok() {
            return port;
        }
    }
    TcpListener::bind(("127.0.0.1", 0))
        .and_then(|l| l.local_addr())
        .map(|a| a.port())
        .unwrap_or(PREFERRED_PORT)
}

/// Verilen porttaki sunucunun gerçekten GameVault olup olmadığını
/// `/api/health` imzasıyla doğrular. Aynı portta başka bir uygulama
/// cevap veriyorsa `false` döner.
fn is_gamevault_server(port: u16) -> bool {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let Ok(mut stream) = TcpStream::connect_timeout(&addr, Duration::from_millis(300)) else {
        return false;
    };
    let _ = stream.set_read_timeout(Some(Duration::from_millis(1500)));
    let _ = stream.set_write_timeout(Some(Duration::from_millis(500)));

    let request = format!(
        "GET /api/health HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nConnection: close\r\n\r\n"
    );
    if stream.write_all(request.as_bytes()).is_err() {
        return false;
    }

    let mut buf = Vec::new();
    let _ = stream.take(8192).read_to_end(&mut buf);
    let body = String::from_utf8_lossy(&buf);
    (body.starts_with("HTTP/1.1 200") || body.starts_with("HTTP/1.0 200"))
        && body.contains("\"gamevault\"")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let server_child: Arc<Mutex<Option<Child>>> = Arc::new(Mutex::new(None));
    let server_child_exit = Arc::clone(&server_child);

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_close_to_tray,
            set_close_to_tray,
            hide_to_tray,
            open_external_url,
            get_server_url,
            download_and_install_update
        ])
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let close_to_tray = window
                    .try_state::<DesktopState>()
                    .map(|s| s.close_to_tray.load(Ordering::Relaxed))
                    .unwrap_or(false);
                if close_to_tray {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .setup(move |app| {
            let prefs_path = app
                .path()
                .app_config_dir()
                .unwrap_or_else(|_| std::env::temp_dir())
                .join("desktop-prefs.json");
            let prefs = load_prefs(&prefs_path);

            let port = if cfg!(debug_assertions) {
                3000
            } else {
                find_free_port()
            };

            app.manage(DesktopState {
                close_to_tray: AtomicBool::new(prefs.close_to_tray),
                prefs_path,
                server_port: AtomicU16::new(port),
            });

            if let Err(e) = setup_tray(app) {
                eprintln!("[GameVault] Sistem tepsisi oluşturulamadı: {:?}", e);
            }

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
                // Geliştirme modunda pencere zaten devUrl'i (next dev) yükler.
                return Ok(());
            }

            // Üretim (Release) modunda Next.js standalone sunucusunu
            // kendine ait boş bir portta arka planda başlat.

            if let Some((node_exe, standalone_dir)) = find_runtime_paths(app) {
                let server_js = standalone_dir.join("server.js");
                let mut cmd = std::process::Command::new(&node_exe);
                cmd.arg(&server_js)
                    .current_dir(&standalone_dir)
                    .env("PORT", port.to_string())
                    .env("HOSTNAME", "127.0.0.1")
                    .env("NODE_ENV", "production");

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

            // Sunucu hazır ve imzası doğrulandığında webview'i yönlendir.
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                let url = format!("http://127.0.0.1:{port}");
                for _ in 0..150 {
                    std::thread::sleep(Duration::from_millis(300));
                    if is_gamevault_server(port) {
                        if let Some(window) = app_handle.get_webview_window("main") {
                            if let Ok(parsed) = Url::parse(&url) {
                                let _ = window.navigate(parsed);
                            }
                            let _ = window.eval(&format!("window.location.replace('{url}')"));
                        }
                        return;
                    }
                }
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.eval(
                        "window.__gamevaultFailed && window.__gamevaultFailed()",
                    );
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
