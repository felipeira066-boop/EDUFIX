CREATE TABLE [dbo].[PasswordResetCodes]
(
    [UserId] UNIQUEIDENTIFIER NOT NULL,
    [CodeHash] BINARY(32) NOT NULL,
    [CodeSalt] BINARY(16) NOT NULL,
    [ExpiresAtUtc] DATETIME2(0) NOT NULL,
    [FailedAttempts] TINYINT NOT NULL CONSTRAINT [DF_PasswordResetCodes_FailedAttempts] DEFAULT (0),
    CONSTRAINT [PK_PasswordResetCodes] PRIMARY KEY CLUSTERED ([UserId]),
    CONSTRAINT [FK_PasswordResetCodes_Users] FOREIGN KEY ([UserId])
        REFERENCES [dbo].[Users] ([UserId]) ON DELETE CASCADE,
    CONSTRAINT [CK_PasswordResetCodes_FailedAttempts] CHECK ([FailedAttempts] <= 5)
);
