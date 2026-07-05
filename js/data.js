/* ==========================================================================
   ReconQL — data.js
   Static data: dork categories, sidebar groups, external tools, builder
   templates, workflow steps, checklist items. No logic lives here.
   ========================================================================== */

const DEFAULT_TARGET = 'example.com';

/* ---------- Dork categories (grouped by recon phase in GROUPS below) ---------- */
/* Each dork's q(ctx) receives a context object with:
     ctx.site    -> site:target or (site:d1 OR site:d2 ...)
     ctx.wild    -> wildcard subdomain clause with www exclusion
     ctx.mention -> "target" or ("d1" OR "d2" ...)
     ctx.first   -> first target string
     ctx.n       -> number of targets in scope                              */
const CATEGORIES = [
  { id:'subdomains', num:'01', title:'Subdomain & Asset Mapping', signal:'high', tags:['Subdomains'],
    note:'Surface indexed subdomains and non-production environments first — this defines the rest of the scope.',
    falsePositives:'Marketing landing pages under /dev/ or /test/ in their URL path, not an actual dev environment.',
    dorks:[
      { t:'Wildcard subdomain sweep', desc:'Every indexed subdomain except www — the fastest way to see what Google already knows about.', q: c => c.wild },
      { t:'Non-production environments', desc:'Staging, QA, and sandbox hosts that are often less hardened than production.', q: c => `${c.site} (inurl:dev OR inurl:staging OR inurl:test OR inurl:uat OR inurl:qa OR inurl:sandbox)` },
      { t:'Internal-facing panels', desc:'Hostnames suggesting internal tooling that shouldn\u2019t be publicly reachable at all.', q: c => `${c.site} (inurl:admin OR inurl:internal OR inurl:portal OR inurl:vpn OR inurl:intranet)` },
      { t:'Open directory listings', desc:'Folders with no index page, so the web server lists every file inside instead.', q: c => `${c.site} intitle:"index of"` },
    ]},
  { id:'git', num:'02', title:'Git & Version Control Exposure', signal:'high', tags:['Source Code'],
    note:'Exposed .git/.svn directories often hand over full source history.',
    falsePositives:'Public open-source mirrors of the same codebase hosted intentionally, or tutorial repos using the target\u2019s name as an example.',
    dorks:[
      { t:'Exposed .git directory listing', desc:'A browsable .git folder means the entire commit history — including old secrets — is downloadable.', q: c => `${c.site} inurl:.git intitle:"index of"` },
      { t:'.git/config disclosure', desc:'This file alone often reveals remote repo URLs and sometimes embedded credentials.', q: c => `${c.site} inurl:".git/config"` },
      { t:'Subversion metadata', desc:'Legacy SVN working-copy metadata left on a web root.', q: c => `${c.site} inurl:.svn/entries` },
      { t:'Mercurial / Bazaar remnants', desc:'Less common VCS leftovers, worth a quick check on older codebases.', q: c => `${c.site} (inurl:.hg OR inurl:.bzr) intitle:"index of"` },
    ]},
  { id:'cicd', num:'03', title:'CI/CD & Deployment Artifacts', signal:'med', tags:['CI/CD','Secrets'],
    note:'Pipeline configs and deploy scripts frequently carry secrets meant only for build-time.',
    falsePositives:'Public example/template pipeline files from tutorials or boilerplate repos, not the target\u2019s real deployment.',
    dorks:[
      { t:'CI pipeline configs', desc:'Pipeline definition files that can reveal build steps, internal hostnames, and env var names.', q: c => `${c.site} (inurl:.gitlab-ci.yml OR inurl:.travis.yml OR inurl:Jenkinsfile OR inurl:.circleci)` },
      { t:'GitHub Actions workflow secrets', desc:'Workflow YAML that references secrets — doesn\u2019t leak the value, but confirms what\u2019s wired up.', q: c => `site:github.com ${c.mention} filetype:yml inurl:.github/workflows intext:secrets.`, gh:true },
      { t:'Dockerfile / compose leaks', desc:'Compose files sometimes hardcode passwords meant to come from environment variables instead.', q: c => `${c.site} (filetype:yml OR filetype:dockerfile) intext:"docker-compose" intext:password` },
      { t:'Deployment shell scripts', desc:'Shell/PowerShell scripts that push to servers often embed credentials inline.', q: c => `${c.site} (filetype:sh OR filetype:ps1) intext:password` },
    ]},
  { id:'scope', num:'04', title:'Scope & Policy Recon', signal:'high', tags:['Scope'],
    note:'Program-defined scope, contact routes, and crawler hints — check before anything else in-scope.',
    falsePositives:'Low — these are single, well-defined files. A missing result usually just means the file doesn\u2019t exist.',
    dorks:[
      { t:'security.txt disclosure policy', desc:'The program\u2019s own disclosure contact and, often, an explicit scope statement.', q: c => `${c.site} inurl:security.txt` },
      { t:'robots.txt disallow hints', desc:'Disallowed paths are a hint about what the site owner considers sensitive or unfinished.', q: c => `${c.site} inurl:robots.txt` },
      { t:'.well-known paths', desc:'A grab-bag of standardized metadata files — security policy, app-link verification, and more.', q: c => `${c.site} inurl:.well-known` },
    ]},
  { id:'config', num:'05', title:'Sensitive Config & Environment Files', signal:'high', tags:['Secrets','Config'],
    note:'.env, YAML, and properties files that commonly ship credentials by accident.',
    falsePositives:'Public .env.example / .env.sample templates with placeholder values instead of real secrets.',
    dorks:[
      { t:'Dotenv leaks', desc:'Classic misconfiguration — a live .env file with real database and API credentials in it.', q: c => `${c.site} filetype:env (intext:DB_PASSWORD OR intext:API_KEY OR intext:SECRET_KEY) -intext:example -intext:sample` },
      { t:'YAML / conf secrets', desc:'Broader config-file sweep across formats that commonly hold plaintext passwords.', q: c => `${c.site} (filetype:yml OR filetype:yaml OR filetype:conf OR filetype:ini) intext:password -intext:example` },
      { t:'Cloud credential JSON', desc:'JSON key files for AWS or GCP service accounts — full programmatic account access if real.', q: c => `${c.site} filetype:json (intext:aws_secret_access_key OR intext:private_key_id)` },
      { t:'Application properties', desc:'Java-style .properties files, a common place for embedded DB passwords.', q: c => `${c.site} filetype:properties intext:password` },
    ]},
  { id:'codehost', num:'06', title:'Credentials & Keys on Code Hosts', signal:'high', tags:['Secrets','Source Code'],
    note:'Keys and tokens committed to public repos, gists, or paste sites.',
    falsePositives:'Documentation examples, revoked/rotated test keys left in old commits, and other people\u2019s code that merely mentions the target\u2019s name.',
    dorks:[
      { t:'GitHub key/token mentions', desc:'Direct search for the target\u2019s name alongside common secret variable names on GitHub.', q: c => `site:github.com ${c.mention} (intext:api_key OR intext:secret OR intext:access_token) -intext:example -intext:sample -intext:test`, gh:true },
      { t:'Raw GitHub content secrets', desc:'Same idea but scoped to raw file content rather than GitHub\u2019s rendered UI.', q: c => `site:raw.githubusercontent.com ${c.mention} (filetype:env OR filetype:json OR filetype:yaml) (intext:api_key OR intext:secret) -intext:sample -intext:test`, gh:true },
      { t:'Exposed private keys', desc:'A literal PEM private-key header is a strong, low-noise signal when it appears at all.', q: c => `${c.mention} filetype:pem intext:"PRIVATE KEY"` },
      { t:'Pastebin credential drops', desc:'Paste sites are a common dumping ground for leaked credential lists.', q: c => `site:pastebin.com ${c.mention} (intext:password OR intext:api_key OR intext:leaked)` },
    ]},
  { id:'jsfiles', num:'07', title:'JavaScript File & Endpoint Disclosure', signal:'high', tags:['Source Code','API'],
    note:'Bundled JS regularly reveals hidden API routes, internal hostnames, and hardcoded keys.',
    falsePositives:'Third-party analytics/ad SDK bundles that happen to reference similar-looking strings but aren\u2019t the target\u2019s own code.',
    dorks:[
      { t:'Hardcoded endpoints in JS', desc:'Client-side bundles often reference API paths that never made it into any public documentation.', q: c => `${c.site} filetype:js (intext:"/api/" OR intext:"/v1/" OR intext:"/v2/" OR intext:"/graphql")` },
      { t:'Keys inside JS bundles', desc:'Frontend code that should call a backend proxy sometimes embeds the API key directly instead.', q: c => `${c.site} filetype:js (intext:apikey OR intext:api_key OR intext:"Authorization: Bearer")` },
      { t:'Firebase config disclosure', desc:'Firebase web configs are meant to be public-ish, but the accompanying API key scope is worth checking.', q: c => `${c.site} filetype:js intext:"firebaseio.com" intext:apiKey` },
      { t:'Exposed source maps', desc:'A .map file un-minifies the bundle, turning obfuscated code back into readable source.', q: c => `${c.site} filetype:map intext:sourcesContent` },
      { t:'HTTP client call patterns', desc:'Finds JS that actually makes network calls, as a starting point for endpoint discovery.', q: c => `${c.site} filetype:js (intext:"fetch(" OR intext:"axios." OR intext:"XMLHttpRequest")` },
      { t:'Auth headers & secrets in JS', desc:'Looks specifically for how the frontend attaches authorization to its requests.', q: c => `${c.site} filetype:js (intext:"client_secret" OR intext:"Authorization" OR intext:"Bearer ")` },
      { t:'Realtime / socket endpoints', desc:'WebSocket URLs are rarely documented and often skipped during API review.', q: c => `${c.site} filetype:js (intext:"socket.io" OR intext:"websocket" OR intext:"wss://")` },
      { t:'GraphQL / Swagger refs in JS', desc:'Frontend references to a schema or spec endpoint that may not be linked anywhere else.', q: c => `${c.site} filetype:js (intext:"graphql" OR intext:"swagger" OR intext:"openapi")` },
    ]},
  { id:'thirdparty', num:'08', title:'Third-Party Service Tokens', signal:'med', tags:['Secrets'],
    note:'Payment, messaging, and analytics providers whose keys leak through client code.',
    falsePositives:'Publishable/public keys that are meant to be client-visible by design (e.g. Stripe\u2019s pk_live is not secret).',
    dorks:[
      { t:'Payment / comms provider keys', desc:'Looks for provider names next to the word "key" — check whether it\u2019s a secret key or an intentionally public one.', q: c => `${c.site} (intext:stripe OR intext:twilio OR intext:sendgrid OR intext:mailgun) intext:key -intext:example` },
      { t:'Slack / Discord webhooks', desc:'A live webhook URL lets anyone post messages into the target\u2019s workspace.', q: c => `${c.mention} (intext:"hooks.slack.com" OR intext:"discord.com/api/webhooks")` },
      { t:'Maps / search widget keys', desc:'Third-party widget keys that are sometimes unrestricted by domain, allowing quota abuse.', q: c => `${c.site} (intext:mapbox OR intext:algolia OR intext:AIzaSy) intext:key` },
    ]},
  { id:'hiddenfiles', num:'22', title:'Hidden Files & Lockfiles', signal:'med', tags:['Config','Backups'],
    note:'Environment variants, tooling configs, and dependency lockfiles that leak paths and sometimes secrets.',
    falsePositives:'Lockfiles are often intentionally committed to public repos (that\u2019s normal) — only worth flagging when found on a live web server, not in source control.',
    dorks:[
      { t:'Environment file variants', desc:'Teams often forget the non-default .env variants when locking down the main one.', q: c => `${c.site} (inurl:.env.dev OR inurl:.env.local OR inurl:.env.production OR inurl:.env.staging)` },
      { t:'Ignore & tooling configs', desc:'Reveals what the project explicitly wanted hidden, and how the dev environment is set up.', q: c => `${c.site} (inurl:.gitignore OR inurl:.npmrc OR inurl:.editorconfig OR inurl:.dockerignore)` },
      { t:'Dependency lockfiles', desc:'Confirms exact dependency versions in use, useful for matching against known CVEs.', q: c => `${c.site} (inurl:composer.lock OR inurl:package-lock.json OR inurl:yarn.lock OR inurl:pnpm-lock.yaml)` },
      { t:'Ad-hoc SQL dump filenames', desc:'Catches lazily-named dump files that a developer meant to delete after debugging.', q: c => `${c.site} (inurl:backup.sql OR inurl:database.sql OR inurl:dump.sql)` },
    ]},
  { id:'databases', num:'09', title:'Database Dumps & SQL Exposure', signal:'high', tags:['Databases','Backups'],
    note:'Raw SQL dumps and exports that reveal schema or credentials directly.',
    falsePositives:'Sample/seed data shipped with open-source projects, not a real production dump.',
    dorks:[
      { t:'SQL dump / insert statements', desc:'A raw dump file is close to the worst-case finding — full table contents in one file.', q: c => `${c.site} (filetype:sql OR filetype:dump) (intext:"INSERT INTO" OR intext:password) -intext:sample -intext:test` },
      { t:'DB password strings', desc:'Narrower version of the same idea, keyed to an explicit DB_PASSWORD string.', q: c => `${c.mention} filetype:sql intext:DB_PASSWORD` },
      { t:'MongoDB-style export leaks', desc:'JSON exports carrying Mongo\u2019s _id/ObjectId fields — a sign of a raw collection dump.', q: c => `${c.site} filetype:json intext:_id intext:ObjectId` },
    ]},
  { id:'backups', num:'10', title:'Backup & Legacy Files', signal:'med', tags:['Backups'],
    note:'Archived, temp, and forgotten files that outlive their intended lifespan.',
    falsePositives:'Legitimate downloadable software/asset archives that just happen to match the same file extensions.',
    dorks:[
      { t:'Archived backups', desc:'Compressed archives left in a public web root, often a full site or DB backup.', q: c => `${c.site} (filetype:zip OR filetype:tar OR filetype:gz OR filetype:rar OR filetype:bak OR filetype:old)` },
      { t:'Editor swap / temp files', desc:'Vim swap files and tilde-backups can contain a snapshot of source code mid-edit.', q: c => `${c.site} (filetype:swp OR filetype:tmp OR inurl:~)` },
      { t:'Hidden system files', desc:'Dotfiles that shouldn\u2019t be web-accessible at all, especially .htpasswd.', q: c => `${c.site} (inurl:.DS_Store OR inurl:.htpasswd OR inurl:.htaccess)` },
      { t:'Legacy web.config exposure', desc:'IIS config files sometimes carry a plaintext database connection string.', q: c => `${c.site} inurl:web.config intext:connectionString` },
    ]},
  { id:'cloud', num:'11', title:'Cloud Storage Buckets', signal:'high', tags:['Cloud'],
    note:'Misconfigured object storage across every major provider, not just AWS.',
    falsePositives:'Public CDN buckets that are intentionally open by design (static assets, marketing images).',
    dorks:[
      { t:'S3 bucket mentions', desc:'Finds pages or files that reference an S3 bucket tied to the target.', q: c => `site:s3.amazonaws.com ${c.mention}` },
      { t:'Open storage listings', desc:'A directory-style listing means the bucket allows public enumeration of its contents.', q: c => `intitle:"index of" ${c.mention} (inurl:storage.googleapis.com OR inurl:blob.core.windows.net)` },
      { t:'Bucket hostnames in-site', desc:'Finds bucket URLs referenced from within the target\u2019s own indexed pages.', q: c => `${c.site} (inurl:s3.amazonaws.com OR inurl:storage.googleapis.com OR inurl:blob.core.windows.net)` },
      { t:'DigitalOcean Spaces', desc:'Same bucket-exposure pattern on DigitalOcean\u2019s S3-compatible storage.', q: c => `${c.mention} inurl:digitaloceanspaces.com` },
      { t:'Cloudflare R2', desc:'R2 buckets are newer and less commonly audited by teams migrating off S3.', q: c => `${c.mention} inurl:r2.cloudflarestorage.com` },
      { t:'Oracle Cloud Object Storage', desc:'Less common provider, so misconfigurations here are often overlooked longer.', q: c => `${c.mention} inurl:oraclecloud.com intext:objectstorage` },
      { t:'Backblaze B2', desc:'Budget-friendly storage provider popular for backups specifically.', q: c => `${c.mention} inurl:backblazeb2.com` },
      { t:'Alibaba OSS', desc:'Common for targets with an APAC presence or Alibaba Cloud infrastructure.', q: c => `${c.mention} inurl:aliyuncs.com` },
      { t:'MinIO consoles', desc:'Self-hosted S3-compatible storage — the admin console itself is sometimes left exposed.', q: c => `${c.site} intext:"MinIO" inurl:console` },
      { t:'Linode Object Storage', desc:'Same pattern again on Linode/Akamai\u2019s object storage offering.', q: c => `${c.mention} inurl:linodeobjects.com` },
    ]},
  { id:'pii', num:'12', title:'PII & Sensitive Records', signal:'med', tags:['PII'],
    note:'Spreadsheets and documents that may contain personal data — expect false positives.',
    falsePositives:'High — demo datasets, marketing sample exports, and cached form-builder templates all match these patterns without containing real personal data.',
    dorks:[
      { t:'Personal data spreadsheets', desc:'Exports that were probably meant to stay internal — customer lists, HR data, etc.', q: c => `${c.site} (filetype:csv OR filetype:xls OR filetype:docx) (intext:email OR intext:ssn OR intext:"credit card") -intext:sample -intext:example -intext:demo` },
      { t:'Identity documents', desc:'Scanned or generated ID documents indexed by accident, often from a KYC upload flow.', q: c => `${c.site} filetype:pdf (intext:"date of birth" OR intext:passport OR intext:ssn)` },
    ]},
  { id:'docs', num:'13', title:'Confidential Documents & Compliance', signal:'med', tags:['Documents','Compliance'],
    note:'Internal documents and regulatory language that shouldn\u2019t be publicly indexed.',
    falsePositives:'Public compliance/privacy-policy pages that legitimately mention GDPR or HIPAA as part of their own disclosures.',
    dorks:[
      { t:'Marked-confidential files', desc:'Documents that explicitly label themselves as not meant for public distribution.', q: c => `${c.site} (filetype:pdf OR filetype:doc OR filetype:xls) (intext:confidential OR intext:"internal use only")` },
      { t:'Compliance / breach language', desc:'Surfaces regulatory or incident-related documents that reference a specific framework or event.', q: c => `${c.site} (intext:GDPR OR intext:HIPAA OR intext:"data breach")` },
    ]},
  { id:'admin', num:'14', title:'Admin Panels & Login Portals', signal:'med', tags:['Admin Panels'],
    note:'Authentication surfaces worth checking for default creds or weak lockout policy.',
    falsePositives:'Login pages that are intentionally public-facing (customer account login, not an internal admin tool).',
    dorks:[
      { t:'Login pages on known panels', desc:'Finds authentication surfaces tied to common panel software by URL pattern.', q: c => `${c.site} intitle:login (inurl:admin OR inurl:portal OR inurl:cpanel OR inurl:wp-admin)` },
      { t:'phpMyAdmin instances', desc:'A DB admin tool exposed to the internet is a high-value target on its own.', q: c => `${c.site} inurl:phpmyadmin` },
      { t:'Admin dashboards', desc:'Broader title-based sweep for dashboard-style admin interfaces.', q: c => `${c.site} intitle:"dashboard" inurl:admin` },
    ]},
  { id:'devops', num:'15', title:'DevOps & Monitoring Dashboards', signal:'med', tags:['DevOps','Admin Panels'],
    note:'Internal tooling that sometimes ships without auth in front of it.',
    falsePositives:'Public demo instances of the same software hosted by the vendor, not the target\u2019s own deployment.',
    dorks:[
      { t:'Jenkins panels', desc:'An exposed Jenkins instance often allows triggering builds or reading build logs/secrets.', q: c => `${c.site} intitle:"Dashboard [Jenkins]"` },
      { t:'Grafana / Kibana instances', desc:'Dashboards that can expose internal metrics, logs, and infrastructure naming.', q: c => `${c.site} (intitle:Grafana OR intitle:Kibana)` },
      { t:'Prometheus targets', desc:'The targets page lists every internal service Prometheus is scraping.', q: c => `${c.site} intitle:"Prometheus Time Series"` },
      { t:'Portainer / container managers', desc:'Container management UIs can expose or even control running infrastructure if unauthenticated.', q: c => `${c.site} intitle:Portainer` },
    ]},
  { id:'api', num:'16', title:'API Surface & Parameters', signal:'high', tags:['API'],
    note:'Endpoints, specs, and the parameter names most worth fuzzing first.',
    falsePositives:'Third-party API documentation sites that mention similar path structures generically.',
    dorks:[
      { t:'Versioned / GraphQL endpoints', desc:'Finds the base paths worth probing further with a proper API client.', q: c => `${c.site} inurl:/api/ (inurl:v1 OR inurl:v2 OR inurl:graphql)` },
      { t:'Swagger / OpenAPI specs', desc:'A leaked spec file documents the entire API surface for you, including undocumented endpoints.', q: c => `${c.site} filetype:json (intext:swagger OR intext:openapi)` },
      { t:'API documentation UIs', desc:'Rendered docs interfaces that may not be linked from the main site navigation.', q: c => `${c.site} (inurl:swagger-ui OR inurl:api-docs OR inurl:redoc)` },
      { t:'Common vulnerable parameters', desc:'Parameter names historically associated with IDOR, open redirect, and SSRF findings.', q: c => `${c.site} inurl:? (intext:id= OR intext:token= OR intext:redirect= OR intext:callback= OR intext:debug=)` },
      { t:'Postman / Insomnia collections', desc:'Exported request collections can reveal internal-only endpoints and example auth tokens.', q: c => `${c.site} (filetype:json intext:postman_collection OR inurl:insomnia)` },
      { t:'GraphQL dev consoles', desc:'Interactive GraphQL explorers often expose the full schema via introspection.', q: c => `${c.site} (inurl:graphql-playground OR inurl:graphiql)` },
    ]},
  { id:'errors', num:'17', title:'Errors, Debug Output & Stack Traces', signal:'med', tags:['Errors'],
    note:'Verbose error pages that leak framework, path, or query internals.',
    falsePositives:'Generic error-message text from unrelated forums or Stack Overflow posts that happen to match the phrase.',
    dorks:[
      { t:'Stack traces / fatal errors', desc:'A raw stack trace reveals file paths, framework versions, and sometimes query internals.', q: c => `${c.site} (intext:"stack trace" OR intext:"unhandled exception" OR intext:"fatal error")` },
      { t:'DB driver errors', desc:'Database error messages can leak table/column names or even partial query text.', q: c => `${c.site} (intext:"Warning: mysql_" OR intext:"ORA-01756" OR intext:"Microsoft OLE DB Provider")` },
      { t:'Debug mode indicators', desc:'Confirms whether a framework\u2019s debug mode was accidentally left on in production.', q: c => `${c.site} (intext:"debug mode" OR intext:"X-Debug-Token")` },
    ]},
  { id:'cms', num:'18', title:'CMS & Tech Fingerprint', signal:'low', tags:['Fingerprinting'],
    note:'Baseline recon on what the stack is, before probing it further.',
    falsePositives:'Low, but low signal too — this mostly confirms what you could already guess from viewing the page source.',
    dorks:[
      { t:'WordPress structure', desc:'Confirms WordPress and its plugin/theme paths, useful for version-specific CVE lookups.', q: c => `${c.site} (inurl:wp-content OR inurl:wp-includes)` },
      { t:'CMS footer credit', desc:'Explicit "Powered by" text is the easiest possible stack confirmation.', q: c => `${c.site} intext:"Powered by" (WordPress OR Joomla OR Drupal OR Magento)` },
      { t:'Sitemaps', desc:'A sitemap gives a clean, crawler-approved list of every page the site wants indexed.', q: c => `${c.site} filetype:xml inurl:sitemap` },
    ]},
  { id:'web3', num:'19', title:'Web3 & Wallet Exposure', signal:'high', tags:['Web3','Secrets'],
    note:'Private keys, seed phrases, and contract source left in client-side or repo code.',
    falsePositives:'Tutorial/example code using well-known placeholder mnemonics (e.g. Hardhat\u2019s default test accounts).',
    dorks:[
      { t:'Private key / seed phrase mentions', desc:'A real hit here is critical severity — funds tied to the key are immediately at risk.', q: c => `${c.mention} (intext:privateKey OR intext:seedPhrase OR intext:mnemonic) (filetype:js OR filetype:json OR filetype:sol)` },
      { t:'Solidity contracts on GitHub', desc:'Finds the target\u2019s smart contract source for manual review.', q: c => `site:github.com ${c.mention} filetype:sol intext:"pragma solidity"`, gh:true },
      { t:'Mnemonic in JSON', desc:'Wallet mnemonics are sometimes committed in JSON config files by mistake during development.', q: c => `${c.mention} filetype:json intext:mnemonic` },
    ]},
  { id:'aiml', num:'20', title:'AI/ML Artifact Leaks', signal:'low', tags:['AI/ML','Secrets'],
    note:'Notebooks and model files that sometimes carry hardcoded keys.',
    falsePositives:'Public tutorial notebooks from courses/blog posts that happen to reference the same variable names.',
    dorks:[
      { t:'Notebooks / model files with keys', desc:'Data scientists often hardcode an API key at the top of a notebook and forget to remove it before sharing.', q: c => `${c.mention} (filetype:ipynb OR filetype:h5 OR filetype:pth) intext:api_key` },
      { t:'Raw GitHub notebooks', desc:'Same idea, scoped to raw notebook content on GitHub specifically.', q: c => `site:raw.githubusercontent.com ${c.mention} filetype:ipynb intext:api_key`, gh:true },
    ]},
  { id:'people', num:'21', title:'People & Social Footprint', signal:'low', tags:['People'],
    note:'Employee and org mentions useful for social-engineering-risk context, not direct exploitation.',
    falsePositives:'People who work at unrelated companies with similar names, or former employees with outdated profile info.',
    dorks:[
      { t:'Employee LinkedIn profiles', desc:'Useful for understanding org structure and tech stack via job titles, not for direct exploitation.', q: c => `site:linkedin.com/in ${c.mention}` },
      { t:'Combolist / leak mentions', desc:'Checks whether the target has already appeared in a public credential-leak paste.', q: c => `site:pastebin.com ${c.mention} (intext:leaked OR intext:combolist)` },
    ]},
  { id:'mobile', num:'23', title:'Mobile & App Footprint', signal:'med', tags:['Mobile'],
    note:'App store presence and the web-side files mobile apps rely on for link verification.',
    falsePositives:'Unrelated third-party apps that happen to mention the target\u2019s name in their description or reviews.',
    dorks:[
      { t:'Play Store presence', desc:'Confirms an Android app exists and links to its store listing for further review.', q: c => `site:play.google.com ${c.mention}` },
      { t:'App Store presence', desc:'Same for iOS — useful before requesting the IPA for static analysis.', q: c => `site:apps.apple.com ${c.mention}` },
      { t:'Android App Links verification', desc:'This file lists every package allowed to open the target\u2019s links — a misconfiguration here enables link hijacking.', q: c => `${c.site} inurl:.well-known/assetlinks.json` },
      { t:'iOS Universal Links verification', desc:'iOS equivalent of the above — associates the domain with specific app IDs.', q: c => `${c.site} inurl:.well-known/apple-app-site-association` },
      { t:'Deep link / scheme mentions', desc:'Custom URL schemes are a common source of intent-hijacking and parameter-injection bugs on mobile.', q: c => `${c.site} (intext:"deeplink" OR intext:"universal link" OR intext:"custom URL scheme")` },
      { t:'Indexed APK artifacts', desc:'An indexed APK file can be pulled and decompiled directly, skipping the Play Store entirely.', q: c => `${c.site} filetype:apk` },
    ]},
];

