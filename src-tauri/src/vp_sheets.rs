use serde::Deserialize;
use serde_json::Value;

#[derive(Deserialize)]
pub struct VpSheetsOptions {
    pub endpoint: String,
    pub method: Option<String>,
    pub headers: Option<Vec<(String, String)>>,
    pub body: Option<String>,
}

#[tauri::command]
pub async fn proxy_vp_sheets(opts: VpSheetsOptions) -> Result<Value, String> {
    let base_url = "https://vp-sheets.arijan.dev";
    let url = format!("{}{}", base_url, opts.endpoint);

    let client = reqwest::Client::new();
    let method = opts.method.unwrap_or_else(|| "GET".to_string());

    let mut request = client
        .request(method.parse().unwrap_or(reqwest::Method::GET), &url);

    if let Some(headers) = opts.headers {
        for (key, value) in headers {
            request = request.header(&key, &value);
        }
    }

    if let Some(body) = opts.body {
        request = request.body(body);
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Request error: {e}"))?;

    let json = response
        .json::<Value>()
        .await
        .map_err(|e| format!("JSON parse error: {e}"))?;

    Ok(json)
}