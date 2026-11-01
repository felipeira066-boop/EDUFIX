# EDUFIX

EDUFIX é uma plataforma de estudos com página inicial, cadastro, login, escolha de etapa escolar e uma área de matérias com aventuras animadas. A interface é servida pelo ASP.NET Core, e os dados das contas usam o projeto SQL Server em `EDUFIX/EDUFIX.sqlproj`.

## Pré-requisitos

- .NET 10 SDK.
- Uma instância SQL Server local ou remota, com um banco `EdufixDb` acessível.
- A extensão SQL Database Projects para publicar `EDUFIX/EDUFIX.sqlproj`, se o esquema ainda não estiver aplicado.

## Preparar o banco

Abra `EDUFIX/EDUFIX.sqlproj` na extensão SQL Database Projects e publique-o em uma instância SQL Server. O projeto define a tabela `dbo.Users`, o índice único de e-mail normalizado, a coluna opcional `GradeBand` (`EF1`, `EF2`, `EM`) e a tabela de códigos de recuperação vinculada às contas. Contas sem uma etapa selecionada são encaminhadas para a escolha de plano antes de acessar as matérias. Compilar o projeto gera um `.dacpac`, mas não cria nem publica automaticamente um banco de dados.

Não há uma instância SQL Server configurada neste workspace. Portanto, a publicação precisa ser feita pelo desenvolvedor em um servidor ao qual tenha acesso.

## Executar a aplicação

**O Go Live/Live Server e o Live Preview não executam o ASP.NET Core.** Eles podem mostrar HTML estático, mas não atendem à API, autenticação por cookie nem páginas privadas; por isso, login, cadastro e recursos da conta não funcionam nessa origem.

Para visualizar a interface pelo Go Live no endereço `http://127.0.0.1:5500/server/EDUFIX.Api/wwwroot/index.html`, os links entre `index.html`, `login.html` e `cadastro.html` são relativos à pasta `wwwroot`, evitando o erro “Não foi possível obter /login.html”. O Go Live consegue abrir e navegar por essas telas, mas enviar o formulário de login/cadastro ainda exige a API ASP.NET Core; para testar essas ações, inicie o servidor e use `https://localhost:7180`.

Para usar o site completo no VS Code:

1. Abra **Executar e Depurar** (`Ctrl+Shift+D`), selecione **EDUFIX: run website and API** e pressione `F5`.
2. Aguarde no terminal a mensagem `Now listening on: https://localhost:7180`.
3. Para abrir no navegador integrado, pressione `Ctrl+Shift+P`, execute **Simple Browser: Show** e informe `https://localhost:7180`. Também é possível usar o navegador externo que o VS Code abrir.
4. Mantenha a sessão de depuração ativa enquanto usa o site. Parar a depuração encerra a API e causa `ERR_CONNECTION_REFUSED`; inicie novamente com `F5`.

Use sempre a origem `https://localhost:7180` para as páginas e a API. Não abra `wwwroot` como `file:///...` nem acesse pelo endereço do Go Live (`localhost:5500`), pois isso usa uma origem diferente e não executa o backend.

Configure a connection string fora do código. Para uma instância local de desenvolvimento usando autenticação integrada do Windows, por exemplo, no PowerShell:

```powershell
$env:ConnectionStrings__EdufixDb = "Server=localhost;Database=EdufixDb;Integrated Security=True;Encrypt=True;TrustServerCertificate=True"
dotnet run --project .\server\EDUFIX.Api\Edufix.Api.csproj
```

O arquivo `server/EDUFIX.Api/appsettings.json` já contém uma connection string local de desenvolvimento para `EdufixDb`; a variável acima é necessária somente se quiser substituí-la. Verifique que o SQL Server está ativo e que o esquema foi publicado nesse mesmo banco. `TrustServerCertificate=True` deve ser usado apenas em desenvolvimento local. Em outros ambientes, configure um certificado confiável e mantenha a validação do certificado habilitada. O plano pode ser trocado depois pela página de matérias; as contas existentes passam a escolher sua etapa na primeira visita.

