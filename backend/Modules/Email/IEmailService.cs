namespace Backend.Modules.Email;

public interface IEmailService
{
    Task SendWelcomeEmailAsync(string toEmail, string toName, string employeeNumber, string tempPassword);
    Task SendPasswordResetEmailAsync(string toEmail, string toName, string resetToken, string resetUrl);
    Task SendEmailVerificationAsync(string toEmail, string toName, string verificationToken, string verificationUrl);
}
