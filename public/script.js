let currentLanguage = 'pt';
let siteData = null;
let lastScrollY = 0;

document.addEventListener('DOMContentLoaded', () => {
  // smooth anchors
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click',e=>{
      const target = document.querySelector(a.getAttribute('href'));
      if(target){ e.preventDefault(); target.scrollIntoView({behavior:'smooth', block:'start'}); closeMenu(); }
    });
  });

  const navLinks = document.getElementById('navLinks');
  if (navLinks){
    navLinks.addEventListener('click', (event) => {
      if (!navLinks.classList.contains('active')) return;
      const link = event.target.closest('a');
      if (link){
        closeMenu();
        return;
      }
      closeMenu();
    });
  }

  // exato momento no clique botão de hamburguer-menu esconde a barra fixa
  const hamburgerMenu = document.querySelector('.hamburger-menu');
  if (hamburgerMenu){
    hamburgerMenu.addEventListener('click', (event) => {
      const fixedBar = document.getElementById('fixedBar');
      if (fixedBar) fixedBar.classList.remove('visible');
    });
  }


  // fixed bar on scroll
  window.addEventListener('scroll', () => {
    const fixedBar = document.getElementById('fixedBar');
    const hero = document.querySelector('.hero');
    const heroHeight = hero ? hero.offsetHeight : 300;
    const scrollY = window.scrollY || window.pageYOffset;
    if (fixedBar) {
      if (scrollY > heroHeight * 0.7) {
        fixedBar.classList.add('visible');
      } else {
        fixedBar.classList.remove('visible');
      }
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      const navLinks = document.getElementById('navLinks');
      if (navLinks && navLinks.classList.contains('active')) {
        fixedBar.classList.remove('visible');
      }
    
      if (isMobile && fixedBar.classList.contains('visible')) {
        if (scrollY > lastScrollY + 5) {
          fixedBar.classList.add('hide-on-scroll');
        } else if (scrollY < lastScrollY - 5 || scrollY <= heroHeight * 0.7) {
          fixedBar.classList.remove('hide-on-scroll');
        }
      } else if (fixedBar.classList.contains('hide-on-scroll')) {
        fixedBar.classList.remove('hide-on-scroll');
      }
    }
    lastScrollY = scrollY;
  });

  // load data
  fetch('data.json')
    .then(r => r.json())
    .then(data => {
      siteData = data;
      hydrateFromData();
    })
    .catch(err => {
      console.error('Erro ao carregar data.json', err);
      // fallback: preenche chave PIX se existir no HTML
      const pixInput = document.getElementById('pixInput');
      if (pixInput && !pixInput.value) pixInput.value = 'guilherme.escobar@email.com';
    });
});

// HELPERS
const fmtBRL = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(v).replace('R$','').trim();
const fmtEUR = v => new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v).replace('€','').trim();

function convert(value, toCurrency){
  const base = siteData.base_currency.toUpperCase(); // "BRL" or "EUR"
  const rate = Number(siteData.eur_brl); // 1 EUR = X BRL
  if (toCurrency === 'BRL'){
    return base === 'BRL' ? value : value * rate;
  } else { // to EUR
    return base === 'EUR' ? value : value / rate;
  }
}

function setAll(selector, value){
  document.querySelectorAll(selector).forEach(el => el.textContent = value);
}

function hydrateFromData(){
  if (!siteData) return;

  // PIX
  const pixKey = siteData.pix_key || '';
  const pixInput = document.getElementById('pixInput');
  if (pixInput) pixInput.value = pixKey;

  // QR (opcional)
  if (siteData.pix_qr_url){
    const qr = document.querySelector('.js-pix-qr');
    if (qr){
      qr.innerHTML = `<img src="${siteData.pix_qr_url}" alt="QR Code PIX" style="max-width:240px;width:100%;height:auto;border-radius:12px;background:#fff;padding:8px">`;
    }
  }

  // links
  const s = siteData;
  const setHref = (sel, url) => { const el = document.querySelector(sel); if(el && url) el.href = url; };
  setHref('.js-spreadsheet-link', s.spreadsheet_url);
  setHref('.js-link-vakinha', s.platforms?.vakinha);
  setHref('.js-link-benfeitoria', s.platforms?.benfeitoria);
  setHref('.js-link-picpay', s.platforms?.picpay);
  setHref('.js-ig', s.social?.instagram);
  setHref('.js-li', s.social?.linkedin);
  setHref('.js-wa', s.social?.whatsapp);

  // progress
  const goalBase = Number(s.progress?.goal || 0);
  const raisedBase = Number(s.progress?.raised || 0);
  const goalBRL = Math.round(convert(goalBase,'BRL'));
  const goalEUR = Math.round(convert(goalBase,'EUR'));
  const raisedBRL = Math.round(convert(raisedBase,'BRL'));
  const raisedEUR = Math.round(convert(raisedBase,'EUR'));

  setAll('.js-goal-brl', fmtBRL(goalBRL));
  setAll('.js-goal-eur', fmtEUR(goalEUR));
  setAll('.js-raised-brl', fmtBRL(raisedBRL));
  setAll('.js-raised-eur', fmtEUR(raisedEUR));

  const pct = goalBase > 0 ? Math.min(100, Math.round((raisedBase/goalBase)*100)) : 0;
  const bar = document.querySelector('.js-progress-fill');
  if (bar) bar.style.width = pct + '%';

  // custos
  const c = s.costs || {};
  const keys = ['flights','housing','food','transport','insurance','fees','contingency'];

  let totalBase = 0;
  keys.forEach(k => { totalBase += Number(c[k] || 0); });

  const setCost = (key, baseValue) => {
    const brl = Math.round(convert(baseValue,'BRL'));
    const eur = Math.round(convert(baseValue,'EUR'));
    setAll(`.js-cost-${key}-brl`, fmtBRL(brl));
    setAll(`.js-cost-${key}-eur`, fmtEUR(eur));
  };

  keys.forEach(k => setCost(k, Number(c[k] || 0)));

  const totalBRL = Math.round(convert(totalBase,'BRL'));
  const totalEUR = Math.round(convert(totalBase,'EUR'));
  setAll('.js-cost-total-brl', fmtBRL(totalBRL));
  setAll('.js-cost-total-eur', fmtEUR(totalEUR));
}