const GROUPS = [
  { label:'Attack Surface Discovery', ids:['subdomains','git','cicd','scope'] },
  { label:'Credentials & Secrets', ids:['config','codehost','jsfiles','thirdparty','hiddenfiles'] },
  { label:'Data Exposure', ids:['databases','backups','cloud','pii','docs'] },
  { label:'Access & API Surfaces', ids:['admin','devops','api'] },
  { label:'Mobile & App Footprint', ids:['mobile'] },
  { label:'Signals & Fingerprinting', ids:['errors','cms','web3','aiml','people'] },
];

/* ---------- External recon tools (non-dork, direct links) ---------- */
const EXTERNAL_TOOLS = [
  { name:'crt.sh', desc:'Certificate Transparency — historical and current subdomains from issued TLS certs.', url:d=>`https://crt.sh/?q=%25.${d}` },
  { name:'Wayback Machine', desc:'Archived URLs and old endpoints the current crawl may have missed.', url:d=>`https://web.archive.org/web/*/${d}/*` },
  { name:'Shodan', desc:'Exposed services and banners tied to the target\u2019s hostnames.', url:d=>`https://www.shodan.io/search?query=hostname%3A${d}` },
  { name:'urlscan.io', desc:'Crawled page snapshots, requests, and related infrastructure.', url:d=>`https://urlscan.io/search/#domain%3A${d}` },
  { name:'VirusTotal', desc:'Passive DNS, related samples, and community observations.', url:d=>`https://www.virustotal.com/gui/domain/${d}` },
  { name:'BuiltWith', desc:'Technology and vendor fingerprint for the target site.', url:d=>`https://builtwith.com/${d}` },
  { name:'PublicWWW', desc:'Source-code search across indexed sites — useful for shared-key detection.', url:d=>`https://publicwww.com/websites/%22${d}%22/` },
  { name:'Censys', desc:'Host and certificate search across internet-wide scans.', url:d=>`https://search.censys.io/search?resource=hosts&q=${d}`, login:true },
  { name:'SecurityTrails', desc:'Historical DNS records and associated infrastructure.', url:d=>`https://securitytrails.com/domain/${d}/dns`, login:true },
  { name:'FOFA', desc:'Asset search engine popular for infrastructure fingerprinting.', url:d=>`https://fofa.info/result?qbase64=${b64('domain="'+d+'"')}`, login:true },
  { name:'Netlas', desc:'Internet-wide host and domain scan search.', url:d=>`https://app.netlas.io/host/?q=domain%3A${d}` , login:true },
  { name:'LeakIX', desc:'Indexed leaks and exposed services tied to the domain.', url:d=>`https://leakix.net/search?q=${d}` },
  { name:'Hunter.io', desc:'Email address and naming-convention discovery.', url:d=>`https://hunter.io/search/${d}`, login:true },
  { name:'Intelligence X', desc:'Search across leaks, pastes, and darknet-adjacent sources.', url:d=>`https://intelx.io/?s=${d}`, login:true },
  { name:'DNSDumpster', desc:'DNS recon and network mapping (paste the domain into the search box).', url:()=>`https://dnsdumpster.com/` },
  { name:'grep.app', desc:'Regex source-code search across public GitHub repositories.', url:d=>`https://grep.app/search?q=${d}` },
  { name:'searchcode', desc:'Source-code search across many hosting providers.', url:d=>`https://searchcode.com/?q=${d}` },
  { name:'ViewDNS', desc:'Reverse IP lookup — other sites sharing the same host.', url:d=>`https://viewdns.info/reverseip/?host=${d}&t=1` },
  { name:'AlienVault OTX', desc:'Threat-intel pulses and indicators tied to the domain.', url:d=>`https://otx.alienvault.com/indicator/domain/${d}` },
];

