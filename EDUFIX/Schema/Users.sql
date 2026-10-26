CREATE TABLE [dbo].[Users]
(
    [UserId] UNIQUEIDENTIFIER NOT NULL,
    [DisplayName] NVARCHAR(80) NOT NULL,
    [Email] NVARCHAR(254) NOT NULL,
    [NormalizedEmail] NVARCHAR(254) NOT NULL,
    [PasswordHash] NVARCHAR(512) NOT NULL,
    [CreatedAtUtc] DATETIME2(0) NOT NULL CONSTRAINT [DF_Users_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [GradeBand] NVARCHAR(10) NULL,
    [Coins] INT NOT NULL CONSTRAINT [DF_Users_Coins] DEFAULT (500),
    [HasStudyPass] BIT NOT NULL CONSTRAINT [DF_Users_HasStudyPass] DEFAULT (0),
    CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED ([UserId]),
    CONSTRAINT [CK_Users_GradeBand] CHECK ([GradeBand] IS NULL OR [GradeBand] IN (N'EF1', N'EF2', N'EM'))
);
GO

CREATE UNIQUE NONCLUSTERED INDEX [UX_Users_NormalizedEmail]
    ON [dbo].[Users] ([NormalizedEmail]);