// Alternar a visibilidade do menu
function closeMenu(){
  const navLinks = document.getElementById("navLinks");
  const hamburgerMenu = document.querySelector(".hamburger-menu");
  if (navLinks) navLinks.classList.remove("active");
  if (hamburgerMenu) hamburgerMenu.classList.remove("active");
}

function toggleMenu() {
  const navLinks = document.getElementById("navLinks");
  const hamburgerMenu = document.querySelector(".hamburger-menu");
  if (!navLinks || !hamburgerMenu) return;
  if (navLinks.classList.contains("active")) {
    closeMenu();
  } else {
    navLinks.classList.add("active");
    hamburgerMenu.classList.add("active");
  }
}

document.addEventListener('click', function(event) {
  const navLinks = document.getElementById("navLinks");
  const hamburgerMenu = document.querySelector(".hamburger-menu");
  if (!navLinks || !hamburgerMenu) return;
  if (!navLinks.contains(event.target) && !hamburgerMenu.contains(event.target)) {
    closeMenu();
  }
});

// LANGUAGE
function switchLanguage(lang){
  currentLanguage = lang;

  // active button
  document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
  const btn = document.querySelector(`[onclick="switchLanguage('${lang}')"]`);
  if (btn) btn.classList.add('active');

  // toggle content blocks
  document.querySelectorAll('.lang-content').forEach(el => el.classList.remove('active'));

  document.querySelectorAll('.section, .hero, .story-stats, .progress-card, .pix-card, .platforms-card, .faq-item, .update-card, .fixed-bar, footer')
    .forEach(section => {
      const kids = section.querySelectorAll('.lang-content');
      if (kids.length){
        kids.forEach((k,idx) => {
          if ((lang === 'pt' && idx % 2 === 0) || (lang === 'en' && idx % 2 === 1)){
            k.classList.add('active');
          }
        });
      }
    });

  // special cases: table header spans already inside those containers
}

// PIX copy
function copyPix(){
  const pixKey = siteData?.pix_key || document.getElementById('pixInput')?.value || '';
  const copyBtn = document.getElementById('copyPixBtn');
  if (!pixKey) return;

  navigator.clipboard.writeText(pixKey).then(()=>{
    const original = copyBtn.innerHTML;
    copyBtn.innerHTML = (currentLanguage==='pt') ? 'Copiado!' : 'Copied!';
    copyBtn.style.background = '#0FA958';
    setTimeout(()=>{ copyBtn.innerHTML = original; copyBtn.style.background=''; }, 2000);
  }).catch(()=>{
    // fallback
    const ta = document.createElement('textarea');
    ta.value = pixKey; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    const original = copyBtn.innerHTML;
    copyBtn.innerHTML = (currentLanguage==='pt') ? 'Copiado!' : 'Copied!';
    copyBtn.style.background = '#0FA958';
    setTimeout(()=>{ copyBtn.innerHTML = original; copyBtn.style.background=''; }, 2000);
  });
}

// FAQ
function toggleFaq(el){
  const answer = el.nextElementSibling;
  const icon = el.querySelector('span:last-child');
  const isOpen = answer.classList.contains('active');

  document.querySelectorAll('.faq-answer').forEach(a=>a.classList.remove('active'));
  document.querySelectorAll('.faq-question span:last-child').forEach(i=>i.textContent='+');

  if (!isOpen){
    answer.classList.add('active');
    icon.textContent = '−';
  }
}
