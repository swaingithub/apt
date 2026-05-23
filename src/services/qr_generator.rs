use anyhow::Result;
use qrcode::QrCode;
use qrcode::render::svg;

pub struct QRGenerator;

impl QRGenerator {
    pub fn generate_qr_code(url: &str) -> Result<String> {
        let qr_code = QrCode::new(url)?;
        let svg = qr_code.render::<svg::Color>()
            .min_dimensions(200, 200)
            .build();
        let data_url = format!("data:image/svg+xml;base64,{}", base64::Engine::encode(&base64::engine::general_purpose::STANDARD, svg.as_bytes()));
        Ok(data_url)
    }

    pub fn generate_expo_qr(project_url: &str) -> Result<String> {
        Self::generate_qr_code(project_url)
    }
}
