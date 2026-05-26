use std::env;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

/// Unified AI chat completion request
#[derive(Clone)]
pub struct AiRequest {
    pub model: String,
    pub messages: Vec<Value>,
    pub temperature: f32,
    pub max_tokens: u32,
    pub tools: Option<Value>,
    pub response_format: Option<Value>,
    pub custom_api_keys: Option<std::collections::HashMap<String, String>>,
}

/// Unified AI chat completion response
pub struct AiResponse {
    pub content: String,
    pub tool_calls: Vec<Value>,
    pub provider_used: String,
}

/// Provider config status
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProviderStatus {
    pub id: String,
    pub name: String,
    pub configured: bool,
    pub key_prefix: String,
    pub key_hint: String,
    pub models: Vec<ModelInfo>,
    pub cost: &'static str,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelInfo {
    pub id: String,
    pub name: &'static str,
    pub free: bool,
}

/// All supported providers
pub fn all_providers() -> Vec<ProviderStatus> {
    vec![
        ProviderStatus {
            id: "openai".into(),
            name: "OpenAI".into(),
            configured: is_key_ok("OPENAI_API_KEY"),
            key_prefix: "OPENAI_API_KEY".into(),
            key_hint: "sk-...".into(),
            cost: "Paid",
            models: vec![
                ModelInfo { id: "gpt-4o-mini".into(), name: "GPT-4o Mini", free: false },
                ModelInfo { id: "gpt-4o".into(), name: "GPT-4o", free: false },
            ],
        },
        ProviderStatus {
            id: "groq".into(),
            name: "Groq".into(),
            configured: is_key_ok("GROQ_API_KEY"),
            key_prefix: "GROQ_API_KEY".into(),
            key_hint: "gsk_...".into(),
            cost: "Free (rate-limited)",
            models: vec![
                ModelInfo { id: "groq/llama-3.1-8b-instant".into(), name: "Llama 3.1 8B", free: true },
                ModelInfo { id: "groq/llama-3.2-3b-preview".into(), name: "Llama 3.2 3B", free: true },
                ModelInfo { id: "groq/mixtral-8x7b-32768".into(), name: "Mixtral 8x7B", free: true },
                ModelInfo { id: "groq/llama-3.3-70b-versatile".into(), name: "Llama 3.3 70B", free: true },
            ],
        },
        ProviderStatus {
            id: "gemini".into(),
            name: "Google Gemini".into(),
            configured: is_key_ok("GEMINI_API_KEY"),
            key_prefix: "GEMINI_API_KEY".into(),
            key_hint: "AIza...".into(),
            cost: "Free tier",
            models: vec![
                ModelInfo { id: "gemini/gemini-3.5-flash".into(), name: "Gemini 3.5 Flash", free: true },
                ModelInfo { id: "gemini/gemini-2.5-pro".into(), name: "Gemini 2.5 Pro", free: true },
            ],
        },
        ProviderStatus {
            id: "openrouter".into(),
            name: "OpenRouter".into(),
            configured: is_key_ok("OPENROUTER_API_KEY"),
            key_prefix: "OPENROUTER_API_KEY".into(),
            key_hint: "sk-or-...".into(),
            cost: "Varies (some free)",
            models: vec![
                ModelInfo { id: "openrouter/meta-llama/llama-3.2-3b-instruct".into(), name: "Llama 3.2 3B", free: true },
                ModelInfo { id: "openrouter/mistralai/mixtral-8x22b-instruct".into(), name: "Mixtral 8x22B", free: false },
                ModelInfo { id: "openrouter/anthropic/claude-3.5-sonnet".into(), name: "Claude 3.5 Sonnet", free: false },
            ],
        },
        ProviderStatus {
            id: "ollama".into(),
            name: "Ollama (Local)".into(),
            configured: check_ollama_configured(),
            key_prefix: "OLLAMA_HOST".into(),
            key_hint: "http://localhost:11434".into(),
            cost: "Free (local)",
            models: vec![
                ModelInfo { id: "ollama/llama3.2".into(), name: "Llama 3.2", free: true },
                ModelInfo { id: "ollama/mistral".into(), name: "Mistral", free: true },
                ModelInfo { id: "ollama/phi3".into(), name: "Phi-3", free: true },
            ],
        },
    ]
}

fn is_key_ok(key: &str) -> bool {
    let v = env::var(key).unwrap_or_default();
    !v.is_empty() && v != "sk-placeholder"
}

fn get_api_key(req: &AiRequest, env_key: &str) -> Option<String> {
    if let Some(keys) = &req.custom_api_keys {
        if let Some(val) = keys.get(env_key) {
            if !val.trim().is_empty() {
                return Some(val.trim().to_string());
            }
        }
    }
    let v = env::var(env_key).unwrap_or_default();
    if !v.is_empty() && v != "sk-placeholder" {
        Some(v)
    } else {
        None
    }
}

