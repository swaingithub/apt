use anyhow::Result;
use qrcode::QrCode;
use base64::{Engine as _, engine::general_purpose};

pub struct QRGenerator;

impl QRGenerator {
    pub fn generate_qr_code(url: &str) -> Result<String> {
        let qr_code = QrCode::new(url)?;
        let string = qr_code.render::<char>()
            .light_color(' ')
            .dark_color('#')
            .build();
        
        // For now, return a simple text-based QR code representation
        // In production, you would use a proper image library
        let base64_string = general_purpose::STANDARD.encode(string.as_bytes());
        let data_url = format!("data:text/plain;base64,{}", base64_string);
        
        Ok(data_url)
    }
    
    pub fn generate_expo_qr(project_url: &str) -> Result<String> {
        Self::generate_qr_code(project_url)
    }
}