/* ---------- Search templates (feed the custom builder) ---------- */
const TEMPLATES = {
  secrets: [
    { name:'AWS Keys', must:['aws_access_key_id','aws_secret_access_key'], filetypes:['env','json','yml'] },
    { name:'Azure Keys', must:['AccountKey','azure_storage_connection_string'], filetypes:['env','json'] },
    { name:'GCP Keys', must:['private_key_id','client_email'], filetypes:['json'] },
    { name:'Firebase', must:['firebaseConfig','firebaseio.com'], filetypes:['js','json'] },
    { name:'Stripe', must:['sk_live','pk_live'], filetypes:['js','env','json'] },
    { name:'Slack', must:['xoxb','xoxp','hooks.slack.com'] },
    { name:'Twilio', must:['twilio_account_sid','twilio_auth_token'] },
    { name:'JWT', must:['eyJhbGciOi'], filetypes:['js','json','txt'] },
    { name:'OAuth', must:['client_secret','oauth_token'] },
    { name:'Bearer Tokens', must:['Authorization: Bearer'] },
    { name:'API Keys', must:['api_key','apikey','X-API-Key'] },
    { name:'Passwords', must:['password','passwd'] },
    { name:'Private Keys', must:['BEGIN RSA PRIVATE KEY','BEGIN OPENSSH PRIVATE KEY'], filetypes:['pem','key','txt'] },
  ],
  cloud: [
    { name:'AWS S3', scope:'none', inurl:['s3.amazonaws.com'] },
    { name:'Azure Blob', scope:'none', inurl:['blob.core.windows.net'] },
    { name:'GCP Storage', scope:'none', inurl:['storage.googleapis.com'] },
    { name:'DigitalOcean Spaces', scope:'none', inurl:['digitaloceanspaces.com'] },
    { name:'Cloudflare R2', scope:'none', inurl:['r2.cloudflarestorage.com'] },
    { name:'Oracle Cloud', scope:'none', inurl:['oraclecloud.com'], must:['objectstorage'] },
    { name:'Backblaze B2', scope:'none', inurl:['backblazeb2.com'] },
    { name:'Alibaba OSS', scope:'none', inurl:['aliyuncs.com'] },
    { name:'MinIO', must:['MinIO'], inurl:['console'] },
  ],
  auth: [
    { name:'OAuth', must:['oauth_token','client_secret'] },
    { name:'OpenID', must:['openid_connect','id_token'] },
    { name:'JWT', must:['eyJhbGciOi','jwt_secret'] },
    { name:'SAML', must:['saml_response','X.509 Certificate'] },
    { name:'Login', inurl:['login'], intitle:['login'] },
    { name:'Password Reset', inurl:['reset-password','forgot-password'] },
    { name:'MFA', must:['mfa_secret','totp_secret','backup_codes'] },
  ],
  api: [
    { name:'REST', inurl:['/api/v1','/api/v2'] },
    { name:'GraphQL', inurl:['graphql','graphiql'] },
    { name:'Swagger', inurl:['swagger-ui','swagger.json'] },
    { name:'OpenAPI', must:['openapi'], filetypes:['json','yaml'] },
    { name:'Redoc', inurl:['redoc'] },
    { name:'Postman Collections', must:['postman_collection'], filetypes:['json'] },
  ],
};

