# jrchicago.com

The Junior Chicago studio site, built as a **Cloudflare Worker with static assets**. Plain HTML, CSS, and JS with no build step and no framework. One small Worker handles the inquiry form and security headers.

```
jrchicago/
├── public/                  ← the website (edit these files)
│   ├── index.html           Home, with the signature star
│   ├── work/                Work index + one folder per case study
│   ├── photography/  services/  about/  contact/  thank-you/
│   ├── 404.html
│   ├── assets/styles.css    All styling. Brand tokens are at the top in :root
│   ├── assets/site.js       Mobile nav, the star, the inquiry form
│   ├── favicon.svg  robots.txt  sitemap.xml
├── src/worker.js            Form handling, email delivery, headers
├── wrangler.jsonc           Cloudflare config
├── docs/                    Claude Project knowledge files (01–06)
└── package.json
```

## 1. Deploy (pick one)

### Option A: GitHub + Cloudflare (recommended for ongoing edits)
1. Create a private GitHub repo and push this folder to it.
2. Cloudflare dashboard → **Workers & Pages → Create → Import a repository** → pick the repo.
3. Leave the build command empty. Deploy command: `npx wrangler deploy`.
4. Every push to `main` redeploys. Edit files on GitHub (or locally) and the site updates in about a minute.

### Option B: From your computer
```bash
npm install
npx wrangler login
npm run deploy
```

Either way, the site goes live at `https://jrchicago.<your-subdomain>.workers.dev`. That preview address sends `noindex` automatically, so drafts never land in Google.

> The dashboard's drag-and-drop "upload static files" option only publishes `public/`, without the Worker. The site would load, but the inquiry form would not work. Use A or B.

## 2. Turn on email for the inquiry form

The form works the moment you choose one of these. Until then, submissions show visitors an error that includes `christian@jrchicago.com`, so no inquiry is silently lost.

**Option 1: Resend (recommended; works wherever your mailbox is hosted)**
1. Create a Resend account and verify the `jrchicago.com` domain. Resend gives you DNS records to add.
2. Create an API key, then store it as a secret:
   ```bash
   npx wrangler secret put RESEND_API_KEY
   ```
   (or Dashboard → your Worker → Settings → Variables and Secrets → add secret `RESEND_API_KEY`).
3. Emails arrive from `inquiry@jrchicago.com`. Hitting **Reply** answers the visitor directly.

**Option 2: Cloudflare Email Routing (free, all-Cloudflare)**
Requires jrchicago.com's DNS and mail (MX) on Cloudflare. Email Routing then makes `christian@jrchicago.com` a forwarding address, not a mailbox. Only use this if you don't already host a real mailbox at that address.
1. Dashboard → jrchicago.com → **Email → Email Routing** → enable, and verify the inbox the mail should land in.
2. Uncomment the `send_email` block in `wrangler.jsonc`. Set `destination_address` to that verified inbox, and set `INQUIRY_TO` to match.
3. Redeploy.

**Local testing:** `cp .dev.vars.example .dev.vars`, then `npm run dev`. Submissions print in the terminal.

## 3. Point jrchicago.com at the Worker (launch day)

1. Cloudflare dashboard → **Add a domain** → `jrchicago.com`. Cloudflare imports your existing DNS records.
   **Before switching anything, confirm your MX/email records were copied**, or email at the domain will break.
2. At GoDaddy, change the nameservers to the two Cloudflare gives you. Propagation usually takes under an hour, and sometimes up to a day.
3. In `wrangler.jsonc`, uncomment the `routes` block, then deploy. (Or: Worker → Settings → Domains & Routes → Add custom domain.)
4. Visit `https://jrchicago.com` and `https://www.jrchicago.com`, which should redirect to the bare domain. Send a test inquiry.
5. Only then remove the domain from Framer and cancel the plan.

## 4. Editing

- **Copy and placeholders:** search the project for `[PLACEHOLDER`. Every unconfirmed fact, metric, client name, and image is marked and highlighted in yellow on the page. Nothing should launch with one visible.
- **Brand:** colors, type scale, and spacing are CSS variables at the top of `public/assets/styles.css`. Brand v0 is provisional until the "Junior" story and the dream motif are decided.
- **The star:** in `public/assets/site.js`, `PUMPS_TO_POP` sets how many presses it takes to pop it, and `LINES` holds the messages it shows along the way.
- **Header and footer** are repeated in every HTML file, which keeps the files plain. A nav change means editing each page. Find and replace across `public/` handles it in one pass.
- **Adding a case study:** copy a folder in `public/work/`, edit it, then add a row to `work/index.html`, the home page's "Selected work" list, and `sitemap.xml`. Update the Previous/Next links on its neighbors.
- **Images:** put them in `public/assets/img/` as `.webp` or `.jpg`, about 2000px wide at most. Always add `width`, `height`, and real `alt` text.

## 5. Before launch

- [ ] WM Display Group clearance for the in-house projects; anonymize where needed
- [ ] Consent from Ellie and Andy, and Lauren, Nate, and Sam
- [ ] Every `[PLACEHOLDER` replaced or removed
- [ ] Headshot and real images added
- [ ] Email delivery tested end to end, including Reply
- [ ] Social share image (`og:image`, 1200×630) added once the brand is final
- [ ] Analytics: Cloudflare Web Analytics, enabled from the dashboard. It's cookie-free, so no banner is needed. If it injects a script, add `https://static.cloudflareinsights.com` to `script-src` and `https://cloudflareinsights.com` to `connect-src` in the CSP in `src/worker.js`.
- [ ] Optional: Cloudflare Turnstile on the form if spam gets past the honeypot

## Security and performance notes

- Strict Content Security Policy: no inline scripts or styles, and only Google Fonts allowed from outside. If you embed something new (a video player, analytics), add its domain to the `CSP` list in `src/worker.js`.
- The form only accepts posts from this site, validates on both the browser and the server, caps field lengths, and uses a hidden honeypot field for bots.
- Pages run without JavaScript. The form falls back to a normal submit that lands on `/thank-you/`.
- Each page weighs about 40 KB (HTML + CSS + JS, uncompressed) before photos, plus the web font.
