// ----- Année dynamique dans le footer -----
(function setYear(){
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();

// ----- Cookie banner (consentement) -----
(function cookieBanner(){
  try{
    var key = 'cookieConsent.v1';
    if (localStorage.getItem(key)) return;
    // Ne pas afficher sur très petits écrans si le clavier est ouvert (heuristique)
    var banner = document.createElement('div');
    banner.className = 'cookie-banner';
    var isInPages = /\/pages\//.test(window.location.pathname);
    var policyHref = isInPages ? 'confidentialite.html' : 'pages/confidentialite.html';
    banner.innerHTML = '' +
      '<p>Nous utilisons des cookies strictement nécessaires au fonctionnement du site (préférences, sécurité). ' +
      'Aucun cookie publicitaire n’est utilisé. <a class="link" href="' + policyHref + '" target="_blank" rel="noopener">En savoir plus</a>.</p>' +
      '<div class="cookie-actions">' +
      '  <button class="btn btn--primary" type="button">OK, compris</button>' +
      '</div>';
    document.body.appendChild(banner);
    var btn = banner.querySelector('button');
    btn.addEventListener('click', function(){
      try{ localStorage.setItem(key, String(Date.now())); }catch(e){}
      banner.remove();
    });
  }catch(e){}
})();

// ----- Reveal on scroll -----
(function revealOnScroll(){
  var els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || !els.length) {
    els.forEach(function(e){ e.classList.add('in'); });
    return;
  }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(ent){
      if (ent.isIntersecting) {
        ent.target.classList.add('in');
        io.unobserve(ent.target);
      }
    });
  }, { threshold: 0.14 });
  els.forEach(function(e){ io.observe(e); });
})();

// ----- Header "scrolled" -----
(function headerScrolled(){
  var header = document.querySelector('header');
  if (!header) return;
  function onScroll(){
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    if (y > 8) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
})();

// ----- Burger menu (mobile) -----
(function mobileMenu(){
  var btn = document.querySelector('.menu-toggle');
  var panel = document.getElementById('mobileMenu');
  if (!btn || !panel) return;

  function closeMenu(){
    btn.setAttribute('aria-expanded','false');
    panel.classList.remove('open');
    panel.hidden = true;
    document.removeEventListener('click', onOutside);
    document.removeEventListener('keydown', onEsc);
  }
  function onOutside(e){
    if (!panel.contains(e.target) && !btn.contains(e.target)) closeMenu();
  }
  function onEsc(e){ if (e.key === 'Escape') closeMenu(); }

  btn.addEventListener('click', function(){
    var expanded = btn.getAttribute('aria-expanded') === 'true';
    if (expanded) closeMenu();
    else{
      btn.setAttribute('aria-expanded','true');
      panel.hidden = false;
      requestAnimationFrame(function(){ panel.classList.add('open'); });
      document.addEventListener('click', onOutside);
      document.addEventListener('keydown', onEsc);
    }
  });

  panel.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', closeMenu); });

  // ferme le menu si on repasse en desktop
  var mqVal = getComputedStyle(document.documentElement).getPropertyValue('--mobile-break').trim() || '760px';
  var mq = window.matchMedia('(min-width: ' + mqVal + ')');
  if (mq.addEventListener) mq.addEventListener('change', function(e){ if (e.matches) closeMenu(); });
})();

// ----- Lien actif automatique (fallback si t’oublies la classe .active) -----
(function markActive(){
  try{
    var current = new URL(window.location.href);
    var links = document.querySelectorAll('header .nav__right a, #mobileMenu a');
    links.forEach(function(a){
      try{
        var href = new URL(a.href, window.location.origin);
        // normalise /foo/ et /foo/index.html
        function norm(p){ return p.endsWith('/') ? p + 'index.html' : p; }
        var currPath = norm(current.pathname);
        var linkPath = norm(href.pathname);
        if (currPath === linkPath) a.classList.add('active');
      }catch(e){}
    });
  }catch(e){}
})();