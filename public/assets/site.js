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

  /* ---------- 2. Signature star: press to inflate, it pops at the top ---------- */
  var stage = document.querySelector("[data-star-stage]");
  if (stage) {
    var button = stage.querySelector("[data-star]");
    var status = stage.querySelector("[data-star-status]");
    var countEl = stage.querySelector("[data-star-count]");
    var burst = stage.querySelector("[data-star-burst]");

    var PUMPS_TO_POP = 24;
    // Messages fire once at each threshold. Edit freely; keep them short.
    var LINES = {
      1: "Again.",
      4: "Bigger.",
      9: "Bigger than the brief.",
      15: "Now that's a statement piece.",
      21: "Careful."
    };
    var POP_LINE = 'Pop. That\'s the idea: bigger than it needs to be. <a href="/contact/">Start an inquiry</a>';

    var pumps = 0;
    var busy = false;
    var pops = readPops();
    renderCount();

    button.addEventListener("click", function (e) {
      if (busy) return;
      pumps += 1;
      stage.style.setProperty("--inflate", String(Math.min(pumps / PUMPS_TO_POP, 1)));

      if (!reduceMotion) {
        stage.classList.remove("is-pumped");
        void stage.offsetWidth; // restart the squish animation
        stage.classList.add("is-pumped");
        plusOne(e);
      }

      if (pumps >= PUMPS_TO_POP) {
        pop();
      } else if (LINES[pumps]) {
        status.textContent = LINES[pumps];
      }
    });

    function plusOne(e) {
      var rect = stage.getBoundingClientRect();
      var x = e.clientX ? e.clientX - rect.left : rect.width / 2;
      var y = e.clientY ? e.clientY - rect.top : rect.height * 0.35;
      var el = document.createElement("span");
      el.className = "plus-one";
      el.textContent = "+1";
      el.style.left = x + "px";
      el.style.top = y - 20 + "px";
      stage.appendChild(el);
      setTimeout(function () { el.remove(); }, 750);
    }

    function pop() {
      busy = true;
      stage.classList.add("is-popped");
      for (var i = 0; i < 16; i++) {
        var angle = (Math.PI * 2 * i) / 16 + Math.random() * 0.4;
        var dist = 140 + Math.random() * 160;
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
      pops += 1;
      savePops(pops);
      status.innerHTML = POP_LINE;
      renderCount();

      setTimeout(function () {
        burst.innerHTML = "";
        pumps = 0;
        stage.style.setProperty("--inflate", "0");
        stage.classList.remove("is-popped", "is-pumped");
        stage.classList.add("is-regrowing");
        void stage.offsetWidth;
        stage.classList.remove("is-regrowing");
        busy = false;
      }, 950);
    }

    function renderCount() {
      if (!countEl) return;
      if (pops > 0) {
        countEl.hidden = false;
        countEl.textContent = "Stars popped: " + pops;
      }
    }
    function readPops() {
      try { return parseInt(localStorage.getItem("jc_pops") || "0", 10) || 0; } catch (e) { return 0; }
    }
    function savePops(n) {
      try { localStorage.setItem("jc_pops", String(n)); } catch (e) { /* storage blocked: fine */ }
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
