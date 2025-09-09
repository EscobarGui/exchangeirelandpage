// Helpers
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const USD  = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const setText = (sel, txt) => { const el = $(sel); if (el) el.textContent = txt; };
const setHref = (sel, url) => { const el = $(sel); if (el && url) el.setAttribute('href', url); };

function formatDateBR(iso) { try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return ''; } }
function formatDateEN(iso) { try { return new Date(iso).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }); } catch { return ''; } }

async function boot() {
  try {
    const res = await fetch('./data.json', { cache: 'no-cache' });
    const data = await res.json();

    // PIX
    if ($('#pixKey')) $('#pixKey').textContent = data.pix.key || '';
    const copyButtons = ['.copy-btn', '#copyPixFooter'].map(sel => $(sel)).filter(Boolean);
    copyButtons.forEach(btn => btn.addEventListener('click', () => copyPix(data.pix.key)));


    const qrImg = document.getElementById('qrImage');
    if (qrImg && data?.pix?.qr_image) {
      qrImg.src = data.pix.qr_image;
    }
    if (data.pix.qr_image && $('#pixQr')) {
      $('#pixQr').setAttribute('src', data.pix.qr_image);
      $('#pixQr').setAttribute('alt', 'QR Code do Pix');
      $('#pixQr').style.maxWidth = '100%';
      $('#pixQr').style.height = 'auto';
    }

    // Números
    const goalBRL   = Number(data.fundraising.goal_brl || 0);
    const raisedBRL = Number(data.fundraising.raised_brl || 0);
    const rate      = Number((data.exchange_rate && data.exchange_rate.brl_to_usd) || 0.2);

    const goalUSD   = goalBRL * rate;
    const raisedUSD = raisedBRL * rate;

    setText('#goal-amount',   `Meta: ${BRL.format(goalBRL)}`);
    setText('#raised-amount', `Arrecadado: ${BRL.format(raisedBRL)}`);
    setText('#goal-amount-en',   `Goal: ${USD.format(goalUSD)}`);
    setText('#raised-amount-en', `Raised: ${USD.format(raisedUSD)}`);

    // Barra progresso
    const pct = Math.max(0, Math.min(100, (raisedBRL / goalBRL) * 100));
    $$('.progress-fill').forEach(f => f.style.width = pct + '%');

    // Contadores / metas semanais / última atualização
    setText('#supportersCountPt', `👥 +${data.fundraising.supporters_count} apoiadores`);
    setText('#supportersCountEn', `👥 +${data.fundraising.supporters_count} supporters`);
    setText('#weeklyGoalPt', data.fundraising.weekly_goal_pt || '');
    setText('#weeklyGoalEn', data.fundraising.weekly_goal_en || '');
    setText('#lastUpdatePt', formatDateBR(data.fundraising.last_update_iso));
    setText('#lastUpdateEn', formatDateEN(data.fundraising.last_update_iso));

    // Apoiadores recentes
    renderSupporters('#supportersListPt', data.supporters_recent, 'brl', rate);
    renderSupporters('#supportersListEn', data.supporters_recent, 'usd', rate);

    // Links
    setHref('#linkVakinha',     data.links.vakinha);
    setHref('#linkBenfeitoria', data.links.benfeitoria);
    setHref('#linkPicpay',      data.links.picpay);
    setHref('#sheetUrlPt',      data.sheet.url);
    setHref('#sheetUrlEn',      data.sheet.url);

    setHref('#linkInstagram', data.person.instagram);
    setHref('#linkLinkedIn',  data.person.linkedin);
    setHref('#linkWhatsApp',  data.person.whatsapp);

    // Share
    wireShare(data);

    // Idioma
    loadLanguagePreference(data.site.default_lang || 'pt');

  } catch (e) {
    console.error('Erro ao carregar data.json', e);
  }

  wireUiBehaviors();
}

