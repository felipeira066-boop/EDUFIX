using System.Security.Claims;
using Edufix.Api.Data;
using Microsoft.AspNetCore.RateLimiting;

namespace Edufix.Api.Auth;

public static class ShopEndpoints
{
    private static readonly IReadOnlyList<ShopProduct> Products =
    [
        new("skin-aurora", "Skin Aurora", "Uma nova aparência para acompanhar sua jornada.", "🌌", "Cosmético", 150),
        new("extra-life", "Vida extra", "Guarde uma vida para usar quando precisar.", "💚", "Vantagem", 100),
        new("double-xp", "XP em dobro", "Item de experiência dupla para suas próximas atividades.", "⚡", "Impulso", 200),
        new("coin-bonus", "Bônus de moedas", "Um pequeno impulso para sua próxima compra.", "🪙", "Bônus", 75)
    ];

    public static IEndpointRouteBuilder MapShopEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var privatePages = Path.Combine(endpoints.ServiceProvider
            .GetRequiredService<IWebHostEnvironment>()
            .ContentRootPath, "PrivatePages");

        var shopApi = endpoints.MapGroup("/api/shop").RequireAuthorization();
        shopApi.MapGet("/", GetStateAsync);
        shopApi.MapPost("/purchase", PurchaseAsync)
            .RequireRateLimiting("auth");

        return endpoints;
    }

    private static async Task<IResult> GetStateAsync(
        ClaimsPrincipal principal,
        ShopStore store,
        HttpContext context)
    {
        if (!Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            return Results.Unauthorized();
        }

        var state = await store.GetStateAsync(userId, context.RequestAborted);
        return state is null
            ? Results.Unauthorized()
            : Results.Ok(new
            {
                coins = state.Coins,
                hasStudyPass = state.HasStudyPass,
                inventory = state.Inventory,
                products = Products
            });
    }

    private static async Task<IResult> PurchaseAsync(
        PurchaseProductRequest request,
        ClaimsPrincipal principal,
        ShopStore store,
        HttpContext context)
    {
        if (!Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            return Results.Unauthorized();
        }

        var product = Products.FirstOrDefault(item =>
            string.Equals(item.Id, request.ProductId, StringComparison.Ordinal));
        if (product is null)
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["productId"] = ["Escolha um item disponível na loja."]
            });
        }

        var purchased = await store.PurchaseAsync(
            userId, product.Id, product.Price, context.RequestAborted);
        if (purchased is null)
        {
            return Results.Unauthorized();
        }

        return purchased.Value
            ? Results.Ok(new { message = "Item adicionado ao seu inventário.", productId = product.Id })
            : Results.Conflict(new { message = "Moedas insuficientes para este item." });
    }
}

public sealed record ShopProduct(
    string Id,
    string Name,
    string Description,
    string Icon,
    string Category,
    int Price);

public sealed record PurchaseProductRequest(string? ProductId);