fn check_ollama_configured() -> bool {
    // Ollama is always "configured" — it just needs to be running
    true
}

/// Parse provider and actual model name from a model string
pub fn parse_model(model: &str) -> (&str, &str) {
    if let Some(idx) = model.find('/') {
        let provider = &model[..idx];
        let model_name = &model[idx + 1..];
        (provider, model_name)
    } else {
        if model.starts_with("gemini") {
            ("gemini", model)
        } else {
            ("openai", model)
        }
    }
}

/// Provider-friendly error
#[derive(Debug)]
pub struct AiError {
    pub message: String,
    #[allow(dead_code)]
    pub recoverable: bool,
    pub suggestion: Option<String>,
}

impl From<String> for AiError {
    fn from(s: String) -> Self {
        AiError { message: s, recoverable: false, suggestion: None }
    }
}

fn rate_limited_suggestion(provider: &str, model: &str) -> AiError {
    let suggestion = match provider {
        "groq" => Some(format!("Groq free tier is rate-limited. Switch to OpenRouter (configure OPENROUTER_API_KEY) or use ollama/{} locally.", model.split('/').last().unwrap_or("llama3.2"))),
        _ => Some("Try a different provider or wait a moment.".to_string()),
    };
    AiError {
        message: format!("{} rate limit hit for model `{}`.", provider, model),
        recoverable: true,
        suggestion,
    }
}

/// Make a chat completion — tries requested provider first, then falls back
pub async fn chat_completion(req: AiRequest) -> Result<AiResponse, AiError> {
    let model = req.model.clone();
    let (provider, model_name) = parse_model(&model);

    // Try the requested provider first
    let result = match provider {
        "groq" => groq_chat(req.clone(), model_name).await,
        "gemini" => gemini_chat(req.clone(), model_name).await,
        "openrouter" => openrouter_chat(req.clone(), model_name).await,
        "ollama" => ollama_chat(req.clone(), model_name).await.map_err(|e| AiError { message: e, recoverable: false, suggestion: None }),
        _ => openai_chat(req.clone(), model_name).await,
    };

    match result {
        Ok(r) => Ok(r),
        Err(_) => {
            // Always fallback to OpenRouter when configured (like OpenCode's proxy)
            if is_key_ok("OPENROUTER_API_KEY") {
                return openrouter_fallback(model_name, &req).await;
            }
            result
        }
    }
}

/// Fallback via OpenRouter
async fn openrouter_fallback(original_model: &str, req: &AiRequest) -> Result<AiResponse, AiError> {
    let api_key = get_api_key(req, "OPENROUTER_API_KEY");
    if api_key.is_none() {
        return Err(AiError {
            message: "This model requires an API key. Set the provider's key or set OPENROUTER_API_KEY as a universal fallback.".into(),
            recoverable: false,
            suggestion: Some("Get a single OpenRouter key at https://openrouter.ai/keys to unlock 200+ models with one key.".into()),
        });
    }

    let fallback_model = format!("openrouter/{}", original_model);
    let fallback_req = AiRequest {
        model: fallback_model,
        messages: req.messages.clone(),
        temperature: req.temperature,
        max_tokens: req.max_tokens,
        tools: req.tools.clone(),
        response_format: req.response_format.clone(),
        custom_api_keys: req.custom_api_keys.clone(),
    };

    match call_completions_api(
        "https://openrouter.ai/api/v1/chat/completions",
        &api_key.unwrap(),
        &format!("openrouter/{}", original_model),
        fallback_req,
    ).await {
        Ok(mut r) => {
            r.provider_used = format!("openrouter (fallback from {})", original_model);
            Ok(r)
        }
        Err(e) => Err(AiError {
            message: format!("Primary failed and fallback also failed: {}", e.message),
            recoverable: false,
            suggestion: None,
        })
    }
}

// ── OpenAI ──

async fn openai_chat(req: AiRequest, model: &str) -> Result<AiResponse, AiError> {
    let api_key = get_api_key(&req, "OPENAI_API_KEY").ok_or_else(|| AiError {
        message: "OPENAI_API_KEY not set".into(),
        recoverable: false,
        suggestion: Some("Set OPENAI_API_KEY in your environment or use a free provider like Groq or Ollama.".into()),
    })?;
    call_completions_api("https://api.openai.com/v1/chat/completions", &api_key, model, req).await
}

// ── Groq (free, fast inference) ──

