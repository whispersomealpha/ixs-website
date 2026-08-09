# IXS — Informational Website

A static, multi-page site covering what IXS is, how their Layer 0 API for RWA works, who's behind it, their partnerships, and $IXS tokenomics. Plain HTML/CSS/JS — no build step, no dependencies.

## Structure

```
ixs-website/
├── index.html            Home — hero, what is IXS, value prop, flow preview, partner logos
├── about.html             Founders/backers/advisors, journey timeline (2021–2026+)
├── how-it-works.html      Layer 0 API flow, 4-pronged buildout, Agentic Vaults
├── partnerships.html      Key partnerships, integrations, AI agent ecosystem, future rollout
├── tokenomics.html        $IXS tokenomics, why $IXS
├── css/styles.css         Shared design system (dark theme)
└── js/script.js           Mobile nav, scroll reveal, active-link highlighting, stat counters
```

## Run locally

No build tools needed — just serve the folder:

```bash
cd ixs-website
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy

### GitHub Pages
1. Push this folder's contents to a GitHub repo (root, or a `/docs` folder).
2. Repo Settings → Pages → set source to the branch/folder.
3. Done — no build step required.

### Railway
1. Push to GitHub, create a new Railway project from that repo.
2. Since this is static HTML, add a tiny static server. Easiest option — a one-line `package.json` + `serve`:
   ```json
   {
     "scripts": { "start": "npx serve -s . -l $PORT" }
   }
   ```
   Or use a `Procfile` / `railway.json` with a static buildpack (e.g. `nginx` or `serve`).
3. Railway auto-deploys on push once connected to the repo.

## Editing content

Facts are sourced from the IXS infographic (founders, timeline, partnerships, tokenomics) plus verification against ixs.finance. Colors, spacing, and components live in `css/styles.css` — update `:root` variables to retheme. Nav/footer markup is duplicated per page (no framework), so edits to nav links need to be repeated across all five HTML files.
