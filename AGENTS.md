# AGENTS.md

Nautilus — HPC monitoring site (Petrobras brief). Node 20 + Express 4 serving static HTML from `public/`, MySQL via `mysql2`. No build step, tests, linter, or CI. UI copy, comments, and commit messages are pt-BR; keep user-facing strings in Portuguese.

## Commands

```bash
npm install
npm start        # node app.js
npm run dev      # nodemon --exec node app.js
```

Docker: `docker compose -f docker/docker-compose.yml up -d --build` → `http://localhost:8080` (MySQL local `root`/`urubu100`). O compose mora em `docker/`, mas o build context é a raiz; não volte para `build: .`.

- `npm run devStart` is broken (`nodemon server.js`; no such file). Do not use it.
- No test runner. Verify changes by starting the server and calling the affected route; DB routes need a reachable MySQL.
- Port/host come only from `APP_PORT` / `APP_HOST`; there are no code defaults.

## Env and startup

- `.env` and `.env.dev` are gitignored. `app.js` loads `./.env` for `AMBIENTE_PROCESSO=producao`, `./.env.dev` otherwise. It reads the variable **before** dotenv runs, so to switch files it must be set in the shell: `$env:AMBIENTE_PROCESSO="desenvolvimento"; npm run dev`.
- `src/database/config.js` rejects every query unless `AMBIENTE_PROCESSO` is exactly `producao` or `desenvolvimento` in the loaded env file.
- Required env: `DB_HOST DB_DATABASE DB_USER DB_PASSWORD DB_PORT APP_PORT APP_HOST`; email uses `RESEND_API_KEY`.
- AWS/S3 vars are often absent locally: `BUCKET_NAME`, `AWS_REGION` (default `us-east-1`), `AWS_CREDENTIAL_SOURCE=database`, `AWS_CREDENTIAL_SYNC_ENABLED=true`, `CLUSTER_GOLD_PREFIX` (default `03-gold/gestor`), `S3_KEY` (chave completa do JSON da dashboard analista; default `03-gold/dashboard-categorica/dashboard.json`), `ANALISTA_GOLD_LOCAL_DIR` (analyst dashboard reads `cluster=<id>/dashboard.json` from disk instead of S3; for local testing), `DB_UTC_OFFSET` (default `-03:00`), and `AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/AWS_SESSION_TOKEN` (gestor dashboard only). Without `BUCKET_NAME`, S3 endpoints return `{ dados: null, aviso }` instead of failing.
- Schema lives only in `src/database/script-tabelas.sql`; no migrations or seeds. Apply manually to a fresh DB.

## Architecture

Request flow: `app.js` mounts routers (`src/routes`) → controllers (`src/controllers`) → models (`src/models`), with `src/services` for S3, email, and AWS credentials. Mounted prefixes: `/usuarios`, `/empresas`, `/auth`, `/hpc`, `/dashgestor`, `/dashcluster`, `/dashanalista`, `/alertas`.

- `src/database/config.js` exports only `executar(sql, params)` and opens a new connection per query. Do not call `query()` on it (see gotchas).
- Prefer `?` placeholders (`alertaModel`, `dashClusterModel` do this). `hpcModel` and parts of `usuarioModel` interpolate values into SQL strings; don't add new interpolation.
- `public/` is plain static HTML with one JS file per page; there is no template engine. Navbar/sidebar markup is copy-pasted in every dashboard HTML page — a nav change means editing each page.
- Web login uses `POST /usuarios/autenticar` (bcrypt) and stores the session client-side in `sessionStorage` (`ID_USUARIO`, `NOME_USUARIO`, `ID_EMPRESA`) via `public/js/login.js`; guards are `validarSessao()` / `protegerPagina()` in `sessao.js`. There are no server sessions or cookies.
- `/auth` and `/auth/credenciais` are a separate machine/node auth path (returns AWS credentials), not the web login.
- Data APIs trust query params: `/alertas?idUsuario=` and `/dashcluster/*?idUsuario=` authorize by that id, not by a server-side session.
- Registration resolves the company from the email domain (`empresa.dominio`), stores a 15-minute token, and emails via Resend. Email verification does not block login (the check is commented out in `usuarioController`).
- AWS session credentials are refreshed into the `aws_credentials` table by `awsCredentialsService`; `s3Service` uses them only when `AWS_CREDENTIAL_SOURCE=database`, otherwise the default AWS chain.

## Known gaps (don't assume these work)

- `src/routes/index.js` calls `res.render("index")` with no view engine, but static middleware serves `public/index.html` first. That router is effectively dead — don't copy its pattern.
- `dashGestorController.buscarDadosGold` calls `conexao.query(...)`, which `config.js` doesn't export; the error is swallowed and the dashboard silently falls back to zero KPIs.
- Relatórios page is unwired: `app.js` never mounts `src/routes/relatorios.js`, that router requires a missing `relatorioController`, and `relatorios.html` calls a GET where the router defines POST.
- Dashboards are partly mock data: `public/js/dashboard-gestor.js` has `USAR_DADOS_MOCKADOS = true`. `dashboard-cluster`, `dashboard-operador` and `dashboard-analista` call real APIs (`/dashcluster`, `/dashanalista`).
- `login.js` saves `ID_NIVEL_ACESSO` from `fk_nivel_acesso`, which `/usuarios/autenticar` does not return, so it is stored as `undefined`.

## Repo facts

- Default branch is `dev`; remote is `nautilus-hpc-monitoring/site-institucional`.
- `package.json` name is `web-data-viz`, not `nautilus`.
- `.gitignore` excludes `.env`, `.env.dev`, `package-lock.json`, and `.github`. Never commit real credentials or the AWS `s3Service` keys.
