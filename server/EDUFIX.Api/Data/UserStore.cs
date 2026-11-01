using System.Data;
using System.Security.Cryptography;
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

    public async Task<Guid?> CreatePasswordResetCodeAsync(
        string normalizedEmail,
        byte[] codeHash,
        byte[] codeSalt,
        DateTime expiresAtUtc,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(GetConnectionString());
        await connection.OpenAsync(cancellationToken);
        await using var transaction =
            (SqlTransaction)await connection.BeginTransactionAsync(cancellationToken);

        Guid? userId;
        await using (var findUser = new SqlCommand(
            """
            SELECT [UserId]
            FROM [dbo].[Users] WITH (UPDLOCK, HOLDLOCK)
            WHERE [NormalizedEmail] = @NormalizedEmail;
            """,
            connection,
            transaction))
        {
            findUser.Parameters.Add(
                new SqlParameter("@NormalizedEmail", SqlDbType.NVarChar, 254)
                {
                    Value = normalizedEmail
                });
            var result = await findUser.ExecuteScalarAsync(cancellationToken);
            userId = result is Guid id ? id : null;
        }

        if (userId is null)
        {
            await transaction.CommitAsync(cancellationToken);
            return null;
        }

        await using (var deleteExisting = new SqlCommand(
            "DELETE FROM [dbo].[PasswordResetCodes] WHERE [UserId] = @UserId;",
            connection,
            transaction))
        {
            deleteExisting.Parameters.Add(
                new SqlParameter("@UserId", SqlDbType.UniqueIdentifier)
                {
                    Value = userId.Value
                });
            await deleteExisting.ExecuteNonQueryAsync(cancellationToken);
        }

        await using (var insertCode = new SqlCommand(
            """
            INSERT INTO [dbo].[PasswordResetCodes]
                ([UserId], [CodeHash], [CodeSalt], [ExpiresAtUtc])
            VALUES
                (@UserId, @CodeHash, @CodeSalt, @ExpiresAtUtc);
            """,
            connection,
            transaction))
        {
            insertCode.Parameters.Add(
                new SqlParameter("@UserId", SqlDbType.UniqueIdentifier)
                {
                    Value = userId.Value
                });
            insertCode.Parameters.Add(
                new SqlParameter("@CodeHash", SqlDbType.Binary, 32)
                {
                    Value = codeHash
                });
            insertCode.Parameters.Add(
                new SqlParameter("@CodeSalt", SqlDbType.Binary, 16)
                {
                    Value = codeSalt
                });
            insertCode.Parameters.Add(
                new SqlParameter("@ExpiresAtUtc", SqlDbType.DateTime2)
                {
                    Value = expiresAtUtc
                });
            await insertCode.ExecuteNonQueryAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
        return userId;
    }

    public async Task RemovePasswordResetCodeAsync(
        Guid userId,
        byte[] codeHash,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(GetConnectionString());
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            """
            DELETE FROM [dbo].[PasswordResetCodes]
            WHERE [UserId] = @UserId AND [CodeHash] = @CodeHash;
            """,
            connection);
        command.Parameters.Add(
            new SqlParameter("@UserId", SqlDbType.UniqueIdentifier)
            {
                Value = userId
            });
        command.Parameters.Add(
            new SqlParameter("@CodeHash", SqlDbType.Binary, 32)
            {
                Value = codeHash
            });

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<bool> TryResetPasswordAsync(
        string normalizedEmail,
        string code,
        string newPasswordHash,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(GetConnectionString());
        await connection.OpenAsync(cancellationToken);
        await using var transaction =
            (SqlTransaction)await connection.BeginTransactionAsync(cancellationToken);

        Guid userId;
        await using (var findUser = new SqlCommand(
            """
            SELECT [UserId]
            FROM [dbo].[Users] WITH (UPDLOCK, HOLDLOCK)
            WHERE [NormalizedEmail] = @NormalizedEmail;
            """,
            connection,
            transaction))
        {
            findUser.Parameters.Add(
                new SqlParameter("@NormalizedEmail", SqlDbType.NVarChar, 254)
                {
                    Value = normalizedEmail
                });
            var result = await findUser.ExecuteScalarAsync(cancellationToken);
            if (result is not Guid id)
            {
                await transaction.CommitAsync(cancellationToken);
                return false;
            }

            userId = id;
        }

        byte[]? expectedCodeHash = null;
        byte[]? codeSalt = null;
        DateTime expiresAtUtc = default;
        byte failedAttempts = 0;
        var hasCode = false;
        await using (var findCode = new SqlCommand(
            """
            SELECT [CodeHash], [CodeSalt], [ExpiresAtUtc], [FailedAttempts]
            FROM [dbo].[PasswordResetCodes] WITH (UPDLOCK, HOLDLOCK)
            WHERE [UserId] = @UserId;
            """,
            connection,
            transaction))
        {
            findCode.Parameters.Add(
                new SqlParameter("@UserId", SqlDbType.UniqueIdentifier)
                {
                    Value = userId
                });
            await using var reader = await findCode.ExecuteReaderAsync(cancellationToken);
            if (await reader.ReadAsync(cancellationToken))
            {
                expectedCodeHash = (byte[])reader[0];
                codeSalt = (byte[])reader[1];
                expiresAtUtc = reader.GetDateTime(2);
                failedAttempts = reader.GetByte(3);
                hasCode = true;
            }
        }

        if (!hasCode)
        {
            await transaction.CommitAsync(cancellationToken);
            return false;
        }

        if (expiresAtUtc <= DateTime.UtcNow || failedAttempts >= 5)
        {
            await DeletePasswordResetCodeAsync(connection, transaction, userId, cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return false;
        }

        var actualCodeHash = Rfc2898DeriveBytes.Pbkdf2(
            code,
            codeSalt!,
            210_000,
            HashAlgorithmName.SHA256,
            32);
        if (!CryptographicOperations.FixedTimeEquals(expectedCodeHash!, actualCodeHash))
        {
            if (failedAttempts >= 4)
            {
                await DeletePasswordResetCodeAsync(connection, transaction, userId, cancellationToken);
            }
            else
            {
                await using var incrementAttempts = new SqlCommand(
                    """
                    UPDATE [dbo].[PasswordResetCodes]
                    SET [FailedAttempts] = [FailedAttempts] + 1
                    WHERE [UserId] = @UserId;
                    """,
                    connection,
                    transaction);
                incrementAttempts.Parameters.Add(
                    new SqlParameter("@UserId", SqlDbType.UniqueIdentifier)
                    {
                        Value = userId
                    });
                await incrementAttempts.ExecuteNonQueryAsync(cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);
            return false;
        }

        await using (var updatePassword = new SqlCommand(
            """
            UPDATE [dbo].[Users]
            SET [PasswordHash] = @PasswordHash
            WHERE [UserId] = @UserId;
            """,
            connection,
            transaction))
        {
            updatePassword.Parameters.Add(
                new SqlParameter("@PasswordHash", SqlDbType.NVarChar, 512)
                {
                    Value = newPasswordHash
                });
            updatePassword.Parameters.Add(
                new SqlParameter("@UserId", SqlDbType.UniqueIdentifier)
                {
                    Value = userId
                });
            if (await updatePassword.ExecuteNonQueryAsync(cancellationToken) != 1)
            {
                throw new InvalidOperationException("A conta não foi encontrada ao atualizar a senha.");
            }
        }

        await DeletePasswordResetCodeAsync(connection, transaction, userId, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return true;
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

    private static async Task DeletePasswordResetCodeAsync(
        SqlConnection connection,
        SqlTransaction transaction,
        Guid userId,
        CancellationToken cancellationToken)
    {
        await using var deleteCode = new SqlCommand(
            "DELETE FROM [dbo].[PasswordResetCodes] WHERE [UserId] = @UserId;",
            connection,
            transaction);
        deleteCode.Parameters.Add(
            new SqlParameter("@UserId", SqlDbType.UniqueIdentifier)
            {
                Value = userId
            });
        await deleteCode.ExecuteNonQueryAsync(cancellationToken);
    }

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
