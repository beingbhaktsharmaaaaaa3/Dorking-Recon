<div align="center">

# ReconQL

**A client-side recon console for the passive-recon phase of bug bounty and pentest work.**

![Vanilla JS](https://img.shields.io/badge/stack-vanilla%20JS-39C7B8?style=flat-square)
![No Build Step](https://img.shields.io/badge/build-none-8996A5?style=flat-square)
![Client Side Only](https://img.shields.io/badge/data-client--side%20only-39C7B8?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-E3A73B?style=flat-square)

</div>

## ⚡ Live Website

> **[🔗 View Live Website]()**

Turn one or more target domains into ready-to-run search-operator queries across 23 categories — plus a guided workflow, saved sessions, favorites, search history, GitHub advanced search, and one-click multi-format export. Everything runs in the browser: no backend, no build step, no dependencies beyond two Google Fonts. Progress is stored in `localStorage` — nothing is sent anywhere except the searches you choose to open.

---

## Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [How to Use](#how-to-use)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Query Reference](#query-reference)
- [Quick One-Liners](#quick-one-liners)
- [Search Templates](#search-templates)
- [GitHub Advanced Search](#github-advanced-search)
- [Findings Workspace](#findings-workspace)
- [Tool Launcher](#tool-launcher)
- [Recon Timeline & Assistant](#recon-timeline--assistant)
- [External Recon Tools](#external-recon-tools)
- [Custom Query Builder](#custom-query-builder)
- [Appearance & Themes](#appearance--themes)
- [Contributing](#contributing)
- [License](#license)
- [Project Structure](#project-structure)

---

## Features

| | |
|---|---|
| **23 recon categories** | Grouped into 6 phases — 91 preset queries total |
| **Multi-domain input** | Combined view across every target, or drill into one at a time |
| **3 search engines** | Google, Bing, DuckDuckGo, with date-range filtering (24h/week/month/year, custom range on Google) |
| **Recon Workflow** | A 12-step guided pass with clickable navigation, progress tracking, and a rough time estimate |
| **Recon Assistant** | "What's next" suggestions pulled from your saved workflow/checklist progress (rule-based, not a live scan) |
| **Search Templates** | 35 one-click presets (Secrets, Cloud, Auth, API) that pre-fill the builder |
| **GitHub Advanced Search** | Qualifier-based builder — `org:`, `repo:`, `filename:`, `language:`, `path:`, `size:`, `created:`, `pushed:`, plus commit search |
| **Tool Launcher** | Copy-ready CLI commands for subfinder, httpx, katana, gau, waybackurls, nuclei, ffuf, and more |
| **Custom Query Builder** | Full operator support incl. `AROUND()`, `before:`/`after:`, `cache:`, `related:`, with autocomplete suggestions |
| **Findings Workspace** | Log target/title/severity/status/tags/notes; export to Markdown, JSON, CSV, or a print-ready report |
| **Recon Timeline** | Auto-logged milestones — first category visit, workflow steps done, checklist ticks, findings added |
| **Favorites & History** | Star any query, preset or custom; last 50 opened searches, exportable |
| **Recent Targets** | Last 8 unique domains as one-click chips |
| **Saved Sessions** | Snapshot targets, progress, and favorites — save/rename/duplicate/import/export as JSON |
| **Command Palette** | `Ctrl+K` opens a searchable overlay across every category, panel, template, and tool |
| **Category runner** | Open the first 5, first 10, or all queries in a category at a configurable delay |
| **Recon Checklist** | A flat 19-item pass/fail list for a final review |
| **Advanced Export** | Copy, TXT, Markdown, JSON, CSV, or a styled HTML report |
| **19 external tools** | crt.sh, Shodan, Censys, Wayback Machine, VirusTotal, LeakIX, and more |
| **Dark / Light / System theme** | Plus a 4-color accent picker, contrast-adjusted per theme |
| **Keyboard shortcuts** | Filterable/collapsible sidebar, toast notifications throughout |

---

## Quick Start

No installation needed.

```bash
git clone https://github.com/<your-username>/reconql.git
cd reconql
open index.html   # or double-click it, or drag it into a browser tab
```

To host it instead, enable **GitHub Pages** (`Settings → Pages → Deploy from branch`) — it's static files, so any static host works with zero config.

---

## How to Use

1. **Enter targets** — one per line or comma-separated. Multiple domains show as removable chips with a combined/per-domain view toggle.
2. **Pick an engine and date range** — applies everywhere in the app.
3. **Browse categories** in the sidebar (filterable, or `Ctrl+K`). Dedicated panels cover Recon Workflow, Search Templates, GitHub Advanced Search, Recon Checklist, Favorites, Search History, Saved Sessions, and External Recon Tools.
4. **Work a category** — Copy or Open any query, star it, or use "Open first 5/10/all" to batch-open at a configurable delay (allow popups if your browser blocks extra tabs).
5. **Follow the Recon Workflow** for a suggested order; click a step to jump to it, tick the checkbox separately to mark it done.
6. **Use Search Templates or GitHub Advanced Search** to pre-fill the Custom Query Builder, then refine with the Advanced operators section.
7. **Save a session** any time — reload, duplicate, or export/import it as JSON later.
8. **Export** the full current query set from the Advanced Export bar.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + K` | Open the command palette (search categories, panels, templates, tools) |
| `Ctrl/Cmd + Enter` | Open the focused (or first) query in the current category |
| `Ctrl/Cmd + Shift + C` | Copy the focused (or first) query |
| `Ctrl/Cmd + S` | Quick-save the current session |
| `Ctrl/Cmd + /` or `?` | Toggle the shortcuts help panel |

---

## Query Reference

All examples use `example.com` — substitute your own target. Queries scoped to GitHub or Pastebin use a quoted domain mention instead of `site:`, since those hosts aren't part of the target's own site.

<details>
<summary><strong>Attack Surface Discovery</strong></summary>

| Category | Query | Purpose |
|---|---|---|
| Subdomain & Asset Mapping | `site:*.example.com -site:www.example.com` | Wildcard subdomain sweep |
| Subdomain & Asset Mapping | `site:example.com (inurl:dev OR inurl:staging OR inurl:test OR inurl:uat OR inurl:qa OR inurl:sandbox)` | Non-production environments |
| Subdomain & Asset Mapping | `site:example.com (inurl:admin OR inurl:internal OR inurl:portal OR inurl:vpn OR inurl:intranet)` | Internal-facing panels |
| Subdomain & Asset Mapping | `site:example.com intitle:"index of"` | Open directory listings |
| Git & Version Control Exposure | `site:example.com inurl:.git intitle:"index of"` | Exposed `.git` directory listing |
| Git & Version Control Exposure | `site:example.com inurl:".git/config"` | `.git/config` disclosure |
| Git & Version Control Exposure | `site:example.com inurl:.svn/entries` | Subversion metadata |
| Git & Version Control Exposure | `site:example.com (inurl:.hg OR inurl:.bzr) intitle:"index of"` | Mercurial / Bazaar remnants |
| CI/CD & Deployment Artifacts | `site:example.com (inurl:.gitlab-ci.yml OR inurl:.travis.yml OR inurl:Jenkinsfile OR inurl:.circleci)` | CI pipeline configs |
| CI/CD & Deployment Artifacts | `site:github.com "example.com" filetype:yml inurl:.github/workflows intext:secrets.` | GitHub Actions workflow secrets |
| CI/CD & Deployment Artifacts | `site:example.com (filetype:yml OR filetype:dockerfile) intext:"docker-compose" intext:password` | Dockerfile / compose leaks |
| CI/CD & Deployment Artifacts | `site:example.com (filetype:sh OR filetype:ps1) intext:password` | Deployment shell scripts |
| Scope & Policy Recon | `site:example.com inurl:security.txt` | Program disclosure policy |
| Scope & Policy Recon | `site:example.com inurl:robots.txt` | Robots.txt disallow hints |
| Scope & Policy Recon | `site:example.com inurl:.well-known` | `.well-known` paths |

</details>

<details>
<summary><strong>Credentials & Secrets</strong></summary>

| Category | Query | Purpose |
|---|---|---|
| Sensitive Config & Environment Files | `site:example.com filetype:env (intext:DB_PASSWORD OR intext:API_KEY OR intext:SECRET_KEY) -intext:example -intext:sample` | Dotenv leaks |
| Sensitive Config & Environment Files | `site:example.com (filetype:yml OR filetype:yaml OR filetype:conf OR filetype:ini) intext:password -intext:example` | YAML / conf secrets |
| Sensitive Config & Environment Files | `site:example.com filetype:json (intext:aws_secret_access_key OR intext:private_key_id)` | Cloud credential JSON |
| Sensitive Config & Environment Files | `site:example.com filetype:properties intext:password` | Application properties |
| Credentials & Keys on Code Hosts | `site:github.com "example.com" (intext:api_key OR intext:secret OR intext:access_token) -intext:example -intext:sample -intext:test` | GitHub key/token mentions |
| Credentials & Keys on Code Hosts | `site:raw.githubusercontent.com "example.com" (filetype:env OR filetype:json OR filetype:yaml) (intext:api_key OR intext:secret) -intext:sample -intext:test` | Raw GitHub content secrets |
| Credentials & Keys on Code Hosts | `"example.com" filetype:pem intext:"PRIVATE KEY"` | Exposed private keys |
| Credentials & Keys on Code Hosts | `site:pastebin.com "example.com" (intext:password OR intext:api_key OR intext:leaked)` | Pastebin credential drops |
| JavaScript File & Endpoint Disclosure | `site:example.com filetype:js (intext:"/api/" OR intext:"/v1/" OR intext:"/v2/" OR intext:"/graphql")` | Hardcoded endpoints in JS |
| JavaScript File & Endpoint Disclosure | `site:example.com filetype:js (intext:apikey OR intext:api_key OR intext:"Authorization: Bearer")` | Keys inside JS bundles |
| JavaScript File & Endpoint Disclosure | `site:example.com filetype:js intext:"firebaseio.com" intext:apiKey` | Firebase config disclosure |
| JavaScript File & Endpoint Disclosure | `site:example.com filetype:map intext:sourcesContent` | Exposed source maps |
| JavaScript File & Endpoint Disclosure | `site:example.com filetype:js (intext:"fetch(" OR intext:"axios." OR intext:"XMLHttpRequest")` | HTTP client call patterns |
| JavaScript File & Endpoint Disclosure | `site:example.com filetype:js (intext:"client_secret" OR intext:"Authorization" OR intext:"Bearer ")` | Auth headers & secrets in JS |
| JavaScript File & Endpoint Disclosure | `site:example.com filetype:js (intext:"socket.io" OR intext:"websocket" OR intext:"wss://")` | Realtime / socket endpoints |
| JavaScript File & Endpoint Disclosure | `site:example.com filetype:js (intext:"graphql" OR intext:"swagger" OR intext:"openapi")` | GraphQL / Swagger refs in JS |
| Third-Party Service Tokens | `site:example.com (intext:stripe OR intext:twilio OR intext:sendgrid OR intext:mailgun) intext:key -intext:example` | Payment / comms provider keys |
| Third-Party Service Tokens | `"example.com" (intext:"hooks.slack.com" OR intext:"discord.com/api/webhooks")` | Slack / Discord webhooks |
| Third-Party Service Tokens | `site:example.com (intext:mapbox OR intext:algolia OR intext:AIzaSy) intext:key` | Maps / search widget keys |
| Hidden Files & Lockfiles | `site:example.com (inurl:.env.dev OR inurl:.env.local OR inurl:.env.production OR inurl:.env.staging)` | Environment file variants |
| Hidden Files & Lockfiles | `site:example.com (inurl:.gitignore OR inurl:.npmrc OR inurl:.editorconfig OR inurl:.dockerignore)` | Ignore & tooling configs |
| Hidden Files & Lockfiles | `site:example.com (inurl:composer.lock OR inurl:package-lock.json OR inurl:yarn.lock OR inurl:pnpm-lock.yaml)` | Dependency lockfiles |
| Hidden Files & Lockfiles | `site:example.com (inurl:backup.sql OR inurl:database.sql OR inurl:dump.sql)` | Ad-hoc SQL dump filenames |

</details>

<details>
<summary><strong>Data Exposure</strong></summary>

| Category | Query | Purpose |
|---|---|---|
| Database Dumps & SQL Exposure | `site:example.com (filetype:sql OR filetype:dump) (intext:"INSERT INTO" OR intext:password) -intext:sample -intext:test` | SQL dump / insert statements |
| Database Dumps & SQL Exposure | `"example.com" filetype:sql intext:DB_PASSWORD` | DB password strings |
| Database Dumps & SQL Exposure | `site:example.com filetype:json intext:_id intext:ObjectId` | MongoDB-style export leaks |
| Backup & Legacy Files | `site:example.com (filetype:zip OR filetype:tar OR filetype:gz OR filetype:rar OR filetype:bak OR filetype:old)` | Archived backups |
| Backup & Legacy Files | `site:example.com (filetype:swp OR filetype:tmp OR inurl:~)` | Editor swap / temp files |
| Backup & Legacy Files | `site:example.com (inurl:.DS_Store OR inurl:.htpasswd OR inurl:.htaccess)` | Hidden system files |
| Backup & Legacy Files | `site:example.com inurl:web.config intext:connectionString` | Legacy `web.config` exposure |
| Cloud Storage Buckets | `site:s3.amazonaws.com "example.com"` | S3 bucket mentions |
| Cloud Storage Buckets | `intitle:"index of" "example.com" (inurl:storage.googleapis.com OR inurl:blob.core.windows.net)` | Open storage listings |
| Cloud Storage Buckets | `site:example.com (inurl:s3.amazonaws.com OR inurl:storage.googleapis.com OR inurl:blob.core.windows.net)` | Bucket hostnames in-site |
| Cloud Storage Buckets | `"example.com" inurl:digitaloceanspaces.com` | DigitalOcean Spaces |
| Cloud Storage Buckets | `"example.com" inurl:r2.cloudflarestorage.com` | Cloudflare R2 |
| Cloud Storage Buckets | `"example.com" inurl:oraclecloud.com intext:objectstorage` | Oracle Cloud Object Storage |
| Cloud Storage Buckets | `"example.com" inurl:backblazeb2.com` | Backblaze B2 |
| Cloud Storage Buckets | `"example.com" inurl:aliyuncs.com` | Alibaba OSS |
| Cloud Storage Buckets | `site:example.com intext:"MinIO" inurl:console` | MinIO consoles |
| Cloud Storage Buckets | `"example.com" inurl:linodeobjects.com` | Linode Object Storage |
| PII & Sensitive Records | `site:example.com (filetype:csv OR filetype:xls OR filetype:docx) (intext:email OR intext:ssn OR intext:"credit card") -intext:sample -intext:example -intext:demo` | Personal data spreadsheets |
| PII & Sensitive Records | `site:example.com filetype:pdf (intext:"date of birth" OR intext:passport OR intext:ssn)` | Identity documents |
| Confidential Documents & Compliance | `site:example.com (filetype:pdf OR filetype:doc OR filetype:xls) (intext:confidential OR intext:"internal use only")` | Marked-confidential files |
| Confidential Documents & Compliance | `site:example.com (intext:GDPR OR intext:HIPAA OR intext:"data breach")` | Compliance / breach language |

</details>

<details>
<summary><strong>Access & API Surfaces</strong></summary>

| Category | Query | Purpose |
|---|---|---|
| Admin Panels & Login Portals | `site:example.com intitle:login (inurl:admin OR inurl:portal OR inurl:cpanel OR inurl:wp-admin)` | Login pages on known panels |
| Admin Panels & Login Portals | `site:example.com inurl:phpmyadmin` | phpMyAdmin instances |
| Admin Panels & Login Portals | `site:example.com intitle:"dashboard" inurl:admin` | Admin dashboards |
| DevOps & Monitoring Dashboards | `site:example.com intitle:"Dashboard [Jenkins]"` | Jenkins panels |
| DevOps & Monitoring Dashboards | `site:example.com (intitle:Grafana OR intitle:Kibana)` | Grafana / Kibana instances |
| DevOps & Monitoring Dashboards | `site:example.com intitle:"Prometheus Time Series"` | Prometheus targets |
| DevOps & Monitoring Dashboards | `site:example.com intitle:Portainer` | Portainer / container managers |
| API Surface & Parameters | `site:example.com inurl:/api/ (inurl:v1 OR inurl:v2 OR inurl:graphql)` | Versioned / GraphQL endpoints |
| API Surface & Parameters | `site:example.com filetype:json (intext:swagger OR intext:openapi)` | Swagger / OpenAPI specs |
| API Surface & Parameters | `site:example.com (inurl:swagger-ui OR inurl:api-docs OR inurl:redoc)` | API documentation UIs |
| API Surface & Parameters | `site:example.com inurl:? (intext:id= OR intext:token= OR intext:redirect= OR intext:callback= OR intext:debug=)` | Common vulnerable parameters |
| API Surface & Parameters | `site:example.com (filetype:json intext:postman_collection OR inurl:insomnia)` | Postman / Insomnia collections |
| API Surface & Parameters | `site:example.com (inurl:graphql-playground OR inurl:graphiql)` | GraphQL dev consoles |

</details>

<details>
<summary><strong>Mobile & App Footprint</strong></summary>

| Category | Query | Purpose |
|---|---|---|
| Mobile & App Footprint | `site:play.google.com "example.com"` | Play Store presence |
| Mobile & App Footprint | `site:apps.apple.com "example.com"` | App Store presence |
| Mobile & App Footprint | `site:example.com inurl:.well-known/assetlinks.json` | Android App Links verification |
| Mobile & App Footprint | `site:example.com inurl:.well-known/apple-app-site-association` | iOS Universal Links verification |
| Mobile & App Footprint | `site:example.com (intext:"deeplink" OR intext:"universal link" OR intext:"custom URL scheme")` | Deep link / scheme mentions |
| Mobile & App Footprint | `site:example.com filetype:apk` | Indexed APK artifacts |

</details>

<details>
<summary><strong>Signals & Fingerprinting</strong></summary>

| Category | Query | Purpose |
|---|---|---|
| Errors, Debug Output & Stack Traces | `site:example.com (intext:"stack trace" OR intext:"unhandled exception" OR intext:"fatal error")` | Stack traces / fatal errors |
| Errors, Debug Output & Stack Traces | `site:example.com (intext:"Warning: mysql_" OR intext:"ORA-01756" OR intext:"Microsoft OLE DB Provider")` | DB driver errors |
| Errors, Debug Output & Stack Traces | `site:example.com (intext:"debug mode" OR intext:"X-Debug-Token")` | Debug mode indicators |
| CMS & Tech Fingerprint | `site:example.com (inurl:wp-content OR inurl:wp-includes)` | WordPress structure |
| CMS & Tech Fingerprint | `site:example.com intext:"Powered by" (WordPress OR Joomla OR Drupal OR Magento)` | CMS footer credit |
| CMS & Tech Fingerprint | `site:example.com filetype:xml inurl:sitemap` | Sitemaps |
| Web3 & Wallet Exposure | `"example.com" (intext:privateKey OR intext:seedPhrase OR intext:mnemonic) (filetype:js OR filetype:json OR filetype:sol)` | Private key / seed phrase mentions |
| Web3 & Wallet Exposure | `site:github.com "example.com" filetype:sol intext:"pragma solidity"` | Solidity contracts on GitHub |
| Web3 & Wallet Exposure | `"example.com" filetype:json intext:mnemonic` | Mnemonic in JSON |
| AI/ML Artifact Leaks | `"example.com" (filetype:ipynb OR filetype:h5 OR filetype:pth) intext:api_key` | Notebooks / model files with keys |
| AI/ML Artifact Leaks | `site:raw.githubusercontent.com "example.com" filetype:ipynb intext:api_key` | Raw GitHub notebooks |
| People & Social Footprint | `site:linkedin.com/in "example.com"` | Employee LinkedIn profiles |
| People & Social Footprint | `site:pastebin.com "example.com" (intext:leaked OR intext:combolist)` | Combolist / leak mentions |

</details>

---

## Quick One-Liners

Combined-filetype queries for a fast first pass:

```
Config & credential files:
site:example.com (filetype:env OR filetype:yml OR filetype:yaml OR filetype:json OR filetype:conf OR filetype:ini OR filetype:properties) (intext:password OR intext:api_key OR intext:secret) -intext:example -intext:sample

Database & backup files:
site:example.com (filetype:sql OR filetype:dump OR filetype:bak OR filetype:zip OR filetype:tar OR filetype:gz OR filetype:rar OR filetype:old)

Documents with sensitive data:
site:example.com (filetype:pdf OR filetype:doc OR filetype:docx OR filetype:xls OR filetype:csv) (intext:confidential OR intext:email OR intext:ssn)

Exposed panels & dashboards:
site:example.com (inurl:admin OR inurl:phpmyadmin OR inurl:cpanel OR inurl:wp-admin OR intitle:Jenkins OR intitle:Grafana OR intitle:Kibana)

Version-control leftovers:
site:example.com (inurl:.git OR inurl:.svn OR inurl:.hg OR inurl:.bzr) intitle:"index of"

API surface:
site:example.com (inurl:/api/ OR inurl:swagger-ui OR inurl:graphql OR (filetype:json intext:openapi))
```

---

## Search Templates

One-click presets that populate the Custom Query Builder. See `TEMPLATES` in `js/data.js` for the exact fields behind each.

| Group | Templates |
|---|---|
| **Secrets** | AWS Keys · Azure Keys · GCP Keys · Firebase · Stripe · Slack · Twilio · JWT · OAuth · Bearer Tokens · API Keys · Passwords · Private Keys |
| **Cloud** | AWS S3 · Azure Blob · GCP Storage · DigitalOcean Spaces · Cloudflare R2 · Oracle Cloud · Backblaze B2 · Alibaba OSS · MinIO |
| **Authentication** | OAuth · OpenID · JWT · SAML · Login · Password Reset · MFA |
| **API** | REST · GraphQL · Swagger · OpenAPI · Redoc · Postman Collections |

---

## GitHub Advanced Search

A dedicated builder using GitHub's own search qualifiers instead of Google's `site:` operator:

- **Code search:** `org:` `repo:` `user:` `filename:` `extension:` `language:` `path:` `size:` `created:` `pushed:` `fork:` (`true`/`false`/`only`) `archived:` (`true`/`false`)
- **Commit search:** `org:` `repo:` `user:` `author:` `committer:` `hash:` `merge:` (`true`/`false`)

Both share one form — fill in whichever fields apply, then use "Open in Code Search" or "Open in Commit Search."

---

---

## Findings Workspace

Log what you find as you go instead of juggling a separate notes doc.

Each finding tracks: **target**, **title**, **severity** (`Info` / `Low` / `Medium` / `High` / `Critical`), **status** (`Open` / `Confirmed` / `Duplicate` / `Not Applicable` / `Reported` / `Resolved`), **tags**, and free-text **notes**. Everything persists in `localStorage`.

Export the full list as:

| Format | What you get |
|---|---|
| **Markdown** | A `.md` writeup, one section per finding |
| **JSON** | Raw structured data, for feeding into other tooling |
| **CSV** | Spreadsheet-ready rows |
| **PDF (print)** | Opens a formatted report in a new tab and triggers your browser's print dialog — choose "Save as PDF" there |

---

## Tool Launcher

Copy-ready CLI commands for standard recon tools, each using that tool's own documented default usage with your current target substituted in:

`subfinder` · `assetfinder` · `httpx` · `katana` · `gau` · `waybackurls` · `nuclei` · `ffuf`

Burp Suite is listed separately as a manual step (add the target to Target → Scope) since it's a GUI tool with no direct CLI equivalent. Nothing runs from the browser — commands are meant to be pasted into your own terminal.

---

## Recon Timeline & Assistant

**Recon Timeline** auto-logs milestones as you work: the first time you visit each category, workflow steps you mark done, checklist items you tick, and findings you add. It's separate from Search History, which logs every individual query you open — the Timeline is for the higher-level "what happened when" view, useful on longer engagements.

**Recon Assistant** reads your saved workflow and checklist progress and suggests the next 2–3 things worth doing, with a one-click jump to each. This is rule-based, not a live scan — it can't fetch or fingerprint your target from a static page. For real tech-stack detection, use `httpx -tech-detect` from the Tool Launcher or BuiltWith from External Recon Tools.

---

## External Recon Tools

| Tool | What it's for | Login needed? |
|---|---|:---:|
| [crt.sh](https://crt.sh) | Historical/current subdomains from issued TLS certificates | No |
| [Wayback Machine](https://web.archive.org) | Archived URLs and old endpoints | No |
| [Shodan](https://www.shodan.io) | Exposed services and banners | No |
| [urlscan.io](https://urlscan.io) | Crawled page snapshots and related infrastructure | No |
| [VirusTotal](https://www.virustotal.com) | Passive DNS and community observations | No |
| [BuiltWith](https://builtwith.com) | Technology and vendor fingerprint | No |
| [PublicWWW](https://publicwww.com) | Source-code search across indexed sites | No |
| [Censys](https://search.censys.io) | Host and certificate search | Yes |
| [SecurityTrails](https://securitytrails.com) | Historical DNS records | Yes |
| [FOFA](https://fofa.info) | Asset search engine | Yes |
| [Netlas](https://app.netlas.io) | Internet-wide host/domain scan search | Yes |
| [LeakIX](https://leakix.net) | Indexed leaks and exposed services | No |
| [Hunter.io](https://hunter.io) | Email address discovery | Yes |
| [Intelligence X](https://intelx.io) | Search across leaks, pastes, darknet-adjacent sources | Yes |
| [DNSDumpster](https://dnsdumpster.com) | DNS recon and network mapping | No |
| [grep.app](https://grep.app) | Regex source-code search across GitHub | No |
| [searchcode](https://searchcode.com) | Source-code search across many hosts | No |
| [ViewDNS](https://viewdns.info) | Reverse IP lookup | No |
| [AlienVault OTX](https://otx.alienvault.com) | Threat-intel pulses and indicators | No |

---

## Custom Query Builder

| Field | What it does |
|---|---|
| **Scope** | Target domain(s), `github.com`, `raw.githubusercontent.com`, `pastebin.com`, or no site restriction |
| **File types** | Toggle chips to OR together `filetype:` operators |
| **Must contain — any** | Comma-separated terms, OR'd as `intext:` |
| **Must contain — all (AND)** | Comma-separated terms, each added individually |
| **Exclude** | Comma-separated terms, each added as `-intext:` |
| **URL contains** | Comma-separated terms OR'd as `inurl:` |
| **Title contains** | Comma-separated terms OR'd as `intitle:` |
| **Advanced → Proximity** | Two terms + a distance → `"A" AROUND(N) "B"` |
| **Advanced → Before/After date** | `before:YYYY-MM-DD` / `after:YYYY-MM-DD` |
| **Advanced → Cache URL** | `cache:URL` |
| **Advanced → Related domain** | `related:domain` |

The assembled query updates live and respects the current domain view, engine, and date filter. The "Must contain," "URL contains," and "Title contains" fields also offer autocomplete suggestions (native browser dropdown) for common keywords.

---

---

## Appearance & Themes

Toggle **Dark / Light / System** from the top bar. "System" follows your OS preference and updates live if you change it while the tab is open.

Pick from 4 accent colors (teal, amber, violet, rose) — light mode automatically uses darker, more saturated versions of each so text stays readable on a white background rather than reusing the dark-mode hex values as-is. Both choices persist across reloads.

---

## Contributing

- **New dork category or query:** add to `CATEGORIES` in `js/data.js`, then add the `id` to a group in `GROUPS`.
- **New search template:** add to the relevant array in `TEMPLATES`.
- **New external tool:** add to `EXTERNAL_TOOLS` with a `url(d)` function; set `login: true` if an account is required.
- **New workflow step or checklist item:** add to `WORKFLOW_STEPS` or `CHECKLIST_ITEMS`.

Each `CATEGORIES` entry follows:

```js
{ id:'unique-id', num:'24', title:'Category Title', signal:'high|med|low',
  note:'One-line description shown under the title.',
  dorks:[
    { t:'Query name', q: c => `${c.site} filetype:xyz intext:something` },
  ]}
```

`c` gives you `c.site` (site scope), `c.wild` (wildcard subdomain clause), `c.mention` (quoted domain, for GitHub/Pastebin-style dorks), `c.first`, and `c.n`.

PRs adding categories, fixing broken operators, or improving the builder are welcome.

---

## License

MIT — see [LICENSE](LICENSE). Update the copyright line with your name before publishing.

---

## Project Structure

```
reconql/
├── index.html          # markup shell
├── css/
│   └── style.css        # entire visual theme
└── js/
    ├── data.js          # categories, groups, templates, tools, workflow, checklist — no logic
    ├── utils.js          # pure helpers: query clauses, engine URLs, date filters, exports
    ├── storage.js        # localStorage read/write
    ├── render.js         # all DOM rendering + feature actions
    └── app.js            # global state, event wiring, keyboard shortcuts, init
```

Scripts load as plain `<script src>` tags rather than ES modules, specifically so the project still works when you just double-click `index.html` — no local server required, no CORS issues with `file://`.

**Tech stack:** vanilla HTML/CSS/JS, no framework, no build step. Fonts from Google Fonts CDN (`Inter`, `JetBrains Mono`) with system-font fallback. All persistence lives under one `localStorage` key (`reconql_state_v1`) — favorites, history, workflow progress, checklist, sessions, and sidebar-collapse state. No analytics, no network calls other than the search engine or tool you open.
