const emailContent = (name, email, password) => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gradyze Account Credentials</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
            line-height: 1.6;
            background-color: #f4f4f4;
        }
        .email-container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            padding: 20px;
            border-bottom: 1px solid #eee;
            background-color: #ffffff;
            border-radius: 8px 8px 0 0;
        }
        .logo {
            max-width: 150px;
            height: auto;
        }
        .content {
            padding: 30px;
            color: #333333;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
        }
        .credentials-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .credential-item {
            margin: 10px 0;
        }
        .credential-label {
            font-weight: bold;
            color: #1e40af;
        }
        .important-notice {
            background-color: #fff7ed;
            border-left: 4px solid #2563eb;
            padding: 15px;
            margin: 20px 0;
        }
        .important-title {
            color: #1e40af;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .bullet-points {
            margin: 0;
            padding-left: 20px;
        }
        .bullet-points li {
            margin: 8px 0;
        }
        .warning-text {
            color: #dc2626;
            font-weight: bold;
            margin: 20px 0;
        }
        .support-text {
            margin: 20px 0;
            color: #666666;
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #666666;
            font-size: 12px;
            background-color: #f9f9f9;
            border-top: 1px solid #eee;
            border-radius: 0 0 8px 8px;
        }
        .divider {
            border-top: 1px solid #eee;
            margin: 20px 0;
        }
        @media only screen and (max-width: 480px) {
            .email-container {
                margin: 10px;
            }
            .content {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <img src="https://gradyzefrontend.onrender.com/Logo.jpg" alt="Gradyze Logo" class="logo">
        </div>
        <div class="content">
            <div class="greeting">
                Dear ${name},
            </div>
            <p>Welcome to Gradyze! Your account has been successfully created. Here are your login credentials:</p>
            <div class="credentials-box">
                <div class="credential-item">
                    <span class="credential-label">User ID:</span> 
                    <span>${email}</span>
                </div>
                <div class="credential-item">
                    <span class="credential-label">Temporary Password:</span> 
                    <span>${password}</span>
                </div>
            </div>
            <div class="important-notice">
                <div class="important-title">Important:</div>
                <ul class="bullet-points">
                    <li>Please change your password upon first login.</li>
                    <li>Access the system at: <a href="https://gradyze.com">Gradyze.com</a></li>
                    <li>Keep these credentials confidential.</li>
                </ul>
            </div>
            <div class="warning-text">
                For security reasons, please log in within 24 hours to change your temporary password.
            </div>
            <div class="support-text">
                Need help? Contact IT Support at <a href="mailto:support@gradyze.com">support@gradyze.com</a>
            </div>
        </div>
        <div class="footer">
            <p>Best regards,<br>Gradyze Team</p>
            <div class="divider"></div>
            <p>This is a system-generated email. Please do not reply.</p>
        </div>
    </div>
</body>
</html>`;
};

module.exports = emailContent;
