namespace Edufix.Api.Auth;

public sealed record UserAccount(
    Guid UserId,
    string DisplayName,
    string Email,
    string NormalizedEmail,
    string PasswordHash,
    DateTime CreatedAtUtc,
    string? GradeBand,
    int Coins = 500,
    bool HasStudyPass = false);

public sealed record RegisterRequest(
    string? DisplayName,
    string? Email,
    string? Password);

public sealed record LoginRequest(
    string? Email,
    string? Password);

public sealed record PlanSelectionRequest(string? GradeBand);