A alternativa é executar `dotnet run --project .\server\EDUFIX.Api\Edufix.Api.csproj --launch-profile Edufix.Api`. Acesse a URL HTTPS exibida no terminal. Se o certificado HTTPS de desenvolvimento ainda não estiver configurado, execute `dotnet dev-certs https --trust`.

Em produção, configure `AllowedHosts` com o domínio da aplicação. O projeto limita as tentativas de autenticação e exige HTTPS para os cookies de sessão. Sem a connection string, o site ainda pode ser apresentado, mas os endpoints de cadastro e login informam que o banco está indisponível.

Para habilitar a recuperação de senha, publique também o esquema SQL atualizado e configure o SMTP no ambiente da aplicação: `Email__SmtpHost`, `Email__SmtpPort` (587 com STARTTLS), `Email__SmtpUsername`, `Email__SmtpPassword` e `Email__FromAddress`. `Email__FromName` é opcional e usa `EDUFIX` por padrão. Mantenha usuário e senha SMTP em variáveis de ambiente ou em um gerenciador de segredos, nunca no repositório. Sem essa configuração, a página informa que o envio não está disponível.

## Endpoints de autenticação

- `POST /api/auth/register`: cria uma conta e inicia a sessão.
- `POST /api/auth/login`: verifica e-mail e senha e inicia a sessão.
- `POST /api/auth/password-reset/request`: solicita um código de recuperação por e-mail.
- `POST /api/auth/password-reset/complete`: valida o código e salva a nova senha.
- `GET /api/auth/me`: retorna a conta da sessão atual e o plano escolar escolhido.
- `POST /api/auth/logout`: encerra a sessão.
- `PUT /api/study/plan`: grava a etapa escolar `EF1`, `EF2` ou `EM`.
- `GET /api/study/courses`: retorna somente as matérias da etapa escolar da conta.
- `GET /loja.html`: loja privada de itens e passe de estudos.
- `GET /api/shop/`: consulta saldo de moedas, catálogo e inventário.
- `POST /api/shop/purchase`: resgata um item do catálogo usando moedas da conta.
- `GET /inicio`: encaminha a pessoa autenticada à escolha do plano ou às matérias.
- `GET /plano.html`, `GET /materias.html` e `GET /jogo.html?materia=<id>`: páginas privadas servidas somente para contas autenticadas; o jogo também valida se a matéria pertence à etapa escolar da conta.
- `GET /api/health`: indica se a aplicação está executando e se há uma connection string configurada.

Novas contas recebem 500 moedas iniciais. A loja permite resgatar skins, vidas extras e itens de XP em dobro; saldo e inventário são persistidos no SQL Server. O passe de estudos aparece com os benefícios planejados (vidas ilimitadas e sem anúncios), mas pagamentos ainda não estão integrados e o botão permanece desativado: nenhum pagamento ou benefício premium é simulado. Os espaços identificados como anúncios são apenas placeholders, sem scripts de terceiros ou publicidade ativa, até a escolha e configuração de um provedor.

As senhas são armazenadas como hashes gerados pelo hasher do ASP.NET Core Identity, nunca em texto aberto. Os códigos de recuperação também são armazenados apenas como hashes com salt, expiram em 10 minutos e são invalidados após o uso ou cinco tentativas incorretas. O servidor usa SQL parametrizado, cookie de sessão `HttpOnly` com `Secure` e `SameSite=Strict`, e limita tentativas nos endpoints de autenticação. Login e cadastro dependem desses controles e da segurança do banco. Não coloque credenciais da base de dados ou SMTP no repositório; configure-as pelo ambiente ou por um gerenciador de segredos.

A página de matérias apresenta disciplinas e conceitos adequados ao plano escolhido. Cada matéria abre uma aventura de plataforma com uma cutscene para libertar o mascote; depois, o personagem se movimenta com W, A, S e D, e o mascote o acompanha. Trilhas de conteúdo e exercícios interativos serão implementados em etapas futuras.
