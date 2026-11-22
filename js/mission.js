// Mission page: blueprint highlighting, full-size toggle, "Follow the heat" animation.
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- callouts: hover, focus and click (pin) link the drawing and the list
  var sheet = document.getElementById('sheet1');
  var items = Array.prototype.slice.call(document.querySelectorAll('.callouts li'));
  var pinned = null, hovered = null;
  function paint() {
    var n = hovered || pinned;
    sheet.classList.toggle('dim', !!n);
    Array.prototype.forEach.call(sheet.querySelectorAll('.part'), function (p) { p.classList.toggle('on', p.getAttribute('data-part') === n); });
    Array.prototype.forEach.call(sheet.querySelectorAll('.bubble'), function (b) {
      var on = b.getAttribute('data-part') === n;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(b.getAttribute('data-part') === pinned));
    });
    items.forEach(function (li) { li.classList.toggle('on', li.getAttribute('data-part') === n); });
  }
  function hook(el) {
    var n = el.getAttribute('data-part');
    el.addEventListener('mouseenter', function () { hovered = n; paint(); });
    el.addEventListener('mouseleave', function () { hovered = null; paint(); });
    el.addEventListener('focus', function () { hovered = n; paint(); });
    el.addEventListener('blur', function () { hovered = null; paint(); });
    el.addEventListener('click', function () { pinned = pinned === n ? null : n; paint(); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pinned = pinned === n ? null : n; paint(); }
    });
  }
  Array.prototype.forEach.call(sheet.querySelectorAll('.bubble'), hook);
  items.forEach(hook);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && (pinned || hovered)) { pinned = hovered = null; paint(); } });

  // ---- full size toggle
  Array.prototype.forEach.call(document.querySelectorAll('[data-fullsize]'), function (btn) {
    var frame = document.getElementById(btn.getAttribute('data-fullsize'));
    btn.addEventListener('click', function () {
      var on = frame.classList.toggle('is-full');
      btn.setAttribute('aria-pressed', String(on));
      btn.textContent = on ? 'Fit to screen' : 'View full size';
      if (on) frame.scrollTo(0, 0);
    });
  });

  // ---- follow the heat
  var s2 = document.getElementById('sheet2');
  var cap = document.getElementById('caption');
  var playBtn = document.getElementById('play');
  var prev = document.getElementById('prev'), next = document.getElementById('next');
  var dots = document.getElementById('stepdots');
  var STEPS = [
    { t: '1. Servers make heat while they work. A liquid loop carries that heat away.', nodes: ['servers'] },
    { t: '2. A heat exchanger passes the heat to a second loop, so the server liquid stays separate.', nodes: ['hx'] },
    { t: '3. A heat pump lifts that gentle warmth to the temperature district heating needs.', nodes: ['hp'] },
    { t: '4. Insulated pipes carry the warm water to the homes.', nodes: ['homes'] },
    { t: '5. Water that is still a little warm goes on to the greenhouses, then returns cool to the start.', nodes: ['gh'] },
    { t: '6. Rain is stored, cleaned by reverse osmosis and used for gardens and cooling water. Leftover water goes to a wetland.', nodes: ['rain', 'tank', 'ro', 'clean', 'garden', 'makeup', 'wet'] },
    { t: '7. Together: heat that would be wasted does a useful job, and water is used again. That is the idea we hope to design toward.', nodes: null }
  ];
  var step = 0, playing = false, timer = null;
  for (var i = 0; i < STEPS.length; i++) { dots.appendChild(document.createElement('span')); }

  function show(n, announce) {
    step = (n + STEPS.length) % STEPS.length;
    var s = STEPS[step], all = s.nodes === null;
    cap.setAttribute('aria-live', announce ? 'polite' : 'off');
    cap.textContent = s.t;
    s2.classList.toggle('all', all);
    var stepNo = step + 1;
    Array.prototype.forEach.call(s2.querySelectorAll('.flow'), function (f) { f.classList.toggle('active', all || +f.getAttribute('data-step') === stepNo); });
    Array.prototype.forEach.call(s2.querySelectorAll('.node'), function (nd) {
      nd.classList.toggle('active', !all && s.nodes.indexOf(nd.getAttribute('data-node')) > -1);
    });
    Array.prototype.forEach.call(dots.children, function (d, k) { d.classList.toggle('on', k === step); });
  }
  function setPlaying(on) {
    playing = on && !reduce;
    s2.classList.toggle('playing', playing);
    playBtn.textContent = playing ? 'Pause' : 'Play';
    playBtn.setAttribute('aria-pressed', String(playing));
    clearInterval(timer);
    if (playing) timer = setInterval(function () { show(step + 1, false); }, 6500);
  }
  playBtn.addEventListener('click', function () { setPlaying(!playing); });
  next.addEventListener('click', function () { show(step + 1, true); });
  prev.addEventListener('click', function () { show(step - 1, true); });
  show(0, false);
  setPlaying(!reduce);
  document.addEventListener('visibilitychange', function () { if (document.hidden && playing) setPlaying(false); });
})();
