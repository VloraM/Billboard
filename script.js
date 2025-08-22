/* ----------------- CONFIGURATION ----------------- */
const CAMPAIGNS = [
  {
    id: "summer-sale",
    title: "Up to 50% off – This week only",
    sub: "Free shipping over 29€",
    ctaText: "Buy now",
    ctaHref: "https://example.com/sale",
    bgSrc: "data:image/svg+xml;utf8," + encodeURIComponent(`
      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 600'>
        <defs>
          <linearGradient id='g' x1='0' x2='1'>
            <stop offset='0' stop-color='#111'/>
            <stop offset='1' stop-color='#333'/>
          </linearGradient>
        </defs>
        <rect width='1200' height='600' fill='url(#g)'/>
        <g fill='#ffd400' opacity='.14'>
          <circle cx='200' cy='120' r='80'/>
          <circle cx='950' cy='420' r='140'/>
          <circle cx='500' cy='300' r='100'/>
        </g>
        <g fill='#fff' opacity='.06'>
          <rect x='0' y='520' width='1200' height='80'/>
        </g>
      </svg>
    `),
    accent: "#ffd400",
    frequencyDays: 7
  },
  {
    id: "new-arrivals",
    title: "New products just arrived",
    sub: "Exclusive online models",
    ctaText: "Browse",
    ctaHref: "https://example.com/new",
    bgSrc: "",
    accent: "#8cf",
    frequencyDays: 3
  }
];

const SETTINGS = {
  rotateEveryMs: 7000,     // rotate slide every 7s
  showBadge: true,         // "Ad" in corner
  storageKeyBase: "bb-dismissed-", // for frequency capping
  impressionKey: "bb-impressions",
  clickKey: "bb-clicks"
};

/* -------------- BUILD LOGIC -------------- */
document.body.classList.remove('no-js');

const el = {
  root: document.getElementById('billboard'),
  bg: document.querySelector('.bb-bg'),
  title: document.getElementById('bb-title'),
  sub: document.getElementById('bb-sub'),
  cta: document.getElementById('bb-cta'),
  close: document.getElementById('bb-close'),
  badge: document.getElementById('bb-badge'),
  inner: document.getElementById('bb-inner')
};

// pick first campaign not dismissed according to frequency capping
function pickInitialCampaign() {
  for (const c of CAMPAIGNS) {
    if (!isDismissed(c)) return c;
  }
  return null;
}

function isDismissed(c) {
  const k = SETTINGS.storageKeyBase + c.id;
  const until = localStorage.getItem(k);
  if (!until) return false;
  const now = Date.now();
  return now < Number(until); // still within dismissal period
}

function setDismissed(c) {
  const days = c.frequencyDays ?? 7;
  const until = Date.now() + days*24*60*60*1000;
  localStorage.setItem(SETTINGS.storageKeyBase + c.id, String(until));
}

// Basic statistics
function bump(key){
  try{
    const raw = localStorage.getItem(key);
    const n = raw ? Number(raw) : 0;
    localStorage.setItem(key, String(n+1));
  }catch(e){}
}

// Lazy-load background (not needed for data URL, but safe)
function setBackground(src){
  if (!src){ el.bg.removeAttribute('style'); return; }
  el.bg.dataset.state = 'loading';
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    el.bg.style.backgroundImage = `url("${src}")`;
    el.bg.dataset.state = 'ready';
  };
  img.onerror = () => {
    // fallback to default color if load fails
    el.bg.dataset.state = 'ready';
  };
  img.src = src;
}

// Apply campaign to UI
function renderCampaign(c){
  el.title.textContent = c.title;
  el.sub.textContent = c.sub;
  el.cta.textContent = c.ctaText;
  el.cta.href = c.ctaHref;
  if (c.accent){
    el.cta.style.background = c.accent;
    el.cta.style.color = '#111';
  }
  setBackground(c.bgSrc || '');
  el.badge.hidden = !SETTINGS.showBadge;
}

// Simple rotation
let idx = 0;
let current = pickInitialCampaign();
if (current){
  idx = CAMPAIGNS.findIndex(c => c.id === current.id);
  renderCampaign(current);
  el.root.hidden = false;
  el.inner.focus({preventScroll:true});
  bump(SETTINGS.impressionKey);
} else {
  // all dismissed – remove
  document.getElementById('billboard').remove();
}

let rotTimer = null;
function scheduleRotate(){
  clearInterval(rotTimer);
  if (CAMPAIGNS.length <= 1) return;
  rotTimer = setInterval(() => {
    idx = (idx + 1) % CAMPAIGNS.length;
    const candidate = CAMPAIGNS[idx];
    if (!isDismissed(candidate)){
      current = candidate;
      renderCampaign(current);
      bump(SETTINGS.impressionKey);
    }
  }, SETTINGS.rotateEveryMs);
}
scheduleRotate();

// Close via button or Esc key
el.close.addEventListener('click', () => {
  if (current){ setDismissed(current); }
  el.root.remove();
});
document.addEventListener('keydown', (e)=>{
  if (e.key === 'Escape' && document.body.contains(el.root)){
    if (current){ setDismissed(current); }
    el.root.remove();
  }
});

// Track clicks (can POST to server here)
el.cta.addEventListener('click', ()=> bump(SETTINGS.clickKey));

// Export to window for debugging
window.__BB__ = {CAMPAIGNS, SETTINGS};

// Debug statistics display
const imp = localStorage.getItem("bb-impressions")||0;
const clk = localStorage.getItem("bb-clicks")||0;
document.getElementById('imp').textContent = imp;
document.getElementById('clk').textContent = clk;
document.getElementById('dms').textContent =
  JSON.stringify(Object.fromEntries(Object.keys(localStorage)
    .filter(k=>k.startsWith("bb-dismissed-"))
    .map(k=>[k, new Date(Number(localStorage.getItem(k))).toISOString()])),
  null, 2);
