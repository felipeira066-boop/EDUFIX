# EDUFIX development guide

## Project context

EDUFIX is a Portuguese-language study platform for students from Ensino Fundamental I through Ensino Médio. It provides a public landing page, account registration and login, school-stage selection, subject overviews, and an account-based shop with coins and inventory. Interactive lessons and exercises and premium payments are not implemented.

The application uses ASP.NET Core on .NET 10, SQL Server, and plain HTML, CSS, and JavaScript. The browser UI and JSON API are served by the same application and origin.

## Build, run, and checks

- The API targets .NET 10. From the repository root, build it with `dotnet build .\server\EDUFIX.Api\Edufix.Api.csproj`.
- Match CI with `dotnet build .\server\EDUFIX.Api\Edufix.Api.csproj --configuration Release --warnaserror -p:NuGetAuditLevel=moderate`.
- Build the SQL database project separately with `dotnet build .\EDUFIX\EDUFIX.sqlproj`. This produces a DACPAC; it does not publish or update a database.
- Run the site and API together with `dotnet run --project .\server\EDUFIX.Api\Edufix.Api.csproj`. Set `ConnectionStrings__EdufixDb` in the environment for database-backed features. The VS Code launch configuration `EDUFIX: run website and API` builds, starts, and opens the site.
- The public pages are under `server/EDUFIX.Api/wwwroot`; serving the repository root directly makes root-relative links such as `/login.html` return 404. Use the VS Code launch configuration or `dotnet run` from the API project to serve the site and API together. Do not use Live Server or the Netlify static site to validate login, registration, or private pages: they do not run the ASP.NET API.
- The login form in `wwwroot/auth.js` posts to `/api/auth/login` and navigates to `/inicio` only after a successful response. Login also requires a reachable SQL Server with the schema applied and an existing account; when troubleshooting, inspect the request status and response in the browser's Network tools rather than treating a loaded page as proof that authentication is available.
- There is currently no test project or dedicated lint command in the repository.
- Preserve the dependency versions declared in `server/EDUFIX.Api/Edufix.Api.csproj` and `EDUFIX/EDUFIX.sqlproj`; do not upgrade or remove packages without a requirement.
- `netlify.toml` publishes only `server/EDUFIX.Api/wwwroot`. Full application hosting is pending a compatible API and SQL Server hosting plan; do not describe the static Netlify site as fully functional.

## Architecture

- `server/EDUFIX.Api` is a single ASP.NET Core application that serves both the browser UI and JSON API from one origin. `Program.cs` configures middleware, cookie authentication, rate limiting, headers, and application-wide error handling; endpoint mapping is split into `Auth`, `Study`, and `Shop` modules.
- Public pages and browser assets live in `server/EDUFIX.Api/wwwroot` and are served as static files. `AuthEndpoints.cs`, `StudyEndpoints.cs`, and `ShopEndpoints.cs` define the feature routes; `UserAccount.cs` holds the account and request records. Authenticated pages in `PrivatePages` are returned by authorized endpoints; keep them out of the public static-file directory.
- Browser code is plain HTML, CSS, and JavaScript with no frontend build step. Page-specific scripts call same-origin `/api/...` endpoints using the authentication cookie; keep their request and response contracts aligned with the endpoint handlers.
- `Data/UserStore.cs` and `Data/ShopStore.cs` implement SQL Server access. Their schema is maintained independently in `EDUFIX/EDUFIX.sqlproj` and `EDUFIX/Schema`. Application deployment does not publish database changes; review and apply schema changes separately.
- `EDUFIX/Schema/Users.sql` defines user accounts and the unique normalized-email index. `EDUFIX/Schema/UserInventory.sql` defines inventory with a foreign key to `Users`; preserve keys, constraints, and referential integrity.
- Netlify currently serves static browser assets only. The existing same-origin cookie authentication depends on the ASP.NET API, so keep frontend/API routing and cookie behavior in mind when a full-app host is selected.

## Repository-specific conventions

- Keep endpoint handlers grouped by feature in `AuthEndpoints`, `StudyEndpoints`, and `ShopEndpoints`; register new endpoint groups in `Program.cs`. Put SQL operations in the corresponding data store rather than in browser code or page handlers.
- Follow the existing C# conventions: nullable reference types and implicit usings are enabled; use focused feature modules, descriptive names, async I/O, and cancellation tokens for request-bound work. Keep browser assets modular and use the existing page-specific scripts and styles.
- Use `PascalCase` for C# types and public members, `camelCase` for local variables and parameters, and descriptive names consistent with nearby code. Keep functions focused and document only non-obvious behavior.
- SQL uses explicit `SqlCommand` statements and typed parameters. Preserve parameterization, async I/O, and request cancellation when adding database operations. Keep related multi-step shop updates transactional.
- Authentication is cookie-based and same-origin. Preserve the `HttpOnly`, `Secure`, and `SameSite=Strict` cookie settings, CSP, and authenticated authorization on private pages and APIs. Login, registration, and other designated authentication actions use the server-side rate-limit policy.
- Validate inputs at the endpoint boundary and return the existing problem/validation response shapes. Let the application exception handler log unexpected failures; do not silently swallow exceptions or expose internal details to users.
- Keep the API and UI response contracts aligned: browser scripts consume the JSON returned by endpoint handlers. User-facing interface text and API validation messages are in Portuguese.
- When changing persisted fields or constraints, update the SQL project schema as well as the data-store reads/writes. Preserve the Users and UserInventory keys, constraints, and foreign-key relationship. Do not treat a successful DACPAC build as a database deployment.
- Configure connection strings through environment or the selected host's secret configuration, never source files. Keep certificate validation enabled outside local development.

## Change and verification workflow

- Before editing, inspect the relevant files, their callers, and the current Git status. Preserve existing tracked and untracked work; never discard or overwrite user changes without authorization.
- Keep changes focused and compatible with the target framework and package versions declared in the existing project files. Do not upgrade or remove dependencies without a requirement.
- Before changing a file, inspect its callers, related API/UI contracts, schema dependencies, and the current Git diff.
- Run the API build for server or browser-asset changes, and build the SQL project when schema changes are involved. There is no test project or dedicated lint command; do not claim tests were run when they were not.
- Review the resulting diff for unintended changes. Do not commit unless asked, and never discard existing work.