// Render helpers
function renderSupporters(containerSel, supporters = [], currency = 'brl', rate = 0.2) {
  const wrap = $(containerSel);
  if (!wrap) return;
  wrap.innerHTML = '';
  supporters.forEach(s => {
    const amount = currency === 'usd' ? (s.amount_brl * rate) : s.amount_brl;
    const fmt = currency === 'usd' ? USD : BRL;
    const row = document.createElement('div');
    row.className = 'supporter-item';
    row.innerHTML = `<span class="supporter-name">${s.name}</span><span class="supporter-amount">${fmt.format(amount)}</span>`;
    wrap.appendChild(row);
  });
}

// UI behaviors
function copyPix(pixKey) {
  if (!pixKey) return;
  navigator.clipboard.writeText(pixKey).then(() => {
    const btns = [$('.copy-btn'), $('#copyPixFooter')].filter(Boolean);
    btns.forEach(btn => {
      const original = btn.textContent;
      btn.textContent = 'Copiado! ✓';
      btn.style.background = '#4CAF50';
      setTimeout(() => {
        btn.textContent = original;
        btn.style.background = btn.id === 'copyPixFooter'
          ? 'rgba(255, 255, 255, 0.2)'
          : 'var(--accent-yellow)';
      }, 1800);
    });
  });
}

function wireShare(data) {
  const btnWpp = document.querySelector('.share-btn.whatsapp');
  if (btnWpp) btnWpp.addEventListener('click', () => {
    const txt = encodeURIComponent(`Olá! Conheci a história do ${data.person.name} e vale conhecer: ${location.href}`);
    window.open(`https://wa.me/?text=${txt}`, '_blank');
  });
  const btnIg = document.querySelector('.share-btn.instagram');
  if (btnIg) btnIg.addEventListener('click', () => {
    navigator.clipboard.writeText(location.href).then(() => alert('Link copiado! Cole no Stories.'));
  });
  const btnIn = document.querySelector('.share-btn.linkedin');
  if (btnIn) btnIn.addEventListener('click', () => {
    const url = encodeURIComponent(location.href);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
  });
  const btnShare = document.querySelector('.share-btn:not(.whatsapp):not(.instagram):not(.linkedin)');
  if (btnShare) btnShare.addEventListener('click', () => {
    if (navigator.share) {
      navigator.share({
        title: `Intercâmbio do ${data.person.name} — Ajude a tornar real`,
        text: 'Estudante de Engenharia busca apoio para intercâmbio na Alemanha.',
        url: location.href
      });
    } else {
      navigator.clipboard.writeText(location.href).then(() => alert('Link copiado!'));
    }
  });
}

function wireUiBehaviors() {
  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Fixed CTA
  const fixedCta = document.getElementById('fixedCta');
  const onScroll = () => {
    const hero = document.querySelector('.hero');
    if (!fixedCta || !hero) return;
    const rect = hero.getBoundingClientRect();
    if (rect.bottom < 0) fixedCta.classList.add('visible');
    else fixedCta.classList.remove('visible');
  };
  window.addEventListener('scroll', onScroll);
  onScroll();
}

// Idioma
function toggleLanguage(lang) {
  const ptBtn = document.getElementById('ptBtn');
  const enBtn = document.getElementById('enBtn');
  const allContent = document.querySelectorAll('.lang-content');

  if (lang === 'pt') { ptBtn?.classList.add('active'); enBtn?.classList.remove('active'); }
  else { enBtn?.classList.add('active'); ptBtn?.classList.remove('active'); }

  allContent.forEach(c => c.classList.toggle('hidden', c.getAttribute('data-lang') !== lang));
  localStorage.setItem('preferredLanguage', lang);
}
window.toggleLanguage = toggleLanguage;

function loadLanguagePreference(defaultLang = 'pt') {
  const saved = localStorage.getItem('preferredLanguage') || defaultLang;
  toggleLanguage(saved);
}

window.addEventListener('DOMContentLoaded', boot);
