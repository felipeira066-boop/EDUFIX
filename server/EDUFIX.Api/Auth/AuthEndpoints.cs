using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Edufix.Api.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Options;

namespace Edufix.Api.Auth;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/auth");

        group.MapPost("/register", (Delegate)RegisterAsync).RequireRateLimiting("auth");
        group.MapPost("/login", (Delegate)LoginAsync).RequireRateLimiting("auth");
        group.MapGet("/captcha-config", (IOptions<RecaptchaOptions> options) =>
        {
            var captcha = options.Value;
            var configured = !string.IsNullOrWhiteSpace(captcha.SiteKey) &&
                             !string.IsNullOrWhiteSpace(captcha.SecretKey);
            return Results.Ok(new
            {
                enabled = configured,
                siteKey = configured ? captcha.SiteKey : null
            });
        });
        group.MapGet("/me", (Delegate)GetSessionAsync).RequireAuthorization();
        group.MapPost("/logout", (Delegate)LogoutAsync)
            .RequireAuthorization()
            .RequireRateLimiting("auth");

        return endpoints;
    }

    private static async Task<IResult> RegisterAsync(
        RegisterRequest request,
        UserStore store,
        IPasswordHasher<UserAccount> passwordHasher,
        RecaptchaVerifier recaptcha,
        ILoggerFactory loggerFactory,
        HttpContext context)
    {
        var captchaResult = await VerifyCaptchaAsync(
            recaptcha, request.CaptchaToken, context, loggerFactory, context.RequestAborted);
        if (captchaResult is not null)
        {
            return captchaResult;
        }

        var displayName = request.DisplayName?.Trim();
        var email = request.Email?.Trim();
        var password = request.Password;
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(displayName) || displayName.Length > 80)
        {
            errors["displayName"] = ["Informe seu nome (até 80 caracteres)."];
        }

        if (string.IsNullOrWhiteSpace(email) ||
            email.Length > 254 ||
            !new EmailAddressAttribute().IsValid(email))
        {
            errors["email"] = ["Informe um e-mail válido."];
        }

        if (string.IsNullOrEmpty(password) || password.Length is < 12 or > 128)
        {
            errors["password"] = ["A senha deve ter entre 12 e 128 caracteres."];
        }

        if (errors.Count > 0)
        {
            return Results.ValidationProblem(errors);
        }

        if (!store.IsConfigured)
        {
            return DatabaseNotConfigured();
        }

        var normalizedEmail = email!.ToUpperInvariant();
        var user = new UserAccount(
            Guid.NewGuid(),
            displayName!,
            email!,
            normalizedEmail,
            string.Empty,
            DateTime.UtcNow,
            null);
        user = user with { PasswordHash = passwordHasher.HashPassword(user, password!) };

        try
        {
            await store.AddAsync(user, context.RequestAborted);
        }
        catch (SqlException exception) when (exception.Number is 2601 or 2627)
        {
            return Results.Conflict(new { message = "Não foi possível criar a conta com estes dados." });
        }

        await SignInAsync(context, user);

        return Results.Created("/api/auth/me", new
        {
            userId = user.UserId,
            displayName = user.DisplayName,
            email = user.Email,
            gradeBand = user.GradeBand,
            coins = user.Coins,
            hasStudyPass = user.HasStudyPass
        });
    }

    private static async Task<IResult> LoginAsync(
        LoginRequest request,
        UserStore store,
        IPasswordHasher<UserAccount> passwordHasher,
        RecaptchaVerifier recaptcha,
        ILoggerFactory loggerFactory,
        HttpContext context)
    {
        var captchaResult = await VerifyCaptchaAsync(
            recaptcha, request.CaptchaToken, context, loggerFactory, context.RequestAborted);
        if (captchaResult is not null)
        {
            return captchaResult;
        }

        var email = request.Email?.Trim();
        var password = request.Password;

        if (string.IsNullOrWhiteSpace(email) ||
            email.Length > 254 ||
            !new EmailAddressAttribute().IsValid(email) ||
            string.IsNullOrEmpty(password) ||
            password.Length > 128)
        {
            return InvalidCredentials();
        }

        if (!store.IsConfigured)
        {
            return DatabaseNotConfigured();
        }

        var user = await store.FindByEmailAsync(
            email.ToUpperInvariant(),
            context.RequestAborted);

        if (user is null ||
            passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password) ==
            PasswordVerificationResult.Failed)
        {
            return InvalidCredentials();
        }

        await SignInAsync(context, user);

        return Results.Ok(new
        {
            userId = user.UserId,
            displayName = user.DisplayName,
            email = user.Email,
            gradeBand = user.GradeBand,
            coins = user.Coins,
            hasStudyPass = user.HasStudyPass
        });
    }

    private static async Task<IResult> GetSessionAsync(
        ClaimsPrincipal principal,
        UserStore store,
        HttpContext context)
    {
        if (!Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            return Results.Unauthorized();
        }

        if (!store.IsConfigured)
        {
            return DatabaseNotConfigured();
        }

        var user = await store.FindByIdAsync(userId, context.RequestAborted);
        return user is null
            ? Results.Unauthorized()
            : Results.Ok(new
            {
                userId = user.UserId,
                displayName = user.DisplayName,
                email = user.Email,
                gradeBand = user.GradeBand,
                coins = user.Coins,
                hasStudyPass = user.HasStudyPass
            });
    }

    private static async Task<IResult> LogoutAsync(HttpContext context)
    {
        await context.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Results.NoContent();
    }

    private static Task SignInAsync(HttpContext context, UserAccount user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new Claim(ClaimTypes.Name, user.DisplayName),
            new Claim(ClaimTypes.Email, user.Email)
        };
        var identity = new ClaimsIdentity(
            claims,
            CookieAuthenticationDefaults.AuthenticationScheme);

        return context.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity));
    }

    private static IResult InvalidCredentials() =>
        Results.Problem(
            statusCode: StatusCodes.Status401Unauthorized,
            title: "E-mail ou senha incorretos.",
            detail: "Confira seus dados e tente novamente.");

    private static IResult DatabaseNotConfigured() =>
        Results.Problem(
            statusCode: StatusCodes.Status503ServiceUnavailable,
            title: "Banco de dados não configurado.",
            detail: "Configure ConnectionStrings__EdufixDb e aplique o esquema SQL antes de usar o cadastro ou login.");

    private static async Task<IResult?> VerifyCaptchaAsync(
        RecaptchaVerifier recaptcha,
        string? token,
        HttpContext context,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        if (!recaptcha.IsConfigured)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "CAPTCHA não configurado.",
                detail: "Configure Captcha__SiteKey e Captcha__SecretKey antes de habilitar o login.");
        }

        if (string.IsNullOrWhiteSpace(token))
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["captchaToken"] = ["Confirme que você não é um robô."]
            });
        }

        try
        {
            return await recaptcha.VerifyAsync(token, context.Request.Host.Host, context.Connection.RemoteIpAddress, cancellationToken)
                ? null
                : Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["captchaToken"] = ["A confirmação do CAPTCHA expirou ou é inválida. Tente novamente."]
                });
        }
        catch (HttpRequestException exception)
        {
            loggerFactory.CreateLogger("RecaptchaVerifier")
                .LogError(exception, "Não foi possível validar o CAPTCHA com o Google reCAPTCHA.");
            return Results.Problem(
                statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "Verificação temporariamente indisponível.",
                detail: "Não foi possível validar o CAPTCHA. Tente novamente em instantes.");
        }
    }
}