/* ---------- Guided recon workflow ---------- */
const WORKFLOW_STEPS = [
  { id:'target-input',    label:'Target Input',        mapsTo:null,          est:5  },
  { id:'scope-validation',label:'Scope Validation',    mapsTo:'scope',       est:10 },
  { id:'subdomains',      label:'Subdomains',          mapsTo:'subdomains',  est:20 },
  { id:'historical-urls', label:'Historical URLs',     mapsTo:'external',    est:15 },
  { id:'js-analysis',     label:'JavaScript Analysis', mapsTo:'jsfiles',     est:20 },
  { id:'secrets',         label:'Secrets',             mapsTo:'codehost',    est:25 },
  { id:'github',          label:'GitHub',              mapsTo:'github',      est:15 },
  { id:'cloud-storage',   label:'Cloud Storage',       mapsTo:'cloud',       est:15 },
  { id:'api-discovery',   label:'API Discovery',       mapsTo:'api',         est:20 },
  { id:'authentication',  label:'Authentication',      mapsTo:'templates',   est:15 },
  { id:'admin-panels',    label:'Admin Panels',        mapsTo:'admin',       est:10 },
  { id:'reporting',       label:'Reporting',           mapsTo:'export',      est:15 },
];

/* ---------- Recon checklist ---------- */
const CHECKLIST_ITEMS = [
  { id:'robots',       label:'robots.txt reviewed' },
  { id:'securitytxt',  label:'security.txt reviewed' },
  { id:'sitemap',      label:'sitemap.xml reviewed' },
  { id:'wayback',      label:'Wayback Machine checked' },
  { id:'crtsh',        label:'crt.sh certificate search run' },
  { id:'github',       label:'GitHub dorks run' },
  { id:'javascript',   label:'JavaScript files analyzed' },
  { id:'secrets',      label:'Secrets dorks run' },
  { id:'cloud',        label:'Cloud storage checked (general)' },
  { id:'api',          label:'API surface mapped' },
  { id:'swagger',      label:'Swagger / OpenAPI checked' },
  { id:'graphql',      label:'GraphQL endpoints checked' },
  { id:'firebase',     label:'Firebase config checked' },
  { id:'admin',        label:'Admin panels checked' },
  { id:'oauth',        label:'OAuth flows checked' },
  { id:'jwt',          label:'JWT handling checked' },
  { id:'backups',      label:'Backup files checked' },
  { id:'opendirs',     label:'Open directories checked' },
  { id:'cloudbuckets', label:'Cloud storage buckets enumerated' },
];

