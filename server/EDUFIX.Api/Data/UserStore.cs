using System.Data;
using Edufix.Api.Auth;
using Microsoft.Data.SqlClient;

namespace Edufix.Api.Data;

public sealed class UserStore(IConfiguration configuration)
{
    private readonly string? _connectionString =
        configuration.GetConnectionString("EdufixDb");

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_connectionString);

    public async Task<UserAccount?> FindByEmailAsync(
        string normalizedEmail,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(GetConnectionString());
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            """
            SELECT [UserId], [DisplayName], [Email], [NormalizedEmail], [PasswordHash], [CreatedAtUtc], [GradeBand], [Coins], [HasStudyPass]
            FROM [dbo].[Users]
            WHERE [NormalizedEmail] = @NormalizedEmail;
            """,
            connection);
        command.Parameters.Add(
            new SqlParameter("@NormalizedEmail", SqlDbType.NVarChar, 254)
            {
                Value = normalizedEmail
            });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return ReadUser(reader);
    }

    public async Task<UserAccount?> FindByIdAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(GetConnectionString());
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            """
            SELECT [UserId], [DisplayName], [Email], [NormalizedEmail], [PasswordHash], [CreatedAtUtc], [GradeBand], [Coins], [HasStudyPass]
            FROM [dbo].[Users]
            WHERE [UserId] = @UserId;
            """,
            connection);
        command.Parameters.Add(
            new SqlParameter("@UserId", SqlDbType.UniqueIdentifier)
            {
                Value = userId
            });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadUser(reader) : null;
    }

    public async Task AddAsync(
        UserAccount user,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(GetConnectionString());
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            """
            INSERT INTO [dbo].[Users]
                ([UserId], [DisplayName], [Email], [NormalizedEmail], [PasswordHash])
            VALUES
                (@UserId, @DisplayName, @Email, @NormalizedEmail, @PasswordHash);
            """,
            connection);
        command.Parameters.Add(
            new SqlParameter("@UserId", SqlDbType.UniqueIdentifier)
            {
                Value = user.UserId
            });
        command.Parameters.Add(
            new SqlParameter("@DisplayName", SqlDbType.NVarChar, 80)
            {
                Value = user.DisplayName
            });
        command.Parameters.Add(
            new SqlParameter("@Email", SqlDbType.NVarChar, 254)
            {
                Value = user.Email
            });
        command.Parameters.Add(
            new SqlParameter("@NormalizedEmail", SqlDbType.NVarChar, 254)
            {
                Value = user.NormalizedEmail
            });
        command.Parameters.Add(
            new SqlParameter("@PasswordHash", SqlDbType.NVarChar, 512)
            {
                Value = user.PasswordHash
            });

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<bool> UpdateGradeBandAsync(
        Guid userId,
        string gradeBand,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(GetConnectionString());
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            """
            UPDATE [dbo].[Users]
            SET [GradeBand] = @GradeBand
            WHERE [UserId] = @UserId;
            """,
            connection);
        command.Parameters.Add(
            new SqlParameter("@GradeBand", SqlDbType.NVarChar, 10)
            {
                Value = gradeBand
            });
        command.Parameters.Add(
            new SqlParameter("@UserId", SqlDbType.UniqueIdentifier)
            {
                Value = userId
            });

        return await command.ExecuteNonQueryAsync(cancellationToken) == 1;
    }

    private string GetConnectionString() =>
        IsConfigured
            ? _connectionString!
            : throw new InvalidOperationException(
                "Configure the ConnectionStrings:EdufixDb environment variable before using authentication.");

    private static UserAccount ReadUser(SqlDataReader reader) =>
        new(
            reader.GetGuid(0),
            reader.GetString(1),
            reader.GetString(2),
            reader.GetString(3),
            reader.GetString(4),
            reader.GetDateTime(5),
            reader.IsDBNull(6) ? null : reader.GetString(6),
            reader.GetInt32(7),
            reader.GetBoolean(8));
}
