using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Edufix.Api.Auth;

public sealed class RecaptchaOptions
{
    public string SiteKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
}

public sealed class RecaptchaVerifier(HttpClient httpClient, IConfiguration configuration)
{
    private readonly RecaptchaOptions _options = configuration
        .GetSection("Captcha")
        .Get<RecaptchaOptions>() ?? new RecaptchaOptions();

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_options.SiteKey) &&
        !string.IsNullOrWhiteSpace(_options.SecretKey);

    public async Task<bool> VerifyAsync(
        string token,
        string expectedHost,
        IPAddress? remoteIp,
        CancellationToken cancellationToken)
    {
        if (!IsConfigured || token.Length > 4096)
        {
            return false;
        }

        var formValues = new Dictionary<string, string>
        {
            ["secret"] = _options.SecretKey,
            ["response"] = token
        };
        if (remoteIp is not null)
        {
            formValues["remoteip"] = remoteIp.ToString();
        }
        using var content = new FormUrlEncodedContent(formValues);
        using var response = await httpClient.PostAsync(
            "https://www.google.com/recaptcha/api/siteverify",
            content,
            cancellationToken);
        response.EnsureSuccessStatusCode();

        CaptchaVerification? result;
        try
        {
            result = await response.Content.ReadFromJsonAsync<CaptchaVerification>(
                cancellationToken: cancellationToken);
        }
        catch (JsonException exception)
        {
            throw new HttpRequestException("O serviço de CAPTCHA retornou uma resposta inválida.", exception);
        }

        return result?.Success == true &&
               string.Equals(result.Hostname, expectedHost, StringComparison.OrdinalIgnoreCase);
    }

    private sealed record CaptchaVerification(
        [property: JsonPropertyName("success")] bool Success,
        [property: JsonPropertyName("hostname")] string? Hostname);
}
