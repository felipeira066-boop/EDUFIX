using System.Data;
using Microsoft.Data.SqlClient;

namespace Edufix.Api.Data;

public sealed class ShopStore(IConfiguration configuration)
{
    private readonly string? _connectionString =
        configuration.GetConnectionString("EdufixDb");

    public async Task<ShopAccountState?> GetStateAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(GetConnectionString());
        await connection.OpenAsync(cancellationToken);

        int coins;
        bool hasStudyPass;
        await using (var command = new SqlCommand(
            """
            SELECT [Coins], [HasStudyPass]
            FROM [dbo].[Users]
            WHERE [UserId] = @UserId;
            """,
            connection))
        {
            command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier)
            {
                Value = userId
            });
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                return null;
            }

            coins = reader.GetInt32(0);
            hasStudyPass = reader.GetBoolean(1);
        }

        var inventory = new List<InventoryItem>();
        await using (var command = new SqlCommand(
            """
            SELECT [ProductId], [Quantity]
            FROM [dbo].[UserInventory]
            WHERE [UserId] = @UserId;
            """,
            connection))
        {
            command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier)
            {
                Value = userId
            });
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                inventory.Add(new InventoryItem(reader.GetString(0), reader.GetInt32(1)));
            }
        }

        return new ShopAccountState(coins, hasStudyPass, inventory);
    }

    public async Task<bool?> PurchaseAsync(
        Guid userId,
        string productId,
        int price,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(GetConnectionString());
        await connection.OpenAsync(cancellationToken);
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);

        await using var debit = new SqlCommand(
            """
            UPDATE [dbo].[Users]
            SET [Coins] = [Coins] - @Price
            WHERE [UserId] = @UserId AND [Coins] >= @Price;
            """,
            connection,
            transaction);
        debit.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
        debit.Parameters.Add(new SqlParameter("@Price", SqlDbType.Int) { Value = price });

        if (await debit.ExecuteNonQueryAsync(cancellationToken) != 1)
        {
            await transaction.RollbackAsync(cancellationToken);
            return await UserExistsAsync(connection, userId, cancellationToken) ? false : null;
        }

        await using var addInventory = new SqlCommand(
            """
            UPDATE [dbo].[UserInventory]
            SET [Quantity] = [Quantity] + 1
            WHERE [UserId] = @UserId AND [ProductId] = @ProductId;

            IF @@ROWCOUNT = 0
            BEGIN
                INSERT INTO [dbo].[UserInventory] ([UserId], [ProductId], [Quantity])
                VALUES (@UserId, @ProductId, 1);
            END;
            """,
            connection,
            transaction);
        addInventory.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
        addInventory.Parameters.Add(new SqlParameter("@ProductId", SqlDbType.NVarChar, 40) { Value = productId });
        await addInventory.ExecuteNonQueryAsync(cancellationToken);

        await transaction.CommitAsync(cancellationToken);
        return true;
    }

    private static async Task<bool> UserExistsAsync(
        SqlConnection connection,
        Guid userId,
        CancellationToken cancellationToken)
    {
        await using var command = new SqlCommand(
            "SELECT 1 FROM [dbo].[Users] WHERE [UserId] = @UserId;",
            connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
        return await command.ExecuteScalarAsync(cancellationToken) is not null;
    }

    private string GetConnectionString() =>
        !string.IsNullOrWhiteSpace(_connectionString)
            ? _connectionString
            : throw new InvalidOperationException(
                "Configure the ConnectionStrings:EdufixDb environment variable before using the shop.");
}

public sealed record InventoryItem(string ProductId, int Quantity);
public sealed record ShopAccountState(int Coins, bool HasStudyPass, IReadOnlyList<InventoryItem> Inventory);
