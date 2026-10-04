use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let migrations = vec![
    Migration {
      version: 1,
      description: "initial_schema",
      sql: include_str!("../migrations/001_initial.sql"),
      kind: MigrationKind::Up,
    },
    Migration {
      version: 2,
      description: "daily_recurring_tasks",
      sql: include_str!("../migrations/002_daily_recurring_tasks.sql"),
      kind: MigrationKind::Up,
    },
    Migration {
      version: 3,
      description: "task_links",
      sql: include_str!("../migrations/003_task_links.sql"),
      kind: MigrationKind::Up,
    },
  ];

  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_sql::Builder::default()
      .add_migrations("sqlite:nawi-devzone.db", migrations)
      .build())
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
    .expect("error while building tauri application");
}
