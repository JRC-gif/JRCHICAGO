# Decisions Log

Running record of what's been decided. Newest entries at the bottom of each section. Each chat ends with a "Decisions log update" block; paste it here before starting the next chat.

## Brand

- 2026-10-19: Site leads with the Junior Chicago brand; Christian is visible as founder.
- 2026-10-19: Identity (logo, palette, type, voice) is built fresh. Feel: bold and creative.
- 2026-10-19: Creative direction: site as a playable object (papertoilet.com, Cookie Clicker, Jeff Koons). One signature homepage interaction that never hides the work or the inquiry form.
- 2026-10-19: Brand v0 (provisional) shipped in the first build: Chicago-flag palette, Bricolage Grotesque, glossy red Chicago star. See 04-brand-system.md.
- 2026-10-19: Signature interaction v0: "Press the star." Each press inflates a glossy Chicago star; it pops into a burst at 24 presses and links to the inquiry form. Lifetime pops counter.
- OPEN: Story behind "Junior"; whether the "dream big" motif stays. May reshape brand v0.

## Sitemap

- 2026-10-19: Six pages: Home, Work (index + one page per case study), Photography, Services, About, Contact. Plus /thank-you/ (no-JS form fallback) and 404.
- 2026-10-19: Single primary action on every page: submit an inquiry. Replaces "Book a call." CTA label everywhere: "Start an inquiry"; form button "Send inquiry"; success "Inquiry sent."
- 2026-10-19: Services presented as three pillars (Growth marketing, Creative production, Retail and sales enablement) covering nine services.
- 2026-10-19: Work page grouped by pillar. Case study URLs: /work/roi-calculator/, /work/3d-model-viewer/, /work/ai-microsite-outreach/, /work/linkedin-growth/, /work/email-marketing-automations/, /work/ace-trade-show/.

## Copy

- 2026-10-19: Voice: confident, specific, a little playful. No agency clichés. Minimal copy.
- 2026-10-19: No invented results, client names, quotes, or metrics; use [PLACEHOLDER].
- 2026-10-19: Draft homepage headline: "Three vendors. One studio." with the draft positioning line as the lede. To test.

## Tech

- 2026-10-19: Platform: coded site on Cloudflare Workers with static assets (no framework, no build step). Repo structure per README.
- 2026-10-19: Inquiry form posts to /api/inquiry in the Worker. Email via Resend (preferred) or Cloudflare Email Routing. Fields: name, email, company, topic (Project inquiry / Hiring / Collaboration / Other), message. Honeypot spam check.
- 2026-10-19: Non-production hosts (workers.dev) send X-Robots-Tag noindex. www redirects to the apex domain.
- 2026-10-19: Strict CSP (no inline scripts or styles). Mobile-first, WCAG AA, works without JS.
- OPEN: Email provider choice depends on whether christian@jrchicago.com is a real mailbox (Resend) or a forwarding address (Email Routing).
