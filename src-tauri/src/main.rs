// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
use db::{Database, QueryResult};
use rusqlite::params_from_iter;
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use tauri::{Manager, State};

struct AppState {
    db: Database,
}

#[tauri::command]
fn execute_sql(
    state: State<AppState>,
    sql: String,
    params: Vec<Value>,
) -> Result<QueryResult, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;

    let string_params: Vec<String> = params
        .iter()
        .map(|v| match v {
            Value::String(s) => s.clone(),
            Value::Null => "".to_string(),
            _ => v.to_string(),
        })
        .collect();

    let rows_affected = conn
        .execute(&sql, params_from_iter(string_params.iter()))
        .map_err(|e| format!("SQL Execution Error: {}", e))?;

    let last_insert_id = if rows_affected > 0 {
        Some(conn.last_insert_rowid())
    } else {
        None
    };

    Ok(QueryResult {
        rows_affected,
        last_insert_id,
    })
}

#[tauri::command]
fn select_sql(
    state: State<AppState>,
    sql: String,
    params: Vec<Value>,
) -> Result<Vec<serde_json::Map<String, Value>>, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;

    let string_params: Vec<String> = params
        .iter()
        .map(|v| match v {
            Value::String(s) => s.clone(),
            Value::Null => "".to_string(),
            _ => v.to_string(),
        })
        .collect();

    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("SQL Prepare Error: {}", e))?;

    let column_names: Vec<String> = stmt
        .column_names()
        .into_iter()
        .map(|s| s.to_string())
        .collect();

    let mut rows = stmt
        .query(params_from_iter(string_params.iter()))
        .map_err(|e| format!("Query Error: {}", e))?;

    let mut results = Vec::new();

    while let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let mut map = serde_json::Map::new();
        for (i, col_name) in column_names.iter().enumerate() {
            let val: Value = match row.get_ref(i).map_err(|e| e.to_string())? {
                rusqlite::types::ValueRef::Null => Value::Null,
                rusqlite::types::ValueRef::Integer(v) => Value::from(v),
                rusqlite::types::ValueRef::Real(v) => Value::from(v),
                rusqlite::types::ValueRef::Text(v) => {
                    Value::from(String::from_utf8_lossy(v).to_string())
                }
                rusqlite::types::ValueRef::Blob(v) => {
                    Value::from(format!("<BLOB {} bytes>", v.len()))
                }
            };
            map.insert(col_name.clone(), val);
        }
        results.push(map);
    }

    Ok(results)
}

#[tauri::command]
fn get_database_path(state: State<AppState>) -> String {
    state.db.db_path.to_string_lossy().to_string()
}

#[tauri::command]
fn export_database_backup(state: State<AppState>, dest_path: String) -> Result<String, String> {
    fs::copy(&state.db.db_path, &dest_path)
        .map_err(|e| format!("Backup copy failed: {}", e))?;
    Ok(format!("Database backed up successfully to {}", dest_path))
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| PathBuf::from("./data"));

            let database = Database::init(app_data_dir)
                .expect("Failed to initialize SQLite database");

            app.manage(AppState { db: database });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            execute_sql,
            select_sql,
            get_database_path,
            export_database_backup
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
