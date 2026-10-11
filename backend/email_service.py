"""Email service for LogiChat — Trợ lý Pháp lý Hải quan & XNK AI.

Handles password reset OTP delivery via SMTP (Gmail, SendGrid, Mailgun...)
with automatic fallback to interactive console/demo mode for development & thesis defense.
"""
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime

def send_reset_password_email(to_email: str, otp_code: str) -> dict:
    """
    Sends an OTP code for password recovery.
    If SMTP credentials are provided, attempts real email dispatch.
    Otherwise (or on SMTP error), prints formatted OTP to console for seamless demo/testing.
    """
    smtp_host = os.getenv("SMTP_HOST", "").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
    smtp_from = os.getenv("SMTP_FROM", "no-reply@logichat.vn").strip()
    app_env = os.getenv("APP_ENV", "development").strip().lower()

    is_smtp_configured = bool(smtp_host and smtp_user and smtp_password)
    sent_via_smtp = False
    smtp_error = None

    if is_smtp_configured:
        try:
            subject = f"[{otp_code}] Mã xác nhận đặt lại mật khẩu - LogiChat AI"
            
            # HTML Template
            html_body = f"""
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <style>
    body {{
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background-color: #f8fafc;
      margin: 0;
      padding: 20px;
    }}
    .container {{
      max-width: 540px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }}
    .header {{
      background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
      padding: 30px 24px;
      text-align: center;
      color: #ffffff;
    }}
    .header h1 {{
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }}
    .header p {{
      margin: 6px 0 0 0;
      font-size: 13px;
      color: #bfdbfe;
    }}
    .content {{
      padding: 32px 24px;
    }}
    .otp-card {{
      background: #f1f5f9;
      border: 2px dashed #93c5fd;
      border-radius: 12px;
      text-align: center;
      padding: 20px;
      margin: 24px 0;
    }}
    .otp-code {{
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #1e40af;
      margin: 8px 0;
      font-family: monospace;
    }}
    .note {{
      font-size: 13px;
      color: #64748b;
      margin-top: 20px;
      border-top: 1px solid #f1f5f9;
      padding-top: 16px;
    }}
    .footer {{
      background: #f8fafc;
      padding: 16px 24px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>LogiChat AI</h1>
      <p>Hệ thống Trợ lý Pháp lý & Thủ tục Hải quan Thông minh</p>
    </div>
    <div class="content">
      <p>Xin chào,</p>
      <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>{to_email}</strong> trên hệ thống LogiChat.</p>
      <p>Dưới đây là mã xác thực một lần (OTP) của bạn:</p>
      
      <div class="otp-card">
        <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 1px;">Mã xác thực OTP</div>
        <div class="otp-code">{otp_code}</div>
        <div style="font-size: 12px; color: #ef4444; font-weight: 500;">Hiệu lực trong vòng 15 phút</div>
      </div>

      <p class="note">
        ⚠️ <strong>Lưu ý bảo mật:</strong> Tuyệt đối không chia sẻ mã này với bất kỳ ai. Nếu bạn không gửi yêu cầu đặt lại mật khẩu, xin vui lòng bỏ qua email này.
      </p>
    </div>
    <div class="footer">
      © {datetime.now().year} LogiChat RAG System. All rights reserved.
    </div>
  </div>
</body>
</html>
"""

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = smtp_from
            msg["To"] = to_email

            text_body = f"Mã xác thực đặt lại mật khẩu LogiChat AI của bạn là: {otp_code} (Hiệu lực: 15 phút)."
            msg.attach(MIMEText(text_body, "plain", "utf-8"))
            msg.attach(MIMEText(html_body, "html", "utf-8"))

            if smtp_port == 465:
                with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10) as server:
                    server.login(smtp_user, smtp_password)
                    server.send_message(msg)
            else:
                with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_password)
                    server.send_message(msg)

            sent_via_smtp = True
            print(f"[AUTH EMAIL] Đã gửi email OTP thành công tới: {to_email}")
        except Exception as e:
            smtp_error = str(e)
            print(f"[AUTH EMAIL WARNING] Lỗi gửi email qua SMTP ({smtp_error}). Chuyển sang console fallback.")

    # In ra terminal để phục vụ kiểm thử / chấm điểm đồ án khi chưa có cấu hình SMTP thực tế
    print("\n" + "=" * 70)
    print("🔒 [LOGICHAT SECURITY - PASSWORD RESET OTP]")
    print(f"   📧 Người nhận: {to_email}")
    print(f"   🔑 MÃ OTP:      {otp_code}")
    print("   ⏳ Thời hạn:    15 phút")
    if is_smtp_configured and sent_via_smtp:
        print("   ✅ Trạng thái:  Đã chuyển tiếp qua SMTP server thành công")
    elif is_smtp_configured and smtp_error:
        print(f"   ⚠️ Trạng thái:  SMTP gặp sự cố ({smtp_error}), đã lưu mã vào console")
    else:
        print("   💡 Trạng thái:  Chế độ Dev/Demo (Chưa cấu hình SMTP_HOST trong .env)")
    print("=" * 70 + "\n")

    # Quyết định có trả về demo_otp trong response hay không:
    # Nếu đang ở dev mode hoặc chưa cấu hình SMTP thật thì trả về để tiện test đồ án
    allow_demo_otp = (app_env == "development") or (not sent_via_smtp)

    return {
        "success": True,
        "sent_via_smtp": sent_via_smtp,
        "is_demo": not sent_via_smtp,
        "demo_otp": otp_code if allow_demo_otp else None,
        "message": "Mã xác thực đã được gửi đến email của bạn." if sent_via_smtp else "Mã xác thực đã được tạo (xem hướng dẫn hoặc OTP hiển thị trên màn hình)."
    }