const FILETYPES = ['env','yml','json','sql','csv','xls','pdf','log','conf','pem','ipynb','sol','txt','bak','doc','zip','js','key','yaml'];

/* ---------- Group icons (monochrome glyphs, one per phase) ---------- */
const GROUP_ICONS = {
  'Attack Surface Discovery': '▲',
  'Credentials & Secrets': '◆',
  'Data Exposure': '▣',
  'Access & API Surfaces': '◈',
  'Mobile & App Footprint': '◉',
  'Signals & Fingerprinting': '✦',
};

/* ---------- Integrated tool launcher — standard CLI recon tools ---------- */
/* Every command is the tool's own documented default usage with the target
   substituted in — no custom flags, wordlists, or vulnerability templates. */
const TOOL_COMMANDS = [
  { name:'subfinder', desc:'Passive subdomain enumeration.', cmd: t => `subfinder -d ${t} -silent` },
  { name:'assetfinder', desc:'Related domains and subdomains from public sources.', cmd: t => `assetfinder --subs-only ${t}` },
  { name:'httpx', desc:'Probe hosts for live HTTP(S), title, and tech stack.', cmd: t => `echo ${t} | httpx -silent -title -tech-detect -status-code` },
  { name:'katana', desc:'Crawl a site for in-scope URLs.', cmd: t => `katana -u https://${t} -silent -jc` },
  { name:'gau', desc:'Pull known URLs from AlienVault, Wayback, and Common Crawl.', cmd: t => `gau ${t} --subs` },
  { name:'waybackurls', desc:'Pull archived URLs from the Wayback Machine.', cmd: t => `echo ${t} | waybackurls` },
  { name:'nuclei', desc:'Template-based scanning, filtered to medium+ severity for triage.', cmd: t => `subfinder -d ${t} -silent | httpx -silent | nuclei -silent -severity medium,high,critical` },
  { name:'ffuf', desc:'Directory/file fuzzing — supply your own wordlist.', cmd: t => `ffuf -u https://${t}/FUZZ -w /path/to/wordlist.txt -mc 200,301,302,403` },
];
const MANUAL_TOOLS = [
  { name:'Burp Suite', desc:'GUI proxy — no CLI equivalent.', note: t => `Add ${t} to Target → Scope, then route your browser through 127.0.0.1:8080.` },
];

