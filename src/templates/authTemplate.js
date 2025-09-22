// welcomeMailTemplate.js
export function welcomeMailTemplate({username, password}) {
  return `
  <!DOCTYPE html>
  <html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Chào mừng bạn đến với dịch vụ của chúng tôi</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        padding: 20px;
        line-height: 1.6;
      }
      
      .email-wrapper {
        max-width: 680px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        overflow: hidden;
      }
      
      .header {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        color: white;
        padding: 40px 32px;
        text-align: center;
        position: relative;
      }
      
      .header::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-image: radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 1px, transparent 1px);
        background-size: 20px 20px;
        opacity: 0.5;
      }
      
      .header-icon {
        font-size: 32px;
        margin: 0 auto 16px;
        display: block;
        position: relative;
        z-index: 1;
        text-align: center;
      }
      
      .header h1 {
        font-size: 28px;
        font-weight: 700;
        margin-bottom: 8px;
        position: relative;
        z-index: 1;
      }
      
      .header p {
        font-size: 16px;
        opacity: 0.9;
        position: relative;
        z-index: 1;
      }
      
      .icon {
        display: inline-block;
        vertical-align: middle;
        margin-right: 8px;
      }
      
      .content {
        padding: 40px 32px;
      }
      
      .welcome-message {
        margin-bottom: 32px;
      }
      
      .welcome-message h2 {
        color: #1f2937;
        font-size: 24px;
        font-weight: 600;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
      }
      
      .welcome-message p {
        color: #4b5563;
        font-size: 16px;
        margin-bottom: 16px;
      }
      
      .credentials-section {
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        padding: 24px;
        margin: 24px 0;
        position: relative;
        overflow: hidden;
      }
      
      .credentials-section::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 4px;
        height: 100%;
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      }
      
      .credentials-title {
        color: #1e293b;
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
      }
      
      .credential-item {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        transition: all 0.2s ease;
      }
      
      .credential-item:last-child {
        margin-bottom: 0;
      }
      
      .credential-item:hover {
        border-color: #2563eb;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      
      .credential-label {
        font-weight: 600;
        color: #374151;
        min-width: 100px;
        font-size: 14px;
      }
      
      .credential-value {
        font-family: 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', Consolas, 'Courier New', monospace;
        background: #f3f4f6;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 14px;
        color: #1f2937;
        flex: 1;
        margin-left: 16px;
        border: 1px solid #e5e7eb;
      }
      
      .next-steps {
        background: #fef7cd;
        border: 1px solid #fde047;
        border-radius: 12px;
        padding: 24px;
        margin: 32px 0;
      }
      
      .next-steps h3 {
        color: #92400e;
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
      }
      
      .next-steps ul {
        list-style: none;
        padding: 0;
      }
      
      .next-steps li {
        color: #92400e;
        margin-bottom: 12px;
        padding-left: 24px;
        position: relative;
      }
      
      .next-steps li::before {
        content: '✓';
        position: absolute;
        left: 0;
        color: #059669;
        font-weight: bold;
        font-size: 16px;
      }
      
      .security-note {
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 12px;
        padding: 20px;
        margin: 24px 0;
      }
      
      .security-note p {
        color: #991b1b;
        font-size: 14px;
        margin: 0;
        display: flex;
        align-items: flex-start;
      }
      
      .cta-button {
        display: inline-block;
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        color: white !important;
        text-decoration: none;
        padding: 16px 32px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 16px;
        margin: 24px 0;
        transition: all 0.2s ease;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      
      .cta-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 8px 15px -3px rgba(0, 0, 0, 0.1);
      }
      
      .footer {
        background: #f8fafc;
        padding: 32px;
        text-align: center;
        border-top: 1px solid #e2e8f0;
      }
      
      .footer p {
        color: #6b7280;
        font-size: 14px;
        margin-bottom: 8px;
      }
      
      .footer .company-info {
        color: #4b5563;
        font-weight: 500;
        margin-top: 16px;
      }
      
      @media (max-width: 640px) {
        body {
          padding: 10px;
        }
        
        .content {
          padding: 24px 20px;
        }
        
        .header {
          padding: 24px 20px;
        }
        
        .header h1 {
          font-size: 24px;
        }
        
        .welcome-message h2 {
          font-size: 20px;
        }
        
        .credential-item {
          flex-direction: column;
          align-items: flex-start;
        }
        
        .credential-value {
          margin-left: 0;
          margin-top: 8px;
          width: 100%;
        }
      }
    </style>
  </head>
  <body>
    <div class="email-wrapper">
      <div class="header">
        <div class="header-icon">
          👥
        </div>
        <h1>Chào mừng đến với hệ thống!</h1>
        <p>Tài khoản của bạn đã được tạo thành công</p>
      </div>
      
      <div class="content">
        <div class="welcome-message">
          <h2>
            <span class="icon">✉️</span>
            Xin chào, <strong>${username}</strong>!
          </h2>
          <p>Chúng tôi rất vui mừng chào đón bạn tham gia cộng đồng của chúng tôi. Tài khoản của bạn đã được thiết lập và sẵn sàng để sử dụng.</p>
        </div>
        
        <div class="credentials-section">
          <div class="credentials-title">
            <span class="icon">🔑</span>
            Thông tin đăng nhập của bạn
          </div>
          
          <div class="credential-item">
            <span class="credential-label">Tên đăng nhập:</span>
            <code class="credential-value">${username}</code>
          </div>
          
          <div class="credential-item">
            <span class="credential-label">Mật khẩu:</span>
            <code class="credential-value">${password}</code>
          </div>
        </div>
        
        <div class="security-note">
          <p>
            <span class="icon">🛡️</span>
            <span><strong>Quan trọng:</strong> Vì lý do bảo mật, chúng tôi khuyên bạn nên thay đổi mật khẩu ngay sau lần đăng nhập đầu tiên.</span>
          </p>
        </div>
        
        <div class="next-steps">
          <h3>
            <span class="icon">✅</span>
            Các bước tiếp theo
          </h3>
          <ul>
            <li>Đăng nhập vào hệ thống bằng thông tin trên</li>
            <li>Cập nhật mật khẩu mới cho tài khoản</li>
            <li>Hoàn thiện thông tin hồ sơ cá nhân</li>
            <li>Khám phá các tính năng có sẵn trong hệ thống</li>
          </ul>
        </div>
        
        <div style="text-align: center;">
          <a href="#" class="cta-button">
            🚀 Đăng nhập ngay
          </a>
        </div>
      </div>
      
      <div class="footer">
        <p>Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại liên hệ với chúng tôi.</p>
        <p>📧 Email: support@company.com | 📞 Hotline: 1900-xxxx</p>
        <div class="company-info">
          <p>© ${new Date().getFullYear()} Our Company. Tất cả quyền được bảo lưu.</p>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
}
