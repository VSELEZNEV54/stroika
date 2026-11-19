/* =========================================================
   ОСНОВА — демо-макет. Анимации, модальные окна, формы.
   Без зависимостей (Lenis — опционально, для плавного скролла)
   ========================================================= */
(function () {
  "use strict";

  var doc = document.documentElement;
  doc.classList.remove("no-js");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---------- Smooth scroll (Lenis) ---------- */
  var lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
    var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  function scrollToTarget(el) {
    var offset = -(parseInt(getComputedStyle(doc).getPropertyValue("--header-h"), 10) || 70) + 1;
    if (lenis) lenis.scrollTo(el, { offset: offset, duration: 1.4 });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset + offset, behavior: reduce ? "auto" : "smooth" });
  }
  function lockScroll(on) {
    if (lenis) { on ? lenis.stop() : lenis.start(); }
    document.body.style.overflow = on ? "hidden" : "";
  }

  /* ---------- Page loaded: hero intro ---------- */
  window.addEventListener("load", function () { doc.classList.add("is-loaded"); });
  setTimeout(function () { doc.classList.add("is-loaded"); }, 1600);

  /* ---------- Header: hide on scroll down, solid after hero ---------- */
  var header = document.querySelector(".header");
  var fab = document.querySelector(".fab");
  var lastY = window.pageYOffset;
  function onScroll() {
    var y = window.pageYOffset;
    if (header) {
      header.classList.toggle("is-scrolled", y > 40);
      if (!document.body.classList.contains("menu-open")) {
        header.classList.toggle("is-hidden", y > lastY && y > 400);
      }
    }
    if (fab) fab.classList.toggle("is-visible", y > window.innerHeight * 0.8);
    lastY = y;
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Anchor links ---------- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href");
    if (id.length < 2) return;
    var el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    closeMenu();
    scrollToTarget(el);
  });

  /* ---------- Split words for heading reveal ---------- */
  document.querySelectorAll("[data-split]").forEach(function (el) {
    var i = 0;
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var parts = child.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
            var outer = document.createElement("span");
            outer.className = "sw";
            var inner = document.createElement("span");
            inner.style.setProperty("--i", i++);
            inner.textContent = p;
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          walk(child);
        }
      });
    };
    walk(el);
  });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll("[data-reveal], [data-split], .gantt");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.01 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Statement: word-by-word highlight on scroll ---------- */
  var hlEls = document.querySelectorAll("[data-highlight]");
  hlEls.forEach(function (el) {
    var html = "", prevText = "";
    el.childNodes.forEach(function (n) {
      var isHl = n.nodeType === 1 && n.classList.contains("hl");
      var text = n.textContent;
      // склеиваем, только если между узлами нет пробела (например, запятая сразу после выделения)
      var glue = html && !/^\s/.test(text) && !/\s$/.test(prevText);
      prevText = text;
      text.split(/\s+/).forEach(function (w, i) {
        if (!w) return;
        if (i === 0 && glue) html = html.replace(/ $/, "");
        html += '<span class="w' + (isHl ? " hl" : "") + '">' + w + "</span> ";
      });
    });
    el.innerHTML = html;
  });
  function updateHighlight() {
    var vh = window.innerHeight;
    hlEls.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var start = vh * 0.85, end = vh * 0.35;
      var p = (start - r.top) / (r.height + (start - end));
      p = Math.max(0, Math.min(1, p));
      var words = el.querySelectorAll(".w");
      var n = Math.round(p * words.length);
      words.forEach(function (w, i) { w.classList.toggle("is-on", i < n); });
    });
  }
  if (hlEls.length) {
    if (reduce) hlEls.forEach(function (el) { el.querySelectorAll(".w").forEach(function (w) { w.classList.add("is-on"); }); });
    else { window.addEventListener("scroll", updateHighlight, { passive: true }); updateHighlight(); }
  }

  /* ---------- Counters ---------- */
  function fmt(n, dec) {
    var s = n.toFixed(dec);
    var parts = s.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return parts.join(",");
  }
  var counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        cio.unobserve(el);
        var to = parseFloat(el.getAttribute("data-count"));
        var dec = parseInt(el.getAttribute("data-dec") || "0", 10);
        if (reduce) { el.textContent = fmt(to, dec); return; }
        var dur = 1800, t0 = performance.now();
        var tick = function (t) {
          var k = Math.min(1, (t - t0) / dur);
          var e = 1 - Math.pow(1 - k, 4);
          el.textContent = fmt(to * e, dec);
          if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { el.textContent = fmt(0, parseInt(el.getAttribute("data-dec") || "0", 10)); cio.observe(el); });
  }

  /* ---------- Parallax ---------- */
  var pEls = document.querySelectorAll("[data-parallax]");
  function parallax() {
    var vh = window.innerHeight;
    pEls.forEach(function (el) {
      var r = el.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var k = parseFloat(el.getAttribute("data-parallax")) || 0.1;
      var c = (r.top + r.height / 2 - vh / 2) * -k;
      el.style.transform = "translate3d(0," + c.toFixed(1) + "px,0)";
    });
  }
  if (pEls.length && !reduce) { window.addEventListener("scroll", parallax, { passive: true }); parallax(); }

  /* ---------- Hero: crosshair + coordinates, clock ---------- */
  var hero = document.querySelector(".hero");
  var ch = document.querySelector(".crosshair");
  if (hero && ch && finePointer) {
    var read = ch.querySelector(".crosshair__read");
    hero.addEventListener("mousemove", function (e) {
      var r = hero.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      ch.style.setProperty("--x", x + "px");
      ch.style.setProperty("--y", y + "px");
      if (read) read.textContent = "X " + String(Math.round(x)).padStart(4, "0") + "  Y " + String(Math.round(y)).padStart(4, "0");
    });
  }
  var clock = document.querySelector("[data-clock]");
  if (clock) {
    var tickClock = function () {
      var d = new Date();
      clock.textContent = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    };
    tickClock(); setInterval(tickClock, 15000);
  }

  /* ---------- Projects filter ---------- */
  var filters = document.querySelectorAll("[data-filter]");
  var grid = document.querySelector(".projects");
  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var f = btn.getAttribute("data-filter");
      filters.forEach(function (b) { b.classList.toggle("is-active", b === btn); b.setAttribute("aria-pressed", b === btn); });
      if (!grid) return;
      grid.classList.toggle("is-filtered", f !== "all");
      grid.querySelectorAll(".pcard").forEach(function (card, i) {
        var cats = (card.getAttribute("data-cat") || "").split(" ");
        var show = f === "all" || cats.indexOf(f) > -1;
        card.classList.toggle("is-hidden", !show);
        if (show && !reduce) {
          card.classList.remove("is-in");
          card.style.setProperty("--d", (i % 4) * 0.06 + "s");
          requestAnimationFrame(function () { requestAnimationFrame(function () { card.classList.add("is-in"); }); });
        }
      });
      var count = document.querySelector("[data-projects-count]");
      if (count) count.textContent = String(grid.querySelectorAll(".pcard:not(.is-hidden)").length).padStart(2, "0");
    });
  });

  // карточки направлений: включают фильтр и прокручивают к проектам
  document.querySelectorAll("[data-filter-go]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      var chip = document.querySelector('[data-filter="' + el.getAttribute("data-filter-go") + '"]');
      chip && chip.click();
      var target = document.getElementById("projects");
      target && scrollToTarget(target);
    });
  });

  // фильтр вакансий
  var vf = document.querySelectorAll("[data-vfilter]");
  vf.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var f = btn.getAttribute("data-vfilter");
      vf.forEach(function (b) { b.classList.toggle("is-active", b === btn); b.setAttribute("aria-pressed", b === btn); });
      document.querySelectorAll(".vrow").forEach(function (row) {
        var show = f === "all" || (row.getAttribute("data-vcat") || "").split(" ").indexOf(f) > -1;
        row.style.display = show ? "" : "none";
      });
    });
  });

  /* ---------- Services accordion ---------- */
  var srvs = document.querySelectorAll(".srv");
  var srvImgs = document.querySelectorAll(".services__sticky img");
  var srvCap = document.querySelector("[data-srv-caption]");
  srvs.forEach(function (item, idx) {
    var btn = item.querySelector(".srv__btn");
    btn.addEventListener("click", function () {
      var open = item.classList.contains("is-open");
      srvs.forEach(function (s) { s.classList.remove("is-open"); s.querySelector(".srv__btn").setAttribute("aria-expanded", "false"); });
      if (!open) {
        item.classList.add("is-open");
        btn.setAttribute("aria-expanded", "true");
        var img = item.getAttribute("data-img");
        srvImgs.forEach(function (im) { im.classList.toggle("is-active", im.getAttribute("data-key") === img); });
        if (srvCap) srvCap.textContent = item.querySelector(".srv__title").textContent;
      }
    });
    item.addEventListener("mouseenter", function () {
      if (!finePointer) return;
      var img = item.getAttribute("data-img");
      srvImgs.forEach(function (im) { im.classList.toggle("is-active", im.getAttribute("data-key") === img); });
      if (srvCap) srvCap.textContent = item.querySelector(".srv__title").textContent;
    });
  });

  /* ---------- Menu overlay ---------- */
  var menu = document.querySelector(".menu");
  var menuBtns = document.querySelectorAll("[data-menu-toggle]");
  function openMenu() {
    if (!menu) return;
    menu.classList.add("is-open");
    document.body.classList.add("menu-open");
    header && header.classList.remove("is-hidden");
    menuBtns.forEach(function (b) { b.setAttribute("aria-expanded", "true"); b.classList.add("is-active"); });
    lockScroll(true);
  }
  function closeMenu() {
    if (!menu || !menu.classList.contains("is-open")) return;
    menu.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    menuBtns.forEach(function (b) { b.setAttribute("aria-expanded", "false"); b.classList.remove("is-active"); });
    lockScroll(false);
  }
  menuBtns.forEach(function (b) {
    b.addEventListener("click", function () { menu.classList.contains("is-open") ? closeMenu() : openMenu(); });
  });

  /* ---------- Modals ---------- */
  var activeModal = null, lastFocus = null;
  function openModal(id, opts) {
    var m = document.getElementById(id);
    if (!m) return;
    closeMenu();
    if (activeModal) closeModal(true);
    opts = opts || {};
    if (id === "modal-demo") {
      var txt = m.querySelector(".demo__text");
      if (txt) {
        var sec = opts.section || "";
        if (sec && sec.indexOf("«") === -1) sec = "«" + sec + "»";
        txt.innerHTML = (sec ? "<b>" + sec + "</b> — этого раздела" : "Этого раздела") +
          " нет в демо‑макете. Он будет сделан в процессе работы над сайтом.";
      }
    }
    var wrap = m.classList.contains("form-wrap") ? m : m.querySelector(".form-wrap");
    if (wrap) { wrap.classList.remove("is-sent"); var f = wrap.querySelector("form"); f && f.reset(); clearErrors(f); resetFiles(f); }
    if (id === "modal-apply") {
      var sel = m.querySelector("select[name=vacancy]");
      if (sel) sel.value = opts.vacancy || "";
    }
    lastFocus = document.activeElement;
    m.classList.add("is-open");
    m.setAttribute("aria-hidden", "false");
    activeModal = m;
    lockScroll(true);
    setTimeout(function () {
      var first = m.querySelector("input, select, textarea, button:not(.modal__close)") || m.querySelector(".modal__close");
      first && first.focus({ preventScroll: true });
    }, 350);
  }
  function closeModal(silent) {
    if (!activeModal) return;
    activeModal.classList.remove("is-open");
    activeModal.setAttribute("aria-hidden", "true");
    activeModal = null;
    if (!silent) { lockScroll(false); lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true }); }
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-modal]");
    if (t) {
      e.preventDefault();
      openModal("modal-" + t.getAttribute("data-modal"), { vacancy: t.getAttribute("data-vacancy") });
      return;
    }
    var d = e.target.closest("[data-demo]");
    if (d) {
      e.preventDefault();
      openModal("modal-demo", { section: d.getAttribute("data-demo") });
      return;
    }
    if (e.target.closest("[data-close]")) { e.preventDefault(); closeModal(); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { if (lb && lb.classList.contains("is-open")) closeLb(); else if (activeModal) closeModal(); else closeMenu(); }
    if (e.key === "Tab" && activeModal) {
      var f = activeModal.querySelectorAll('a[href], button:not([disabled]), input:not([type=hidden]):not([tabindex="-1"]), select, textarea');
      var list = Array.prototype.filter.call(f, function (el) { return el.offsetParent !== null; });
      if (!list.length) return;
      var first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  // Lenis не должен перехватывать скролл внутри модалок
  document.querySelectorAll(".modal__panel, .menu__in").forEach(function (p) { p.setAttribute("data-lenis-prevent", ""); });

  /* ---------- Forms ---------- */
  function clearErrors(form) {
    if (!form) return;
    form.querySelectorAll(".is-error").forEach(function (el) { el.classList.remove("is-error"); });
  }
  function resetFiles(form) {
    if (!form) return;
    form.querySelectorAll(".file").forEach(function (f) {
      var t = f.querySelector("[data-file-name]");
      if (t) t.textContent = t.getAttribute("data-default");
    });
  }
  // маска телефона
  document.querySelectorAll('input[type="tel"]').forEach(function (inp) {
    inp.addEventListener("input", function () {
      var d = inp.value.replace(/\D/g, "");
      if (d[0] === "8") d = "7" + d.slice(1);
      if (d && d[0] !== "7") d = "7" + d;
      d = d.slice(0, 11);
      var out = "";
      if (d.length) out = "+7";
      if (d.length > 1) out += " (" + d.slice(1, 4);
      if (d.length >= 4) out += ") " + d.slice(4, 7);
      if (d.length >= 7) out += "-" + d.slice(7, 9);
      if (d.length >= 9) out += "-" + d.slice(9, 11);
      inp.value = out;
    });
  });
  document.querySelectorAll(".file input").forEach(function (inp) {
    inp.addEventListener("change", function () {
      var t = inp.closest(".file").querySelector("[data-file-name]");
      if (!t) return;
      if (!t.getAttribute("data-default")) t.setAttribute("data-default", t.textContent);
      t.textContent = inp.files.length ? Array.prototype.map.call(inp.files, function (f) { return f.name; }).join(", ") : t.getAttribute("data-default");
    });
  });
  document.querySelectorAll(".file [data-file-name]").forEach(function (t) { t.setAttribute("data-default", t.textContent); });

  document.querySelectorAll("form[data-form]").forEach(function (form) {
    form.setAttribute("novalidate", "");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearErrors(form);
      var ok = true;
      form.querySelectorAll("[required]").forEach(function (inp) {
        var bad = false;
        if (inp.type === "checkbox") bad = !inp.checked;
        else if (inp.type === "email") bad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inp.value.trim());
        else if (inp.type === "tel") bad = inp.value.replace(/\D/g, "").length < 11;
        else bad = !inp.value.trim();
        if (bad) {
          ok = false;
          var holder = inp.closest(".field") || inp.closest(".check");
          holder && holder.classList.add("is-error");
        }
      });
      if (!ok) {
        var firstErr = form.querySelector(".is-error input, .is-error textarea, .is-error select");
        firstErr && firstErr.focus();
        return;
      }
      var btn = form.querySelector("[type=submit] .cta__label");
      var txt = btn ? btn.textContent : "";
      if (btn) btn.textContent = "Отправляем…";
      setTimeout(function () {
        if (btn) btn.textContent = txt;
        form.closest(".form-wrap").classList.add("is-sent");
      }, 900);
    });
    form.querySelectorAll("input, textarea, select").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var holder = inp.closest(".field") || inp.closest(".check");
        holder && holder.classList.remove("is-error");
      });
      inp.addEventListener("change", function () {
        var holder = inp.closest(".field") || inp.closest(".check");
        holder && holder.classList.remove("is-error");
      });
    });
  });

  /* ---------- Lightbox (страница проекта) ---------- */
  var lb = document.querySelector(".lightbox");
  var gItems = Array.prototype.slice.call(document.querySelectorAll("[data-gallery]"));
  var lbIndex = 0;
  function showLb(i) {
    if (!lb) return;
    lbIndex = (i + gItems.length) % gItems.length;
    var src = gItems[lbIndex].getAttribute("data-gallery");
    var img = lb.querySelector("img");
    img.src = src;
    img.alt = gItems[lbIndex].querySelector("img").alt;
    lb.querySelector(".lightbox__count").textContent = String(lbIndex + 1).padStart(2, "0") + " / " + String(gItems.length).padStart(2, "0");
  }
  function closeLb() { lb.classList.remove("is-open"); lockScroll(false); }
  if (lb) {
    lb.setAttribute("data-lenis-prevent", "");
    gItems.forEach(function (g, i) {
      g.addEventListener("click", function () { showLb(i); lb.classList.add("is-open"); lockScroll(true); });
      g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); g.click(); } });
    });
    lb.querySelector(".lightbox__nav--prev").addEventListener("click", function () { showLb(lbIndex - 1); });
    lb.querySelector(".lightbox__nav--next").addEventListener("click", function () { showLb(lbIndex + 1); });
    lb.querySelector(".lightbox__close").addEventListener("click", closeLb);
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "ArrowLeft") showLb(lbIndex - 1);
      if (e.key === "ArrowRight") showLb(lbIndex + 1);
    });
  }

  /* ---------- Свечение карточек за курсором ---------- */
  if (finePointer) {
    document.querySelectorAll("[data-glow]").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  /* ---------- География: список городов <-> метки ---------- */
  var cityRows = document.querySelectorAll("[data-city]");
  function setCity(name, on) {
    document.querySelectorAll('[data-city="' + name + '"]').forEach(function (el) { el.classList.toggle("is-active", on); });
  }
  cityRows.forEach(function (el) {
    var name = el.getAttribute("data-city");
    el.addEventListener("mouseenter", function () { setCity(name, true); });
    el.addEventListener("mouseleave", function () { setCity(name, false); });
  });

  /* ---------- Year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
