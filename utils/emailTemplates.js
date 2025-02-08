const resetPasswordEmail = (name, resetLink) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification - Gradyze</title>
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
            .message {
                margin-bottom: 30px;
            }
            .button-container {
                text-align: center;
                margin: 25px 0;
            }
            .button {
                display: inline-block;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                transition: all 0.3s ease;
            }
            .primary-button {
                background-color: #2563eb;
                color: white !important;
            }
            .primary-button:hover {
                background-color: #1d4ed8;
            }
            .secondary-button {
                background-color: #64748b;
                color: white !important;
            }
            .secondary-button:hover {
                background-color: #475569;
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
            .expiry-notice {
                margin: 20px 0;
                color: #666666;
                font-style: italic;
            }
            .support-text {
                margin: 15px 0;
                color: #666666;
            }
            @media only screen and (max-width: 480px) {
                .email-container {
                    margin: 10px;
                }
                .button-container {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .button {
                    margin: 5px 0;
                }
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <img src="https://yourdomain.com/logo.png" alt="Gradyze Logo" class="logo">
            </div>
            <div class="content">
                <div class="greeting">
                    Dear ${name},
                </div>
                <div class="message">
                    Please verify your email address to reset your password for Gradyze. Click the button below:
                </div>
                <div class="button-container">
                    <a href="${resetLink}" class="button primary-button">Yes, Reset My Password</a>
                </div>
                <div class="expiry-notice">
                    This link expires in 30 minutes.
                </div>
                <div class="support-text">
                    If you didn't request this, please disregard this email or contact support at <a href="mailto:support@gradyze.com">support@gradyze.com</a>.
                </div>
            </div>
            <div class="footer">
                <p>Best regards,<br>Gradyze Team</p>
                <p>Automated message - Do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

// Export function to use in other files
module.exports = { resetPasswordEmail };
