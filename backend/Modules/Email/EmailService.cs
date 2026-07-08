using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Microsoft.Extensions.Options;

namespace Backend.Modules.Email;

public class SmtpSettings
{
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromEmail { get; set; } = string.Empty;
    public string FromName { get; set; } = string.Empty;
}

public class EmailService : IEmailService
{
    private readonly SmtpSettings _smtpSettings;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IOptions<SmtpSettings> smtpSettings, ILogger<EmailService> logger)
    {
        _smtpSettings = smtpSettings.Value;
        _logger = logger;
    }

    public async Task SendWelcomeEmailAsync(string toEmail, string toName, string employeeNumber, string tempPassword)
    {
        var subject = "Welcome to STARS | Your Login Credentials";
        var body = $@"
            <html>
            <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                    <h2 style='color: #1B254B;'>Welcome to STARS!</h2>
                    <p>Dear {toName},</p>
                    <p>Your account has been created in the Speedex Task Allocation & Review System (STARS).</p>
                    
                    <div style='background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;'>
                        <h3 style='margin-top: 0; color: #1B254B;'>Your Login Credentials:</h3>
                        <p><strong>Employee ID:</strong> {employeeNumber}</p>
                        <p><strong>Temporary Password:</strong> {tempPassword}</p>
                    </div>
                    
                    <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
                    
                    <p>You can login at: <a href='http://localhost:5173' style='color: #00A99D;'>http://localhost:5173</a></p>
                    
                    <p>If you have any questions, please contact your manager or IT support.</p>
                    
                    <p>Best regards,<br/>STARS System Administrator</p>
                    
                    <hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;'/>
                    <p style='font-size: 12px; color: #999;'>This is an automated message. Please do not reply to this email.</p>
                </div>
            </body>
            </html>
        ";

        await SendEmailAsync(toEmail, subject, body);
    }

    private async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
    {
        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_smtpSettings.FromName, _smtpSettings.FromEmail));
            message.To.Add(new MailboxAddress("", toEmail)); // "" display name of MailboxAddress - empty | sent in two parts the Display Name (recipient sees in their inbox) and Email Address
            message.Subject = subject;

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = htmlBody
            };
            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();

            // For development purposes, accept all of the certificates
            client.ServerCertificateValidationCallback = (s, c, h, e) => true;

            // Steps to send the email.
                // 1. Connect to the mail server using Start TLS - Plain text to encrypted.
                // 2. Authenticate with the username and password like logging in
                // 3. Send the email message
                // 4. Disconnect gracefully
            await client.ConnectAsync(_smtpSettings.Host, _smtpSettings.Port, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(_smtpSettings.Username, _smtpSettings.Password);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation("Email sent successfully to {Email}", toEmail);

        } catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}", toEmail);
            // Do not throw because email failure shouldn't break the main operation.
        }
    }
}