async fn groq_chat(req: AiRequest, model: &str) -> Result<AiResponse, AiError> {
    let api_key = get_api_key(&req, "GROQ_API_KEY").ok_or_else(|| AiError {
        message: "GROQ_API_KEY not set".into(),
        recoverable: false,
        suggestion: Some("Get a free key at https://console.groq.com".into()),
    })?;
    call_completions_api("https://api.groq.com/openai/v1/chat/completions", &api_key, model, req).await
}

// ── OpenRouter (gateway, one key for all) ──

async fn openrouter_chat(req: AiRequest, model: &str) -> Result<AiResponse, AiError> {
    let api_key = get_api_key(&req, "OPENROUTER_API_KEY").ok_or_else(|| AiError {
        message: "OPENROUTER_API_KEY not set".into(),
        recoverable: false,
        suggestion: Some("Get a key at https://openrouter.ai/keys".into()),
    })?;
    call_completions_api("https://openrouter.ai/api/v1/chat/completions", &api_key, model, req).await
}

// ── Google Gemini (free tier) ──

async fn gemini_chat(req: AiRequest, model: &str) -> Result<AiResponse, AiError> {
    let api_key = get_api_key(&req, "GEMINI_API_KEY").ok_or_else(|| AiError {
        message: "GEMINI_API_KEY not set".into(),
        recoverable: false,
        suggestion: Some("Get a free key at https://aistudio.google.com".into()),
    })?;

    call_completions_api("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", &api_key, model, req).await
}

// ── Ollama (local, free) ──

async fn ollama_chat(req: AiRequest, model: &str) -> Result<AiResponse, String> {
    let host = get_api_key(&req, "OLLAMA_HOST").unwrap_or_else(|| "http://localhost:11434".to_string());

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(120))
        .build().map_err(|e| format!("Client error: {}", e))?;

    let url = format!("{}/v1/chat/completions", host);
    let mut body = json!({
        "model": model,
        "messages": req.messages,
        "temperature": req.temperature,
        "max_tokens": req.max_tokens,
        "stream": false,
    });
    if let Some(tools) = &req.tools {
        body["tools"] = tools.clone();
    }

    let resp = client.post(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Ollama request failed (is Ollama running at {}?): {}", host, e))?;

    let data: Value = resp.json().await
        .map_err(|e| format!("Failed to parse Ollama response: {}", e))?;

    let choice = &data["choices"][0]["message"];
    let content = choice["content"].as_str().unwrap_or("").to_string();
    let tool_calls = choice["tool_calls"].as_array().cloned().unwrap_or_default();

    Ok(AiResponse { content, tool_calls, provider_used: "ollama".into() })
}

// ── Generic OpenAI-compatible API caller ──

async fn call_completions_api(
    url: &str,
    api_key: &str,
    model: &str,
    req: AiRequest,
) -> Result<AiResponse, AiError> {
    let mut body = json!({
        "model": model,
        "messages": req.messages,
        "temperature": req.temperature,
        "max_tokens": req.max_tokens,
    });

    if let Some(tools) = &req.tools {
        body["tools"] = tools.clone();
        body["tool_choice"] = json!("auto");
    }
    if let Some(rf) = &req.response_format {
        body["response_format"] = rf.clone();
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .build().map_err(|e| AiError {
            message: format!("Client error: {}", e),
            recoverable: false,
            suggestion: None,
        })?;

    let resp = client.post(url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| AiError {
            message: format!("Request failed: {}", e),
            recoverable: true,
            suggestion: Some("Check your network connection.".into()),
        })?;

    let status = resp.status();
    let data: Value = resp.json().await.map_err(|e| AiError {
        message: format!("Failed to parse response: {}", e),
        recoverable: false,
        suggestion: None,
    })?;

    if !status.is_success() {
        if let Some(err) = data["error"].as_object() {
            let msg = err.get("message").and_then(|v| v.as_str()).unwrap_or("unknown error");
            // Detect rate limiting
            if msg.to_lowercase().contains("rate limit") || msg.to_lowercase().contains("rate_limit") || status.as_u16() == 429 {
                let provider = parse_model(model).0;
                return Err(rate_limited_suggestion(provider, model));
            }
            return Err(AiError {
                message: format!("{}", msg),
                recoverable: status.as_u16() == 429 || status.as_u16() == 500,
                suggestion: None,
            });
        }
        return Err(AiError {
            message: format!("HTTP {}", status),
            recoverable: status.as_u16() == 429 || status.as_u16() >= 500,
            suggestion: None,
        });
    }

    let choice = &data["choices"][0]["message"];
    let content = choice["content"].as_str().unwrap_or("").to_string();
    let tool_calls = choice["tool_calls"].as_array().cloned().unwrap_or_default();
    let provider = parse_model(model).0.to_string();

    Ok(AiResponse { content, tool_calls, provider_used: provider })
}
