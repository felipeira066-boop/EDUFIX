using System.Security.Claims;
using Edufix.Api.Data;
using Microsoft.AspNetCore.RateLimiting;

namespace Edufix.Api.Auth;

public static class StudyEndpoints
{
    private static readonly IReadOnlyDictionary<string, StudyPlan> Plans =
        new Dictionary<string, StudyPlan>(StringComparer.Ordinal)
        {
            ["EF1"] = new("EF1", "Ensino Fundamental I", "1º ao 5º ano", "🌱"),
            ["EF2"] = new("EF2", "Ensino Fundamental II", "6º ao 9º ano", "🌿"),
            ["EM"] = new("EM", "Ensino Médio", "1º ao 3º ano", "🚀")
        };

    private static readonly IReadOnlyDictionary<string, IReadOnlyList<StudySubject>> Subjects =
        new Dictionary<string, IReadOnlyList<StudySubject>>(StringComparer.Ordinal)
        {
            ["EF1"] =
            [
                new("matematica", "Matemática", "Descubra números, operações e formas no dia a dia.", "🔢",
                    ["Números e contagem", "Adição e subtração", "Formas e medidas"]),
                new("portugues", "Língua Portuguesa", "Leia, escreva e explore as palavras.", "📖",
                    ["Leitura e interpretação", "Escrita e ortografia", "Histórias e personagens"]),
                new("ciencias", "Ciências", "Conheça a natureza e o mundo ao seu redor.", "🔬",
                    ["Corpo e saúde", "Plantas e animais", "Água e ambiente"]),
                new("historia", "História", "Investigue histórias, memórias e o tempo.", "🕰️",
                    ["Minha história", "Família e comunidade", "Passagem do tempo"]),
                new("geografia", "Geografia", "Observe os lugares e as paisagens onde vivemos.", "🌍",
                    ["Casa e escola", "Paisagens", "Mapas e caminhos"])
            ],
            ["EF2"] =
            [
                new("matematica", "Matemática", "Resolva desafios com números e pensamento lógico.", "🔢",
                    ["Frações e decimais", "Razão e proporção", "Geometria e medidas"]),
                new("portugues", "Língua Portuguesa", "Interprete diferentes textos e aprimore sua escrita.", "📖",
                    ["Gêneros textuais", "Interpretação de texto", "Gramática em contexto"]),
                new("ciencias", "Ciências", "Investigue os fenômenos naturais e o ambiente.", "🔬",
                    ["Corpo humano", "Ecossistemas", "Matéria e energia"]),
                new("historia", "História", "Conheça diferentes sociedades e transformações históricas.", "🏛️",
                    ["Mundos antigos", "Sociedades medievais", "Brasil e cidadania"]),
                new("geografia", "Geografia", "Entenda territórios, paisagens e suas relações.", "🌍",
                    ["Cartografia", "Paisagem e espaço", "População e território"]),
                new("ingles", "Língua Inglesa", "Pratique comunicação e vocabulário em inglês.", "💬",
                    ["Apresentações", "Cotidiano e vocabulário", "Leitura guiada"])
            ],
            ["EM"] =
            [
                new("matematica", "Matemática", "Desenvolva raciocínio matemático para a escola e o vestibular.", "🔢",
                    ["Funções", "Geometria", "Estatística e probabilidade"]),
                new("linguagens", "Linguagens e Redação", "Leia criticamente, interprete e organize suas ideias.", "✍️",
                    ["Interpretação de texto", "Literatura", "Redação e argumentação"]),
                new("biologia", "Biologia", "Explore a vida, os organismos e suas relações.", "🧬",
                    ["Citologia", "Genética", "Ecologia"]),
                new("fisica", "Física", "Entenda as leis que explicam movimentos e fenômenos.", "⚡",
                    ["Cinemática", "Energia", "Eletricidade"]),
                new("quimica", "Química", "Investigue materiais e suas transformações.", "⚗️",
                    ["Estrutura atômica", "Ligações e reações", "Química e cotidiano"]),
                new("historia", "História", "Analise processos históricos e desafios do presente.", "🏛️",
                    ["Brasil", "História contemporânea", "Cidadania e sociedade"]),
                new("geografia", "Geografia", "Compreenda questões territoriais, sociais e ambientais.", "🌍",
                    ["Geopolítica", "Urbanização", "Clima e ambiente"]),
                new("filosofia", "Filosofia e Sociologia", "Pense criticamente sobre ideias, pessoas e sociedade.", "💭",
                    ["Ética e pensamento", "Cultura e identidade", "Sociedade e política"])
            ]
        };

