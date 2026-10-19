/* Junior Chicago · site.js
   Three small, independent pieces. Every page works without this file. */
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var STAR_PATH = "M12.0 1.0 L14.6 7.5 L21.5 6.5 L17.2 12.0 L21.5 17.5 L14.6 16.5 L12.0 23.0 L9.4 16.5 L2.5 17.5 L6.8 12.0 L2.5 6.5 L9.4 7.5Z";
  var SVG_NS = "http://www.w3.org/2000/svg";

  /* ---------- 1. Mobile nav ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      toggle.textContent = open ? "Menu" : "Close";
      nav.classList.toggle("is-open", !open);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        toggle.click();
        toggle.focus();
      }
    });
  }

  /* ---------- 2. Signature star: a tiny clicker game ----------
     Press the star to earn stars. Spend stars to hire Junior Chicago (and friends),
     who press it for you. The point: it's easier with Junior.
     Progress saves in this browser. Tune the economy in the shop markup in index.html
     (data-cost, data-rate) and the numbers below. */
  var game = document.querySelector("[data-star-game]");
  if (game) {
    var stage = game.querySelector("[data-star-stage]");
    var button = game.querySelector("[data-star]");
    var panel = game.querySelector("[data-game-panel]");
    var status = game.querySelector("[data-star-status]");
    var bankEl = game.querySelector("[data-bank]");
    var bankUnit = game.querySelector("[data-bank-unit]");
    var rateEl = game.querySelector("[data-rate]");
    var burst = game.querySelector("[data-star-burst]");
    var orbit = game.querySelector("[data-orbit]");
    var nextEl = game.querySelector("[data-shop-next]");
    var resetBtn = game.querySelector("[data-reset]");
    var items = Array.prototype.slice.call(game.querySelectorAll("[data-item]"));

    var SAVE_KEY = "jc_game_v1";
    var PRESSES_TO_POP = 24;       // manual presses to inflate and pop the star
    var COST_GROWTH = 1.15;        // each purchase of the same item costs 15% more
    var OFFLINE_CAP_SECONDS = 7200; // Junior keeps working while you're away, up to 2 hours
    var MAX_ORBITERS = 10;

    panel.hidden = false;

    var state = load();
    var pumps = 0;
    var popping = false;

    // Welcome back: pay out what Junior earned while you were gone
    var away = Math.min((Date.now() - (state.savedAt || Date.now())) / 1000, OFFLINE_CAP_SECONDS);
    var offline = Math.floor(away * rate());
    if (offline > 0) earn(offline);
    if (offline > 0 && away >= 60) {
      say("Welcome back. Junior earned " + fmt(offline) + " stars while you were away.");
    } else if (state.earned > 0) {
      say("Welcome back. Press the star, or let Junior do it.");
    }

    renderShop();
    renderOrbit();
    renderBank();

    /* Manual press */
    button.addEventListener("click", function (e) {
      if (popping) return;
      earn(1);
      pumps += 1;
      stage.style.setProperty("--inflate", String(Math.min(pumps / PRESSES_TO_POP, 1)));
      squish();
      floatText("+1", e);

      if (pumps >= PRESSES_TO_POP) {
        pop();
      } else if (!state.flags.firstPress) {
        state.flags.firstPress = true;
        say("+1 star. Keep going. Junior Chicago costs 15.");
      } else if (!state.owned.junior && state.bank >= 15 && !state.flags.canHire) {
        state.flags.canHire = true;
        say("You can afford Junior Chicago. Hire them below, and they'll press it for you.");
      }
      renderBank();
      renderShop();
    });

    /* Shop */
    items.forEach(function (li) {
      li.querySelector("button").addEventListener("click", function () {
        var id = li.getAttribute("data-item");
        var cost = costOf(li);
        if (state.bank < cost) {
          say("You need " + fmt(Math.ceil(cost - state.bank)) + " more stars for " + nameOf(li) + ".");
          return;
        }
        state.bank -= cost;
        state.owned[id] = (state.owned[id] || 0) + 1;
        afterPurchase(id, li);
        renderShop();
        renderOrbit();
        renderBank();
        save();
      });
    });

    function afterPurchase(id, li) {
      if (id === "junior" && state.owned.junior === 1) {
        say("See? Easier with Junior. Junior Chicago now presses the star for you.");
      } else if (rate() >= 100 && !state.flags.pitched) {
        state.flags.pitched = true;
        sayHTML('Over 100 stars a second without lifting a finger. That\'s what Junior does for real brands. <a href="/contact/">Start an inquiry</a>');
      } else {
        say(nameOf(li) + " added. Now earning " + fmt(rate()) + " per second.");
      }
    }

    resetBtn.addEventListener("click", function () {
      if (!window.confirm("Start over? This clears your stars and hires.")) return;
      state = fresh();
      pumps = 0;
      stage.style.setProperty("--inflate", "0");
      save();
      renderShop();
      renderOrbit();
      renderBank();
      say("Fresh start. Press the star to start earning.");
    });

    /* The engine: earn passive stars every frame, redraw a few times a second */
    var last = performance.now();
    var sinceDraw = 0;
    var sinceTap = 0;
    var sinceSave = 0;
    function tick(now) {
      var dt = Math.min((now - last) / 1000, 1);
      last = now;
      var r = rate();
      if (r > 0) {
        earn(r * dt);
        sinceTap += dt;
        if (sinceTap >= 1) {
          sinceTap = 0;
          autoTap(r);
        }
      }
      sinceDraw += dt;
      if (sinceDraw >= 0.1) { sinceDraw = 0; renderBank(); renderShop(); }
      sinceSave += dt;
      if (sinceSave >= 5) { sinceSave = 0; save(); }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", function () { if (document.hidden) save(); });

    /* ---- helpers ---- */
    function fresh() { return { bank: 0, earned: 0, owned: {}, pops: 0, flags: {}, savedAt: Date.now() }; }
    function load() {
      try {
        var s = JSON.parse(localStorage.getItem(SAVE_KEY));
        if (s && typeof s.bank === "number") { s.owned = s.owned || {}; s.flags = s.flags || {}; return s; }
      } catch (e) { /* no saved game */ }
      return fresh();
    }
    function save() {
      state.savedAt = Date.now();
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ }
    }
    function earn(n) { state.bank += n; state.earned += n; }
    function rate() {
      return items.reduce(function (sum, li) {
        return sum + (state.owned[li.getAttribute("data-item")] || 0) * Number(li.getAttribute("data-rate"));
      }, 0);
    }
    function costOf(li) {
      var base = Number(li.getAttribute("data-cost"));
      return Math.ceil(base * Math.pow(COST_GROWTH, state.owned[li.getAttribute("data-item")] || 0));
    }
    function nameOf(li) { return li.querySelector(".shop-name").textContent; }
    function fmt(n) {
      n = Math.floor(n);
      if (n < 1e6) return n.toLocaleString("en-US");
      return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
    }
    function say(text) { status.textContent = text; }
    function sayHTML(html) { status.innerHTML = html; }

    function renderBank() {
      var b = Math.floor(state.bank);
      bankEl.textContent = fmt(b);
      bankUnit.textContent = b === 1 ? "star" : "stars";
      var r = rate();
      rateEl.textContent = r % 1 ? r.toFixed(1) : fmt(r);
    }

    function renderShop() {
      var nextLocked = null;
      items.forEach(function (li, i) {
        var id = li.getAttribute("data-item");
        var owned = state.owned[id] || 0;
        var cost = costOf(li);
        var base = Number(li.getAttribute("data-cost"));
        // Unlock an item once you've earned half its price, or own the one before it
        var prevOwned = i === 0 || (state.owned[items[i - 1].getAttribute("data-item")] || 0) > 0;
        var unlocked = i === 0 || owned > 0 || (prevOwned && state.earned >= base * 0.5);
        li.hidden = !unlocked;
        if (!unlocked && !nextLocked && prevOwned) nextLocked = { li: li, at: base * 0.5 };

        var btn = li.querySelector("button");
        var affordable = state.bank >= cost;
        btn.setAttribute("aria-disabled", String(!affordable));
        btn.classList.toggle("is-affordable", affordable);
        li.querySelector("[data-cost-label]").textContent = fmt(cost);
        var ownedEl = li.querySelector("[data-owned]");
        ownedEl.hidden = owned === 0;
        ownedEl.textContent = owned;
        ownedEl.setAttribute("aria-label", owned + " owned");
      });
      nextEl.textContent = nextLocked
        ? "Next unlock at " + fmt(nextLocked.at) + " stars earned."
        : "";
    }

    function renderOrbit() {
      var n = Math.min(state.owned.junior || 0, MAX_ORBITERS);
      if (orbit.children.length === n) return;
      orbit.innerHTML = "";
      for (var i = 0; i < n; i++) {
        var chip = document.createElement("span");
        chip.className = "orbiter";
        chip.textContent = "Jr";
        chip.style.setProperty("--a", (360 / n) * i + "deg");
        orbit.appendChild(chip);
      }
    }

    function autoTap(r) {
      if (reduceMotion || popping) return;
      var chips = orbit.children;
      if (chips.length) {
        var c = chips[Math.floor(Math.random() * chips.length)];
        c.classList.remove("is-tapping");
        void c.offsetWidth;
        c.classList.add("is-tapping");
      }
      stage.classList.remove("is-auto");
      void stage.offsetWidth;
      stage.classList.add("is-auto");
      floatText("+" + (r % 1 ? r.toFixed(1) : fmt(r)), null, true);
    }

    function squish() {
      if (reduceMotion) return;
      stage.classList.remove("is-pumped");
      void stage.offsetWidth;
      stage.classList.add("is-pumped");
    }

    function floatText(text, e, auto) {
      if (reduceMotion) return;
      var rect = stage.getBoundingClientRect();
      var x = e && e.clientX ? e.clientX - rect.left : rect.width * (0.3 + Math.random() * 0.4);
      var y = e && e.clientY ? e.clientY - rect.top : rect.height * (0.2 + Math.random() * 0.2);
      var el = document.createElement("span");
      el.className = "plus-one" + (auto ? " plus-one--auto" : "");
      el.textContent = text;
      el.style.left = x + "px";
      el.style.top = y - 20 + "px";
      stage.appendChild(el);
      setTimeout(function () { el.remove(); }, 750);
    }

    function pop() {
      popping = true;
      var bonus = Math.max(10, Math.floor(rate() * 10));
      earn(bonus);
      state.pops += 1;
      stage.classList.add("is-popped");
      for (var i = 0; i < 16; i++) {
        var angle = (Math.PI * 2 * i) / 16 + Math.random() * 0.4;
        var dist = 120 + Math.random() * 140;
        var s = document.createElementNS(SVG_NS, "svg");
        s.setAttribute("viewBox", "0 0 24 24");
        s.setAttribute("class", "burst-star");
        var p = document.createElementNS(SVG_NS, "path");
        p.setAttribute("d", STAR_PATH);
        s.appendChild(p);
        s.style.setProperty("--dx", Math.cos(angle) * dist + "px");
        s.style.setProperty("--dy", Math.sin(angle) * dist + "px");
        s.style.setProperty("--s", String(0.6 + Math.random() * 0.9));
        s.style.setProperty("--r", Math.round(Math.random() * 360) + "deg");
        burst.appendChild(s);
      }
      say("Pop! +" + fmt(bonus) + " bonus stars. Bigger than it needs to be.");
      save();

      setTimeout(function () {
        burst.innerHTML = "";
        pumps = 0;
        stage.style.setProperty("--inflate", "0");
        stage.classList.remove("is-popped", "is-pumped");
        stage.classList.add("is-regrowing");
        void stage.offsetWidth;
        stage.classList.remove("is-regrowing");
        popping = false;
      }, 950);
    }
  }

  /* ---------- 3. Inquiry form: inline validation and submit without leaving the page ---------- */
  var form = document.querySelector("[data-inquiry-form]");
  if (form) {
    var statusEl = form.querySelector("[data-form-status]");
    var success = document.querySelector("[data-form-success]");
    var submit = form.querySelector('button[type="submit"]');
    form.setAttribute("novalidate", "");

    // Preselect topic from the URL, e.g. /contact/?about=hiring
    var about = new URLSearchParams(location.search).get("about");
    if (about) {
      var map = { project: "Project inquiry", hiring: "Hiring", collaboration: "Collaboration", other: "Other" };
      var match = form.querySelector('input[name="topic"][value="' + (map[about.toLowerCase()] || "") + '"]');
      if (match) match.checked = true;
    }

    var MESSAGES = {
      name: "Add your name.",
      email: "Add an email address so there's somewhere to reply.",
      emailFormat: "That email address is missing something. Check for an @ and a domain.",
      topic: "Pick what you're reaching out about.",
      message: "Add a message. A few lines is plenty."
    };

    function setError(field, msg) {
      var input = field === "topic" ? form.querySelector('input[name="topic"]') : form.elements[field];
      var err = document.getElementById("f-" + field + "-error");
      if (!err) return;
      if (msg) {
        err.textContent = msg;
        err.hidden = false;
        if (field !== "topic") {
          input.setAttribute("aria-invalid", "true");
          input.setAttribute("aria-describedby", err.id);
        }
      } else {
        err.hidden = true;
        err.textContent = "";
        if (field !== "topic" && input) {
          input.removeAttribute("aria-invalid");
          input.removeAttribute("aria-describedby");
        }
      }
    }

    function validate() {
      var errors = {};
      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      var topic = form.querySelector('input[name="topic"]:checked');
      var message = form.elements.message.value.trim();
      if (!name) errors.name = MESSAGES.name;
      if (!email) errors.email = MESSAGES.email;
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = MESSAGES.emailFormat;
      if (!topic) errors.topic = MESSAGES.topic;
      if (!message) errors.message = MESSAGES.message;
      ["name", "email", "topic", "message"].forEach(function (f) { setError(f, errors[f]); });
      return errors;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var errors = validate();
      var first = Object.keys(errors)[0];
      if (first) {
        statusEl.textContent = "Check the highlighted fields.";
        statusEl.classList.add("is-error");
        var target = first === "topic" ? form.querySelector('input[name="topic"]') : form.elements[first];
        target.focus();
        return;
      }

      statusEl.textContent = "Sending…";
      statusEl.classList.remove("is-error");
      submit.setAttribute("aria-busy", "true");
      submit.disabled = true;

      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
        .then(function (r) {
          if (r.ok && r.data.ok) {
            form.hidden = true;
            success.hidden = false;
            success.focus();
            return;
          }
          if (r.data && r.data.errors) {
            Object.keys(r.data.errors).forEach(function (f) { setError(f, r.data.errors[f]); });
          }
          throw new Error((r.data && r.data.message) || "send failed");
        })
        .catch(function (err) {
          statusEl.classList.add("is-error");
          statusEl.textContent = err && err.message && err.message !== "send failed" && err.message !== "Failed to fetch"
            ? err.message
            : "The inquiry didn't send. Try again, or email christian@jrchicago.com.";
        })
        .finally(function () {
          submit.removeAttribute("aria-busy");
          submit.disabled = false;
        });
    });
  }
})();
