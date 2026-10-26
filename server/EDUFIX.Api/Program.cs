using System.Threading.RateLimiting;
using Edufix.Api.Auth;
using Edufix.Api.Data;
using Edufix.Api.Errors;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.Configure<RecaptchaOptions>(builder.Configuration.GetSection("Captcha"));
builder.Services.AddSingleton<UserStore>();
builder.Services.AddSingleton<ShopStore>();
builder.Services.AddSingleton<IPasswordHasher<UserAccount>, PasswordHasher<UserAccount>>();
builder.Services.AddHttpClient<RecaptchaVerifier>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(8);
});
builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "__Host-edufix.auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.Cookie.Path = "/";
        options.ExpireTimeSpan = TimeSpan.FromHours(12);
        options.SlidingExpiration = true;
        options.Events.OnRedirectToLogin = context =>
        {
            if (context.Request.Headers.Accept.Any(value =>
                    value?.Contains("text/html", StringComparison.OrdinalIgnoreCase) == true))
            {
                context.Response.Redirect("/login.html");
                return Task.CompletedTask;
            }

            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(5),
                QueueLimit = 0,
                AutoReplenishment = true
            }));
});

var app = builder.Build();

app.UseExceptionHandler();
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    if (context.Request.Path.StartsWithSegments("/api/auth") ||
        context.Request.Path.StartsWithSegments("/api/study") ||
        context.Request.Path.StartsWithSegments("/api/shop") ||
    string.Equals(context.Request.Path.Value, "/inicio", StringComparison.OrdinalIgnoreCase) ||
    string.Equals(context.Request.Path.Value, "/plano.html", StringComparison.OrdinalIgnoreCase) ||
    string.Equals(context.Request.Path.Value, "/loja.html", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(context.Request.Path.Value, "/materias.html", StringComparison.OrdinalIgnoreCase))
    {
        context.Response.Headers.CacheControl = "no-store";
    }

    context.Response.Headers["Content-Security-Policy"] =
        "default-src 'self'; script-src 'self' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/; " +
        "connect-src 'self' https://www.google.com/recaptcha/ https://www.google.com; " +
        "frame-src https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/; " +
        "style-src 'self'; img-src 'self' data:; " +
        "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'";

    await next();
});

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseRouting();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", (UserStore store) =>
    Results.Ok(new { status = "ok", databaseConfigured = store.IsConfigured }));

app.MapAuthEndpoints();
app.MapStudyEndpoints();
app.MapShopEndpoints();

app.Run();

public partial class Program;
