using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Security.Claims;
using Edufix.Api.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.SqlClient;

namespace Edufix.Api.Auth;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/auth");

        group.MapPost("/register", (Delegate)RegisterAsync).RequireRateLimiting("auth");
        group.MapPost("/login", (Delegate)LoginAsync).RequireRateLimiting("auth");
        group.MapPost("/password-reset/request", (Delegate)RequestPasswordResetAsync)
            .RequireRateLimiting("auth");
        group.MapPost("/password-reset/complete", (Delegate)CompletePasswordResetAsync)
            .RequireRateLimiting("auth");
        group.MapGet("/me", (Delegate)GetSessionAsync).RequireAuthorization();
        group.MapPost("/logout", (Delegate)LogoutAsync)
            .RequireAuthorization()
            .RequireRateLimiting("auth");

        return endpoints;
    }

    private static async Task<IResult> RequestPasswordResetAsync(
        PasswordResetRequest request,
        UserStore store,
        SmtpEmailSender emailSender,
        HttpContext context,
        ILogger<SmtpEmailSender> logger)
    {
        var email = request.Email?.Trim();
        if (string.IsNullOrWhiteSpace(email) ||
            email.Length > 254 ||
            !new EmailAddressAttribute().IsValid(email))
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["email"] = ["Informe um e-mail válido."]
            });
        }

        if (!store.IsConfigured)
        {
            return DatabaseNotConfigured();
        }

        if (!emailSender.IsConfigured)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "Envio de e-mail não configurado.",
                detail: "Configure o servidor SMTP para recuperar a senha.");
        }

        var code = RandomNumberGenerator.GetInt32(0, 10_000)
            .ToString("D4", CultureInfo.InvariantCulture);
        var salt = RandomNumberGenerator.GetBytes(16);
        var codeHash = Rfc2898DeriveBytes.Pbkdf2(
            code,
            salt,
            210_000,
            HashAlgorithmName.SHA256,
            32);
        var userId = await store.CreatePasswordResetCodeAsync(
            email.ToUpperInvariant(),
            codeHash,
            salt,
            DateTime.UtcNow.AddMinutes(10),
            context.RequestAborted);

        if (userId is not null)
        {
            try
            {
                await emailSender.SendPasswordResetCodeAsync(
                    email,
                    code,
                    context.RequestAborted);
            }
            catch (SmtpException exception)
            {
                logger.LogError(exception, "Não foi possível enviar o código de recuperação.");
                await store.RemovePasswordResetCodeAsync(
                    userId.Value,
                    codeHash,
                    context.RequestAborted);
            }
        }

        return Results.Ok(new
        {
            message = "Se existir uma conta para este e-mail, enviaremos um código. Confira também a caixa de spam."
        });
    }

    private static async Task<IResult> CompletePasswordResetAsync(
        CompletePasswordResetRequest request,
        UserStore store,
        IPasswordHasher<UserAccount> passwordHasher,
        HttpContext context)
    {
        var email = request.Email?.Trim();
        var code = request.Code?.Trim();
        var password = request.Password;
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(email) ||
            email.Length > 254 ||
            !new EmailAddressAttribute().IsValid(email))
        {
            errors["email"] = ["Informe um e-mail válido."];
        }

        if (code is null || code.Length != 4 || code.Any(character => !char.IsAsciiDigit(character)))
        {
            errors["code"] = ["Informe o código de 4 dígitos recebido por e-mail."];
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
        var user = await store.FindByEmailAsync(normalizedEmail, context.RequestAborted);
        var passwordHashUser = user ?? new UserAccount(
            Guid.Empty,
            string.Empty,
            email!,
            normalizedEmail,
            string.Empty,
            DateTime.UtcNow,
            null);
        var passwordHash = passwordHasher.HashPassword(passwordHashUser, password!);
        var reset = await store.TryResetPasswordAsync(
            normalizedEmail,
            code!,
            passwordHash,
            context.RequestAborted);

        return reset
            ? Results.Ok(new { message = "Senha alterada com sucesso." })
            : InvalidPasswordResetCode();
    }

    private static async Task<IResult> RegisterAsync(
        RegisterRequest request,
        UserStore store,
        IPasswordHasher<UserAccount> passwordHasher,
        HttpContext context)
    {
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
        HttpContext context)
    {
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

    private static IResult InvalidPasswordResetCode() =>
        Results.Problem(
            statusCode: StatusCodes.Status400BadRequest,
            title: "Código inválido ou expirado.",
            detail: "Solicite um novo código e tente novamente.");
}