/* ---------- Findings workspace taxonomy ---------- */
const SEVERITIES = ['Info','Low','Medium','High','Critical'];
const STATUSES = ['Open','Confirmed','Duplicate','Not Applicable','Reported','Resolved'];

/* ---------- Builder autocomplete suggestions (native <datalist>) ---------- */
const SUGGEST_MUST = ['password','api_key','secret','token','access_token','client_secret','private_key','aws_secret_access_key','firebaseConfig','swagger','openapi','graphql','confidential'];
const SUGGEST_INURL = ['admin','api-docs','swagger-ui','graphql','graphiql','wp-admin','phpmyadmin',' .git','.env','backup','config'];
const SUGGEST_INTITLE = ['index of','login','dashboard','swagger ui','jenkins','grafana','kibana'];

/* ---------- Operator compatibility across engines ----------
   Researched against current engine behavior — most notably, Google
   retired cache: (Sept 2024) and related: (July 2023); both are dead
   everywhere, not just deprecated on Google. Bing has no direct inurl:/
   intext: equivalents (it uses instreamset:/inbody: internally), so
   results for those two are inconsistent in practice rather than a
   clean yes/no. Treat "partial" as "don't rely on this operator alone
   to scope results on that engine."                                    */
const OPERATOR_INFO = [
  { op:'site:', label:'Site scope', google:'yes', bing:'yes', ddg:'yes',
    note:'Universally supported — the safest operator to build a query around.' },
  { op:'filetype:', label:'File type filter', google:'yes', bing:'yes', ddg:'yes',
    note:'Works consistently across all three. ext: is a Google alias for the same thing.' },
  { op:'intitle:', label:'Title match', google:'yes', bing:'yes', ddg:'yes',
    note:'Supported everywhere, though Bing/DuckDuckGo apply it a bit more loosely than Google.' },
  { op:'inurl:', label:'URL match', google:'yes', bing:'partial', ddg:'partial',
    note:'Reliable on Google. Bing and DuckDuckGo results for inurl: are inconsistent in practice — treat as a hint, not a guarantee.' },
  { op:'intext:', label:'Body text match', google:'yes', bing:'partial', ddg:'partial',
    note:'Google\u2019s intext: is reliable. Bing has no direct equivalent (it uses an internal inbody: mechanism); DuckDuckGo\u2019s support is inconsistent.' },
  { op:'"..."', label:'Exact phrase', google:'yes', bing:'yes', ddg:'yes', note:'Universal.' },
  { op:'-term', label:'Exclude a term', google:'yes', bing:'yes', ddg:'yes', note:'Universal.' },
  { op:'OR', label:'Match either term', google:'yes', bing:'yes', ddg:'yes', note:'Universal — must be uppercase on Google.' },
  { op:'( )', label:'Grouping', google:'yes', bing:'yes', ddg:'yes', note:'Universal for combining OR/AND clauses.' },
  { op:'before: / after:', label:'Date bound', google:'yes', bing:'no', ddg:'no',
    note:'Google-specific literal syntax. Bing/DuckDuckGo don\u2019t parse it as an operator — use ReconQL\u2019s date-range picker instead, which applies each engine\u2019s own URL-level date filter.' },
  { op:'AROUND(n)', label:'Proximity search', google:'yes', bing:'no', ddg:'no',
    note:'Undocumented but functional on Google. No equivalent on Bing or DuckDuckGo — Bing has its own near:N syntax, which is not the same operator.' },
  { op:'cache:', label:'Cached page', google:'dead', bing:'no', ddg:'no',
    note:'Removed by Google in September 2024 (confirmed by Google\u2019s own Search Liaison). No longer functional on any engine — use the Wayback Machine instead.' },
  { op:'related:', label:'Similar sites', google:'dead', bing:'no', ddg:'no',
    note:'Removed by Google in July 2023. No longer functional.' },
];

