# EDUFIX

EDUFIX é uma plataforma de estudos em português, com páginas estáticas, login pelo Supabase Auth e dados de perfil e loja no Supabase. O site não precisa de servidor ASP.NET nem de um processo de build frontend.

## Preparar o Supabase

O projeto EDUFIX usa o Supabase `kubdkgtxaabkdakopytu`. A URL e a chave **publishable** ficam em `site/supabase-client.js`; a chave publishable é pública e pode ser usada no navegador. Nunca coloque uma chave `service_role`, senha de banco ou segredo SMTP em arquivos do site.

1. No painel do Supabase, abra **SQL Editor** e execute uma vez todo o arquivo `supabase/migrations/20261101000000_initial_schema.sql`. Ele cria perfil, inventário, políticas RLS, o perfil inicial de cada nova conta e a função transacional de compra.
2. Em **Authentication → URL Configuration**, defina a URL do site publicado como **Site URL** (por exemplo, `https://SEU-DOMINIO`) e adicione à lista de redirecionamentos permitidos:
   - `https://SEU-DOMINIO/login.html` para confirmação de cadastro.
   - `https://SEU-DOMINIO/redefinir-senha.html` para redefinição de senha.
   - `http://localhost:5500/login.html` e `http://localhost:5500/redefinir-senha.html` para desenvolvimento local.

   O cadastro informa explicitamente ao Supabase que o link de confirmação deve retornar à página de login no mesmo domínio em que a conta foi criada. Ao abrir o link, o Supabase valida a confirmação; se também criar uma sessão, o site abre a jornada automaticamente. Não é necessário criar uma página de confirmação separada. Links enviados antes dessa configuração não mudam: solicite um novo e-mail de confirmação depois de publicar.
3. Crie uma conta nova pela página `cadastro.html`. Contas e senhas anteriores do SQL Server não são migradas; crie sua conta de administrador novamente.
4. Para enviar e-mails de confirmação e recuperação a usuários reais, configure um SMTP próprio em **Authentication → SMTP Settings**. O serviço de e-mail padrão do Supabase é limitado para testes.

O saldo e o inventário não podem ser alterados diretamente pelo navegador. As políticas RLS limitam as consultas ao usuário autenticado, e a compra chama `purchase_product`, que valida o item e o preço no banco e atualiza saldo e inventário na mesma transação.

## Executar localmente

Sirva `site` por HTTP — não abra as páginas por `file:///`, pois os módulos JavaScript e a autenticação precisam de uma origem web. No VS Code, o Live Server pode servir essa pasta. Alternativamente, com Python instalado:

```powershell
python -m http.server 5500 --directory .\site
```

Abra `http://localhost:5500`. O login, cadastro e dados exigem acesso à internet e ao projeto Supabase configurado.

## Publicar o site

O repositório inclui `netlify.toml`. Para publicar, conecte o repositório ao Netlify e faça o deploy sem comando de build; o diretório publicado é `site`. Depois do primeiro deploy, adicione o domínio final também à configuração de URLs do Supabase.

Imagens e outros recursos visuais reutilizáveis ficam em `site/assets`; nas páginas, referencie-os pelo caminho publicado, por exemplo `/assets/share-image.png`.

As páginas de matérias, loja, plano e jogo são arquivos estáticos e podem ser acessados por URL. O JavaScript redireciona visitantes sem sessão, enquanto o RLS do Supabase protege os dados. Não use a chave `service_role` no frontend.

## Recursos atuais

- Cadastro, login, sessão persistente e redefinição de senha por link de e-mail.
- Seleção entre Ensino Fundamental I, Ensino Fundamental II e Ensino Médio.
- Catálogo de matérias e aventuras interativas com mascotes.
- Loja com saldo inicial de 500 moedas e inventário por conta.
- Passe de estudos exibido como recurso planejado; pagamentos ainda não estão integrados.

A página de matérias apresenta disciplinas e conceitos adequados ao plano escolhido. Cada matéria abre uma aventura de plataforma com uma cutscene para libertar o mascote; depois, o jogador escolhe a dificuldade com o mascote, enfrenta cinco mini ignorâncias em batalhas de cinco perguntas e avança entre os níveis Básico, Intermediário e Avançado pela porta no fim de cada fase. Trilhas de conteúdo e exercícios fora das aventuras serão implementados em etapas futuras.
