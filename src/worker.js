/**
 * Junior Chicago · Cloudflare Worker
 *
 * Every request comes through here first (assets.run_worker_first = true):
 *   POST /api/inquiry   → validate the form and email it to INQUIRY_TO
 *   everything else     → static files from ./public via the ASSETS binding
 * Then security headers are added, and any host that isn't production
 * (e.g. *.workers.dev previews) is marked noindex so drafts never show up in Google.
 *
 * Email delivery, first match wins:
 *   1. RESEND_API_KEY secret is set   → Resend API (works wherever your mailbox is hosted)
 *   2. INQUIRY_EMAIL binding exists   → Cloudflare Email Routing (needs Email Routing on jrchicago.com)
 *   3. ALLOW_LOG_ONLY = "true"        → logged to the console only (local dev)
 *   otherwise                         → the visitor sees an error with your email address, so no lead is silently lost
 */
import { EmailMessage } from "cloudflare:email";

const TOPICS = ["Project inquiry", "Hiring", "Collaboration", "Other"];
const LIMITS = { name: 120, email: 254, company: 160, message: 5000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const prodHost = env.PRODUCTION_HOST || "jrchicago.com";

    // www → apex, one canonical address
    if (url.hostname === `www.${prodHost}`) {
      url.hostname = prodHost;
      return Response.redirect(url.toString(), 301);
    }

    let response;
    if (url.pathname === "/api/inquiry" || url.pathname === "/api/inquiry/") {
      response = await handleInquiry(request, env, url);
    } else {
      response = await env.ASSETS.fetch(request);
    }
    return withHeaders(response, url, prodHost);
  },
};

/* ---------------- Inquiry form ---------------- */

async function handleInquiry(request, env, url) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
  }

  const wantsJSON = (request.headers.get("Accept") || "").includes("application/json");
  const reply = (status, body) =>
    wantsJSON ? json(status, body) : status === 200 ? redirect("/thank-you/") : htmlError(status, body);

  // Only accept posts from this site
  const origin = request.headers.get("Origin");
  if (origin && safeHost(origin) !== url.host) {
    return reply(403, { ok: false, message: "This form can only be sent from jrchicago.com." });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return reply(400, { ok: false, message: "The form data couldn't be read. Reload the page and try again." });
  }

  // Honeypot: real people never fill this in. Pretend it worked.
  if (clean(form.get("company_website"))) {
    return reply(200, { ok: true });
  }

  const data = {
    name: clean(form.get("name"), LIMITS.name),
    email: clean(form.get("email"), LIMITS.email),
    company: clean(form.get("company"), LIMITS.company),
    topic: clean(form.get("topic")),
    message: clean(form.get("message"), LIMITS.message, true),
  };

  const errors = {};
  if (!data.name) errors.name = "Add your name.";
  if (!data.email) errors.email = "Add an email address so there's somewhere to reply.";
  else if (!EMAIL_RE.test(data.email)) errors.email = "That email address is missing something. Check for an @ and a domain.";
  if (!TOPICS.includes(data.topic)) errors.topic = "Pick what you're reaching out about.";
  if (!data.message) errors.message = "Add a message. A few lines is plenty.";

  if (Object.keys(errors).length) {
    return reply(422, { ok: false, errors, message: "Check the highlighted fields." });
  }

  try {
    await deliver(env, data, request);
  } catch (err) {
    console.error("Inquiry delivery failed:", err && err.message, JSON.stringify(data));
    const to = env.INQUIRY_TO || "christian@jrchicago.com";
    return reply(502, { ok: false, message: `The inquiry didn't send. Email ${to} directly and it'll get the same attention.` });
  }

  return reply(200, { ok: true });
}

async function deliver(env, data, request) {
  const to = env.INQUIRY_TO || "christian@jrchicago.com";
  const from = env.INQUIRY_FROM || "inquiry@jrchicago.com";
  const subject = `[jrchicago.com] ${data.topic} from ${data.name}`;
  const text = [
    `Name:     ${data.name}`,
    `Email:    ${data.email}`,
    `Company:  ${data.company || "(not given)"}`,
    `About:    ${data.topic}`,
    "",
    data.message,
    "",
    "—",
    `Sent ${new Date().toISOString()} from ${request.cf?.city || "?"}, ${request.cf?.country || "?"}`,
    "Reply to this email to answer them directly.",
  ].join("\n");

  if (env.RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `Junior Chicago site <${from}>`,
        to: [to],
        reply_to: data.email,
        subject,
        text,
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    return;
  }

  if (env.INQUIRY_EMAIL) {
    const raw = buildMime({ from, to, replyTo: data.email, subject, text });
    await env.INQUIRY_EMAIL.send(new EmailMessage(from, to, raw));
    return;
  }

  if (env.ALLOW_LOG_ONLY === "true") {
    console.log("INQUIRY (log-only mode, not emailed):\n" + text);
    return;
  }

  throw new Error("No email provider configured. Set RESEND_API_KEY or add the INQUIRY_EMAIL binding.");
}

/* ---------------- Helpers ---------------- */

function clean(value, max = 500, multiline = false) {
  if (typeof value !== "string") return "";
  let v = value.replace(/\r\n?/g, "\n");
  // Strip control characters; keep newlines and tabs only in multi-line fields
  v = multiline ? v.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "") : v.replace(/[\u0000-\u001F\u007F]/g, " ");
  return v.trim().slice(0, max);
}

function safeHost(u) {
  try { return new URL(u).host; } catch { return ""; }
}

function headerSafe(v) {
  return String(v).replace(/[\r\n]+/g, " ").trim();
}

function encodeWord(v) {
  v = headerSafe(v);
  return /^[\x20-\x7E]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`;
}

function b64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function buildMime({ from, to, replyTo, subject, text }) {
  const domain = from.split("@")[1] || "jrchicago.com";
  const body = b64(text).replace(/.{1,76}/g, "$&\r\n");
  return [
    `From: Junior Chicago site <${headerSafe(from)}>`,
    `To: <${headerSafe(to)}>`,
    `Reply-To: <${headerSafe(replyTo)}>`,
    `Subject: ${encodeWord(subject)}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    body,
  ].join("\r\n");
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function redirect(location) {
  return new Response(null, { status: 303, headers: { Location: location } });
}

function htmlError(status, body) {
  const list = body.errors
    ? `<ul>${Object.values(body.errors).map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>`
    : "";
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Inquiry not sent | Junior Chicago</title><link rel="stylesheet" href="/assets/styles.css"></head>
<body><main id="main"><section class="page-hero page-hero--center"><div class="wrap">
<h1>Inquiry not sent.</h1><p class="lede">${escapeHtml(body.message || "Something went wrong.")}</p>${list}
<div class="button-row button-row--center"><a class="button button--red" href="/contact/">Back to the form</a></div>
</div></section></main></body></html>`;
  return new Response(page, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/* ---------------- Response headers ---------------- */

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

function withHeaders(response, url, prodHost) {
  const res = new Response(response.body, response);
  const h = res.headers;
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  h.set("X-Frame-Options", "DENY");
  if (url.protocol === "https:") h.set("Strict-Transport-Security", "max-age=31536000");

  const type = h.get("Content-Type") || "";
  if (type.includes("text/html")) h.set("Content-Security-Policy", CSP);

  // Long cache for fonts/images; CSS and JS revalidate so edits show up right away
  if (/\.(svg|png|jpe?g|webp|avif|woff2?)$/.test(url.pathname)) {
    h.set("Cache-Control", "public, max-age=604800");
  }

  if (url.hostname !== prodHost) h.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}