function operatorSupport(op, engine){
  const info = OPERATOR_INFO.find(o=>o.op === op);
  if(!info) return 'unknown';
  return info[engine] || 'unknown';
}

/* Extracts which known operators appear in a raw query string. */
function detectOperators(query){
  const found = [];
  OPERATOR_INFO.forEach(info=>{
    const key = info.op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('n', '\\d+').replace('\\.\\.\\.', '');
    let pattern;
    if(info.op === '"..."') pattern = /"[^"]+"/;
    else if(info.op === '( )') pattern = /\(/;
    else if(info.op === '-term') pattern = /(^|\s)-[a-zA-Z]/;
    else if(info.op === 'OR') pattern = /\bOR\b/;
    else if(info.op === 'AROUND(n)') pattern = /AROUND\(\d+\)/i;
    else pattern = new RegExp(key, 'i');
    if(pattern.test(query)) found.push(info);
  });
  return found;
}

/* Returns human-readable warnings for a query on a given engine. */
function validateQueryForEngine(query, engine){
  if(engine === 'github') return [];
  const warnings = [];
  detectOperators(query).forEach(info=>{
    const support = info[engine];
    if(support === 'dead'){
      warnings.push(`${info.op} is deprecated and no longer works on any search engine.`);
    } else if(support === 'no'){
      warnings.push(`${info.op} isn\u2019t supported on ${engine === 'ddg' ? 'DuckDuckGo' : 'Bing'} — it will likely be ignored or treated as plain text.`);
    } else if(support === 'partial'){
      warnings.push(`${info.op} is unreliable on ${engine === 'ddg' ? 'DuckDuckGo' : 'Bing'} — results may not be scoped as expected.`);
    }
  });
  return warnings;
}


