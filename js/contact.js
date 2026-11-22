// Contact form. Sends to the owner's own lead server (Lead Net). No cookies, no analytics.
// If FORM_ENDPOINT is emptied, the form falls back to opening the visitor's email app (mailto).
const FORM_ENDPOINT = 'https://clients.eyetoad.com/lead/send.php';
(function () {
  'use strict';
  var OWNER_EMAIL = 'zach@eyetoad.com';
  var PHONE_TEXT = '1-800-481-8638', PHONE_HREF = 'tel:+18004818638';
  var MIN_FILL_MS = 3000, RETRY_MS = 1200, TIMEOUT_MS = 12000;
  var pageShown = Date.now();

  var form = document.getElementById('contact-form');
  var statusEl = document.getElementById('status');
  var summary = document.getElementById('summary');
  var sendBtn = document.getElementById('send');
  var modeNote = document.getElementById('mode-note');
  var busy = false;
  var f = { name: form.elements.name, email: form.elements.email, role: form.elements.role, message: form.elements.message, consent: form.elements.consent, honey: form.elements._honey };

  modeNote.textContent = FORM_ENDPOINT ? 'Your message goes to our own server. We do not use cookies or trackers.' : 'This opens your email app. Nothing is sent until you press Send there.';

  function field(id) { return form.querySelector('[data-field="' + id + '"]'); }
  function setErr(id, msg) {
    var wrap = field(id), el = document.getElementById(id + '-err'), input = document.getElementById(id);
    wrap.classList.toggle('bad', !!msg);
    el.textContent = msg || '';
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }
  function validate() {
    var v = {
      name: f.name.value.trim(), email: f.email.value.trim(), role: f.role.value,
      message: f.message.value.trim(), consent: f.consent.checked
    };
    var errors = [];
    function bad(id, msg) { setErr(id, msg); errors.push(id); }
    setErr('name'); setErr('email'); setErr('role'); setErr('message');
    if (!v.name) bad('name', 'Please tell us your name.'); else if (v.name.length > 100) bad('name', 'Please use 100 characters or fewer.');
    if (!v.email) bad('email', 'Please enter your email address.');
    else if (!/^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]{2,}$/.test(v.email) || v.email.length > 200) bad('email', 'That email address does not look right. Example: name@example.com');
    if (!v.role) bad('role', 'Please choose the option that fits you best.');
    if (!v.message) bad('message', 'Please write a short message.');
    else if (v.message.length < 10) bad('message', 'Please write a little more, at least 10 characters.');
    else if (v.message.length > 2000) bad('message', 'Please keep it to 2000 characters or fewer.');
    return { v: v, errors: errors };
  }

  function showStatus(kind, html) {
    statusEl.className = 'status show ' + kind;
    statusEl.innerHTML = html;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function buildMailto(v) {
    var msg = v.message.length > 1500 ? v.message.slice(0, 1500) + ' [shortened]' : v.message;
    var body = 'Name: ' + v.name + '\nEmail: ' + v.email + '\nI am a: ' + v.role + '\nYou may reply by email: ' + (v.consent ? 'yes' : 'no') + '\n\n' + msg;
    return 'mailto:' + OWNER_EMAIL + '?subject=' + encodeURIComponent('SeatBreak (' + v.role + ')') + '&body=' + encodeURIComponent(body);
  }

  function buildFormData(v) {
    var fd = new FormData();
    var site = (location.hostname || '').replace(/^www\./, '');
    fd.append('name', v.name);
    fd.append('email', v.email);
    fd.append('role', v.role);
    fd.append('message', v.message);
    fd.append('consent', v.consent ? 'yes' : 'no');
    fd.append('site', site);
    fd.append('page', (location.pathname || '').slice(0, 300));
    fd.append('_t', String(pageShown));
    fd.append('_subject', 'New lead - SeatBreak (' + v.role + ')');
    fd.append('lead_device', window.innerWidth < 760 ? 'phone' : 'desktop');
    fd.append('_honey', '');
    return fd;
  }

  function post(v) {
    var ctl = new AbortController();
    var t = setTimeout(function () { ctl.abort(); }, TIMEOUT_MS);
    return fetch(FORM_ENDPOINT, {
      method: 'POST', body: buildFormData(v), headers: { Accept: 'application/json' },
      credentials: 'omit', referrerPolicy: 'strict-origin-when-cross-origin', signal: ctl.signal
    }).then(function (res) {
      clearTimeout(t);
      if (!res.ok) throw new Error('http ' + res.status);
      return res.json().then(function (j) { if (!j || j.ok !== true) throw new Error('not ok'); return j; });
    }, function (e) { clearTimeout(t); e.canRetry = e && e.name !== 'AbortError'; throw e; });
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function sendWithRetry(v) { return post(v).catch(function (e) { if (!e || !e.canRetry) throw e; return wait(RETRY_MS).then(function () { return post(v); }); }); }

  function success() {
    showStatus('ok', 'Thank you. Your message was sent. We only use what you send to reply to you.');
    form.reset();
    ['name', 'email', 'role', 'message'].forEach(function (id) { setErr(id); });
  }
  function failure(v) {
    var href = buildMailto(v);
    showStatus('fail', 'Sorry, your message did not go through. Your words are still in the form. You can try again, call <a href="' + PHONE_HREF + '">' + PHONE_TEXT + '</a>, or write to <a href="mailto:' + OWNER_EMAIL + '">' + OWNER_EMAIL + '</a>.<br><a class="btn alt small" id="mailto-btn" href="' + esc(href) + '">Open my email app instead</a>');
  }

  function setBusy(on) {
    busy = on;
    sendBtn.disabled = on;
    sendBtn.textContent = on ? 'Sending…' : 'Send message';
    form.setAttribute('aria-busy', on ? 'true' : 'false');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    statusEl.className = 'status'; statusEl.textContent = '';
    summary.className = 'status fail'; summary.textContent = '';
    var r = validate();
    if (r.errors.length) {
      summary.className = 'status fail show';
      summary.textContent = r.errors.length === 1 ? 'Please fix 1 thing below.' : 'Please fix ' + r.errors.length + ' things below.';
      document.getElementById(r.errors[0]).focus();
      return;
    }
    var v = r.v;

    if (!FORM_ENDPOINT) {
      var href = buildMailto(v);
      showStatus('info', 'This opens your email app. If nothing opened, <a id="mailto-btn" href="' + esc(href) + '">use this link to open your email app</a>, or write to <a href="mailto:' + OWNER_EMAIL + '">' + OWNER_EMAIL + '</a>.');
      window.location.href = href;
      return;
    }

    // spam checks: honeypot (silent, looks like success) and a minimum fill time
    if (f.honey.value) { success(); return; }
    if (Date.now() - pageShown < MIN_FILL_MS) {
      showStatus('info', 'Please take a moment to check your message, then press Send again.');
      return;
    }
    setBusy(true);
    showStatus('info', 'Sending your message…');
    sendWithRetry(v).then(function () { success(); }, function () { failure(v); }).then(function () { setBusy(false); });
  });

  // clear a field's error as the visitor fixes it
  ['name', 'email', 'role', 'message'].forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener('input', function () { if (field(id).classList.contains('bad')) setErr(id); });
    el.addEventListener('change', function () { if (field(id).classList.contains('bad')) setErr(id); });
  });
})();
