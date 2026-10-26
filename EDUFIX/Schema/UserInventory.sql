CREATE TABLE [dbo].[UserInventory]
(
    [UserId] UNIQUEIDENTIFIER NOT NULL,
    [ProductId] NVARCHAR(40) NOT NULL,
    [Quantity] INT NOT NULL,
    CONSTRAINT [PK_UserInventory] PRIMARY KEY CLUSTERED ([UserId], [ProductId]),
    CONSTRAINT [FK_UserInventory_Users] FOREIGN KEY ([UserId])
        REFERENCES [dbo].[Users] ([UserId]),
    CONSTRAINT [CK_UserInventory_Quantity] CHECK ([Quantity] > 0)
);
GO
