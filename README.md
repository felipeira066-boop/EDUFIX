# EDUFIX

EDUFIX é uma plataforma de estudos com página inicial, cadastro, login, escolha de etapa escolar e uma área de matérias. A interface é servida pelo ASP.NET Core, e os dados das contas usam o projeto SQL Server em `EDUFIX/EDUFIX.sqlproj`.

## Pré-requisitos

- .NET 10 SDK.
- Uma instância SQL Server local ou remota, com um banco `EdufixDb` acessível.
- A extensão SQL Database Projects para publicar `EDUFIX/EDUFIX.sqlproj`, se o esquema ainda não estiver aplicado.

## Preparar o banco

Abra `EDUFIX/EDUFIX.sqlproj` na extensão SQL Database Projects e publique-o em uma instância SQL Server. O projeto define a tabela `dbo.Users`, o índice único de e-mail normalizado e a coluna opcional `GradeBand` (`EF1`, `EF2`, `EM`). Contas sem uma etapa selecionada são encaminhadas para a escolha de plano antes de acessar as matérias. Compilar o projeto gera um `.dacpac`, mas não cria nem publica automaticamente um banco de dados.

Não há uma instância SQL Server configurada neste workspace. Portanto, a publicação precisa ser feita pelo desenvolvedor em um servidor ao qual tenha acesso.

## Executar a aplicação

**Não utilize o Live Server/Live Preview** para entrar ou cadastrar usuários: ele serve apenas arquivos estáticos na porta `5500` e não atende à API de autenticação. No VS Code, abra **Executar e Depurar** (`Ctrl+Shift+D`), selecione **EDUFIX: run website and API** e pressione `F5`. Essa configuração compila e inicia o servidor que serve as páginas, o login e a API juntos; o navegador abrirá o endereço correto da aplicação.

Configure a connection string fora do código. Para uma instância local de desenvolvimento usando autenticação integrada do Windows, por exemplo, no PowerShell:

```powershell
$env:ConnectionStrings__EdufixDb = "Server=localhost;Database=EDUFIX;Integrated Security=True;Encrypt=True;TrustServerCertificate=True"
dotnet run --project .\server\EDUFIX.Api\Edufix.Api.csproj
```

`TrustServerCertificate=True` deve ser usado apenas em desenvolvimento local. Em outros ambientes, configure um certificado confiável e mantenha a validação do certificado habilitada. O plano pode ser trocado depois pela página de matérias; as contas existentes passam a escolher sua etapa na primeira visita.

A alternativa é executar `dotnet run --project .\server\EDUFIX.Api\Edufix.Api.csproj --launch-profile Edufix.Api`. Acesse a URL HTTPS exibida no terminal. Se o certificado HTTPS de desenvolvimento ainda não estiver configurado, execute `dotnet dev-certs https --trust`.

Em produção, configure `ASPNETCORE_ALLOWEDHOSTS` com o domínio da aplicação. O projeto limita as tentativas de autenticação e exige HTTPS para os cookies de sessão. Sem a connection string, o site ainda pode ser apresentado, mas os endpoints de cadastro e login informam que o banco está indisponível.

## Endpoints de autenticação

- `POST /api/auth/register`: cria uma conta e inicia a sessão.
- `POST /api/auth/login`: verifica e-mail e senha e inicia a sessão.
- `GET /api/auth/me`: retorna a conta da sessão atual e o plano escolar escolhido.
- `POST /api/auth/logout`: encerra a sessão.
- `PUT /api/study/plan`: grava a etapa escolar `EF1`, `EF2` ou `EM`.
- `GET /api/study/courses`: retorna somente as matérias da etapa escolar da conta.
- `GET /inicio`: encaminha a pessoa autenticada à escolha do plano ou às matérias.
- `GET /plano.html` e `GET /materias.html`: páginas privadas servidas pelo servidor somente para contas autenticadas.
- `GET /api/health`: indica se a aplicação está executando e se há uma connection string configurada.

As senhas são armazenadas como hashes gerados pelo hasher do ASP.NET Core Identity, nunca em texto aberto. O servidor usa SQL parametrizado, cookie de sessão `HttpOnly` com `Secure` e `SameSite=Strict`, e limita tentativas nos endpoints de autenticação. Não coloque credenciais da base de dados no repositório; configure-as pelo ambiente ou por um gerenciador de segredos.

A página de matérias apresenta uma primeira seleção de disciplinas e conceitos adequados ao plano escolhido. A plataforma informa claramente que trilhas interativas e exercícios serão implementados em etapas futuras.
