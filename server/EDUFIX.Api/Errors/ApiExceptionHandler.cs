using Microsoft.AspNetCore.Diagnostics;
using Microsoft.Data.SqlClient;

namespace Edufix.Api.Errors;

public sealed class ApiExceptionHandler(
    ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        logger.LogError(exception, "A solicitação falhou.");

        var databaseFailure = exception is SqlException;
        var statusCode = databaseFailure
            ? StatusCodes.Status503ServiceUnavailable
            : StatusCodes.Status500InternalServerError;

        httpContext.Response.StatusCode = statusCode;
        await Results.Problem(
            statusCode: statusCode,
            title: databaseFailure
                ? "Banco de dados indisponível."
                : "Não foi possível concluir a solicitação.",
            detail: databaseFailure
                ? "Verifique a conexão com o SQL Server e se o esquema do banco foi publicado."
                : "Tente novamente. O erro foi registrado para investigação.").ExecuteAsync(httpContext);

        return true;
    }
}