    public static IEndpointRouteBuilder MapStudyEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var privatePages = Path.Combine(endpoints.ServiceProvider
            .GetRequiredService<IWebHostEnvironment>()
            .ContentRootPath, "PrivatePages");

        endpoints.MapGet("/inicio", async (
            ClaimsPrincipal principal,
            UserStore userStore,
            HttpContext context) =>
        {
            var user = await GetSignedInUserAsync(principal, userStore, context.RequestAborted);
            return user is null
                ? Results.Unauthorized()
                : Results.Redirect(user.GradeBand is null ? "/plano.html" : "/materias.html");
        }).RequireAuthorization();

        endpoints.MapGet("/plano.html", () =>
            Results.File(Path.Combine(privatePages, "plano.html"), "text/html; charset=utf-8"))
            .RequireAuthorization();

        endpoints.MapGet("/materias.html", async (
            ClaimsPrincipal principal,
            UserStore userStore,
            HttpContext context) =>
        {
            var user = await GetSignedInUserAsync(principal, userStore, context.RequestAborted);
            if (user is null)
            {
                return Results.Unauthorized();
            }

            return user.GradeBand is null
                ? Results.Redirect("/plano.html")
                : Results.File(Path.Combine(privatePages, "materias.html"), "text/html; charset=utf-8");
        }).RequireAuthorization();

        endpoints.MapGet("/loja.html", () =>
            Results.File(Path.Combine(privatePages, "loja.html"), "text/html; charset=utf-8"))
            .RequireAuthorization();

        var studyApi = endpoints.MapGroup("/api/study").RequireAuthorization();
        studyApi.MapPut("/plan", SavePlanAsync).RequireRateLimiting("auth");
        studyApi.MapGet("/courses", GetCoursesAsync);

        return endpoints;
    }

    private static async Task<IResult> SavePlanAsync(
        PlanSelectionRequest request,
        ClaimsPrincipal principal,
        UserStore store,
        HttpContext context)
    {
        if (request.GradeBand is null || !Plans.TryGetValue(request.GradeBand, out var plan))
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["gradeBand"] = ["Escolha EF1, EF2 ou Ensino Médio."]
            });
        }

        if (!Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            return Results.Unauthorized();
        }

        if (!store.IsConfigured)
        {
            return DatabaseNotConfigured();
        }

        var updated = await store.UpdateGradeBandAsync(userId, plan.Code, context.RequestAborted);
        if (!updated)
        {
            return Results.Unauthorized();
        }

        return Results.Ok(new
        {
            gradeBand = plan.Code,
            planName = plan.Name,
            gradeRange = plan.GradeRange
        });
    }

    private static async Task<IResult> GetCoursesAsync(
        ClaimsPrincipal principal,
        UserStore store,
        HttpContext context)
    {
        var user = await GetSignedInUserAsync(principal, store, context.RequestAborted);
        if (user is null)
        {
            return Results.Unauthorized();
        }

        if (user.GradeBand is null || !Plans.TryGetValue(user.GradeBand, out var plan))
        {
            return Results.Conflict(new
            {
                code = "plan_required",
                message = "Escolha seu plano escolar antes de acessar as matérias."
            });
        }

        return Results.Ok(new
        {
            plan.Code,
            plan.Name,
            plan.GradeRange,
            subjects = Subjects[plan.Code]
        });
    }

    private static async Task<UserAccount?> GetSignedInUserAsync(
        ClaimsPrincipal principal,
        UserStore store,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var userId) ||
            !store.IsConfigured)
        {
            return null;
        }

        return await store.FindByIdAsync(userId, cancellationToken);
    }

    private static IResult DatabaseNotConfigured() =>
        Results.Problem(
            statusCode: StatusCodes.Status503ServiceUnavailable,
            title: "Banco de dados não configurado.",
            detail: "Configure ConnectionStrings__EdufixDb e aplique o esquema SQL antes de escolher seu plano.");

    private sealed record StudyPlan(string Code, string Name, string GradeRange, string Icon);

    private sealed record StudySubject(
        string Id,
        string Name,
        string Description,
        string Icon,
        IReadOnlyList<string> Topics);
}
