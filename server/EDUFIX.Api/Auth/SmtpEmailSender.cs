using System.Net;
using System.Net.Mail;

namespace Edufix.Api.Auth;

public sealed class SmtpEmailSender(IConfiguration configuration)
{
    private readonly string? _host = configuration["Email:SmtpHost"];
    private readonly int _port = int.TryParse(configuration["Email:SmtpPort"], out var port)
        ? port
        : 0;
    private readonly string? _username = configuration["Email:SmtpUsername"];
    private readonly string? _password = configuration["Email:SmtpPassword"];
    private readonly MailAddress? _fromAddress =
        MailAddress.TryCreate(configuration["Email:FromAddress"], out var fromAddress)
            ? fromAddress
            : null;
    private readonly string _fromName = configuration["Email:FromName"] ?? "EDUFIX";

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_host) &&
        _port is > 0 and <= 65535 &&
        !string.IsNullOrWhiteSpace(_username) &&
        !string.IsNullOrWhiteSpace(_password) &&
        _fromAddress is not null;

    public async Task SendPasswordResetCodeAsync(
        string recipient,
        string code,
        CancellationToken cancellationToken)
    {
        if (!IsConfigured)
        {
            throw new InvalidOperationException("Configure as credenciais SMTP para enviar e-mails.");
        }

        using var client = new SmtpClient(_host, _port)
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(_username, _password),
            Timeout = 10_000
        };
        using var message = new MailMessage(
            new MailAddress(_fromAddress!.Address, _fromName),
            new MailAddress(recipient))
        {
            Subject = "Código para redefinir sua senha — EDUFIX",
            Body =
                $"Seu código de recuperação é: {code}\n\n" +
                "Ele expira em 10 minutos e só pode ser usado uma vez. " +
                "Se você não solicitou a recuperação, ignore este e-mail.",
            IsBodyHtml = false
        };

        await client.SendMailAsync(message, cancellationToken);
    }
}
