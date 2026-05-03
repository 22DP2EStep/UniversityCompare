<script setup>
// Sākumlapa — attēlo sistēmas prezentāciju ar statistiku un funkciju aprakstu

import { ref, onMounted, onUnmounted } from 'vue'
import { lang, toggleLang, t } from '../i18n.js'
import { api } from '../api.js'

defineProps({ currentUser: { type: Object, default: null } })
defineEmits(['go-to-app', 'go-to-auth', 'go-to-admin', 'go-to-profile', 'logout'])

// Ritināšanas pozīcija — izmanto parallax efektam auditorijas kartēs
const scrollY = ref(0)
// Statistikas skaitļi kas tiek ielādēti no API
const uniCount = ref('—')
const programCount = ref('—')

// Izseko lapas ritināšanu parallax efektam
function onScroll() { scrollY.value = window.scrollY }

onMounted(async () => {
  // passive: true uzlabo ritināšanas veiktspēju mobilajās ierīcēs
  window.addEventListener('scroll', onScroll, { passive: true })
  try {
    // Ielādē universitāšu un programmu skaitu vienlaikus
    const [unis, programs] = await Promise.all([
      api.universities.list(),
      api.programs.list(),
    ])
    uniCount.value = unis.length
    programCount.value = programs.length
  } catch {}
})

// Noņem scroll klausītāju lai novērstu atmiņas noplūdi
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <div class="landing">

    <header class="landing-nav">
      <div class="landing-brand">
        <div class="brand-logo">
          <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
            <path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
          </svg>
        </div>
        <span class="brand-name">UniversityCompare</span>
      </div>

      <nav class="header-nav">
        <button class="btn-lang" @click="toggleLang" :title="lang === 'lv' ? 'Switch to English' : 'Pārslēgt uz latviešu'">
          <span :class="{ 'lang-active': lang === 'lv' }">LV</span>
          <span class="lang-sep">|</span>
          <span :class="{ 'lang-active': lang === 'en' }">EN</span>
        </button>

        <template v-if="currentUser">
          <button v-if="currentUser.role === 'admin'" class="btn btn-admin" @click="$emit('go-to-admin')">{{ t('adminBtn') }}</button>
          <div class="user-menu">
            <div class="user-avatar" @click="$emit('go-to-profile')" :title="t('viewProfile')">
              <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v1h16v-1c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <span class="user-name" @click="$emit('go-to-profile')" style="cursor:pointer">{{ currentUser.name }}</span>
            <button class="btn btn-logout" @click="$emit('logout')">{{ t('logout') }}</button>
          </div>
        </template>
        <template v-else>
          <button class="btn btn-login" @click="$emit('go-to-auth', 'login')">{{ t('login') }}</button>
          <button class="btn btn-register" @click="$emit('go-to-auth', 'register')">{{ t('register') }}</button>
        </template>
      </nav>
    </header>

    <section class="hero-section">
      <div class="hero-inner">

        <div class="hero-text">
          <h1 class="hero-heading">{{ t('landingHeroTitle') }}</h1>
          <p class="hero-description">{{ t('landingHeroDesc') }}</p>
          <button class="cta-btn" @click="$emit('go-to-app')">
            {{ t('landingCta') }}
          </button>
        </div>

      </div>

      <div class="stats-bar">
        <div class="stat"><span class="stat-num">{{ uniCount }}</span><span class="stat-label">{{ t('landingStat1') }}</span></div>
        <div class="stat"><span class="stat-num">{{ programCount }}</span><span class="stat-label">{{ t('landingStat2') }}</span></div>
        <div class="stat"><span class="stat-num">100%</span><span class="stat-label">{{ t('landingStat3') }}</span></div>
      </div>
    </section>

    <section class="how-section">
      <div class="how-inner">
        <p class="section-label">{{ t('landingHowTitle') }}</p>

        <div class="how-row">
          <div class="how-num">01</div>
          <div class="how-text">
            <h3 class="how-title">{{ t('landingHow1Title') }}</h3>
            <p class="how-desc">{{ t('landingHow1Desc') }}</p>
          </div>
        </div>

        <div class="how-row how-row--reverse">
          <div class="how-text">
            <h3 class="how-title">{{ t('landingHow2Title') }}</h3>
            <p class="how-desc">{{ t('landingHow2Desc') }}</p>
          </div>
          <div class="how-num">02</div>
        </div>

        <div class="how-row">
          <div class="how-num">03</div>
          <div class="how-text">
            <h3 class="how-title">{{ t('landingHow3Title') }}</h3>
            <p class="how-desc">{{ t('landingHow3Desc') }}</p>
          </div>
        </div>

      </div>
    </section>

    <section class="feat-section">
      <div class="feat-inner">
        <p class="section-label">{{ t('landingFeatTitle') }}</p>
        <div class="feat-grid">

          <div class="feat-item">
            <div class="feat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"/>
              </svg>
            </div>
            <h4>{{ t('landingFeat1T') }}</h4>
            <p>{{ t('landingFeat1D') }}</p>
          </div>

          <div class="feat-item">
            <div class="feat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z"/>
              </svg>
            </div>
            <h4>{{ t('landingFeat2T') }}</h4>
            <p>{{ t('landingFeat2D') }}</p>
          </div>

          <div class="feat-item">
            <div class="feat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/>
              </svg>
            </div>
            <h4>{{ t('landingFeat3T') }}</h4>
            <p>{{ t('landingFeat3D') }}</p>
          </div>

          <div class="feat-item">
            <div class="feat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
              </svg>
            </div>
            <h4>{{ t('landingFeat4T') }}</h4>
            <p>{{ t('landingFeat4D') }}</p>
          </div>

        </div>
      </div>
    </section>

    <section class="audience-section">
      <div class="audience-inner">
        <p class="section-label section-label--light">{{ t('landingForTitle') }}</p>
        <div class="audience-grid">

          <div class="audience-card" :style="{ transform: `translateY(${scrollY * -0.03}px)` }">
            <div class="aud-num">01</div>
            <h4>{{ t('landingFor1T') }}</h4>
            <p>{{ t('landingFor1D') }}</p>
          </div>

          <div class="audience-card" :style="{ transform: `translateY(${scrollY * -0.05}px)` }">
            <div class="aud-num">02</div>
            <h4>{{ t('landingFor2T') }}</h4>
            <p>{{ t('landingFor2D') }}</p>
          </div>

          <div class="audience-card" :style="{ transform: `translateY(${scrollY * -0.03}px)` }">
            <div class="aud-num">03</div>
            <h4>{{ t('landingFor3T') }}</h4>
            <p>{{ t('landingFor3D') }}</p>
          </div>

        </div>

      </div>
    </section>

    <footer class="landing-footer">
      <div class="footer-left">
        <div class="footer-logo">
          <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
            <path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
          </svg>
        </div>
        <span><strong>UniversityCompare</strong> &mdash; {{ t('footerTagline') }}</span>
      </div>
      <div class="footer-right">&copy; {{ new Date().getFullYear() }} UniversityCompare</div>
    </footer>

  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.landing {
  min-height: 100vh;
  background: #f5f4f0;
  color: #1a1a1a;
  font-family: 'Roboto', system-ui, -apple-system, sans-serif;
  display: flex;
  flex-direction: column;
  -webkit-font-smoothing: antialiased;
  padding-top: 58px;
}

.landing-nav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 2rem; height: 58px;
  background: #0f172a; border-bottom: 1px solid #2e2e2e;
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
}
.landing-brand { display: flex; align-items: center; gap: 0.75rem; }
.brand-logo {
  width: 32px; height: 32px; border-radius: 6px; background: #a83248;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.72rem; font-weight: 800; color: white; letter-spacing: -0.03em; flex-shrink: 0;
}
.brand-name { font-size: 0.95rem; font-weight: 700; color: white; letter-spacing: -0.01em; }

.hero-section {
  position: relative;
  background:
    linear-gradient(rgba(15,23,42,0.82), rgba(15,23,42,0.82)),
    url('https://static.lsm.lv/media/2013/06/large/3/1wgc.jpg') center/cover no-repeat;
  color: white;
  border-bottom: 3px solid #a83248;
  overflow: hidden;
}
.hero-inner {
  max-width: 1000px;
  margin: 0 auto;
  padding: 5rem 2rem 6rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.hero-text { text-align: center; }

.hero-heading {
  font-size: 2.8rem; font-weight: 800;
  font-family: 'Roboto', system-ui, sans-serif;
  letter-spacing: -0.02em; line-height: 1.08;
  color: white; margin: 0 0 1.1rem;
}
.hero-description {
  font-size: 1rem; color: rgba(255,255,255,0.5);
  line-height: 1.7; margin: 0 auto 1.85rem; max-width: 480px;
}
.cta-btn {
  display: inline-flex; align-items: center;
  padding: 0.6rem 1.2rem; border-radius: 6px;
  background: #a83248; color: white;
  font-size: 0.875rem; font-weight: 600;
  border: none; cursor: pointer; font-family: inherit;
  transition: background 0.15s;
  margin-top: 1.5rem;
}
.cta-btn:hover { background: #7a1f32; }

.hero-visual {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  position: relative;
  will-change: transform;
}
.mock-card {
  background: #242424;
  border: 1px solid #333;
  border-radius: 10px;
  padding: 1rem 1.1rem;
  will-change: transform;
}
.mock-card--b { margin-left: 1.5rem; }
.mock-card-top {
  display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;
}
.mock-avatar {
  width: 34px; height: 34px; border-radius: 6px;
  background: #a83248;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.62rem; font-weight: 800; color: white; flex-shrink: 0;
}
.mock-avatar--b { background: #1d4ed8; }
.mock-name { font-size: 0.82rem; font-weight: 700; color: #f3f4f6; }
.mock-loc { font-size: 0.72rem; color: rgba(255,255,255,0.35); margin-top: 1px; }
.mock-rank {
  margin-left: auto; font-size: 0.72rem; font-weight: 800;
  color: #a83248; background: rgba(168,50,72,0.12);
  border: 1px solid rgba(168,50,72,0.25);
  border-radius: 4px; padding: 0.2rem 0.5rem;
}
.mock-tags { display: flex; gap: 0.4rem; }
.mock-tag {
  font-size: 0.7rem; color: rgba(255,255,255,0.45);
  background: #2e2e2e; border-radius: 4px; padding: 0.18rem 0.5rem;
}
.mock-tag--teal { color: #c87888; background: rgba(168,50,72,0.12); }
.mock-compare-hint {
  display: flex; align-items: center; gap: 0.4rem;
  font-size: 0.72rem; color: rgba(255,255,255,0.3);
  padding: 0.5rem 0.25rem;
}

.stats-bar {
  max-width: 1000px; margin: 0 auto;
  padding: 1.1rem 2rem;
  display: flex; align-items: center; gap: 2rem;
}
.stat { display: flex; align-items: baseline; gap: 0.4rem; }
.stat-num { font-size: 1rem; font-weight: 800; color: #e8405e; letter-spacing: -0.02em; }
.stat-label { font-size: 0.78rem; color: rgba(255,255,255,0.65); }
.stat-divider { width: 1px; height: 16px; background: #2e2e2e; }

.section-label {
  font-size: 1.75rem; font-weight: 800; letter-spacing: -0.02em;
  text-transform: none; color: #a83248;
  margin: 0 0 2rem;
}
.section-label--light { color: #a83248; }

.feature-rows {
  background: #f5f4f0;
  padding: 1rem 2rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.feature-row {
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
  padding: 4rem 0;
  border-bottom: 1px solid #e8e5dd;
}

.feature-row:last-child { border-bottom: none; }

.feature-row--reverse {
  direction: rtl;
}
.feature-row--reverse > * {
  direction: ltr;
}

.fr-heading {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #1a1a1a;
  margin: 0 0 1rem;
  line-height: 1.2;
}

.fr-desc {
  font-size: 0.925rem;
  color: #555;
  line-height: 1.75;
  margin: 0;
}

.fr-image {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #d4d0c8;
  box-shadow: 0 4px 24px rgba(0,0,0,0.07);
}

.fr-image img {
  width: 100%;
  display: block;
  object-fit: cover;
  height: 300px;
}

.how-section {
  background: #d9d4c7;
  padding: 5rem 2rem;
  border-bottom: 1px solid #ccc7b9;
}
.how-inner { max-width: 1000px; margin: 0 auto; }

.how-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  padding: 3rem 0;
  border-bottom: 1px solid #e8e5dd;
  gap: 4rem;
}
.how-row:last-child { border-bottom: none; padding-bottom: 0; }
.how-row:first-of-type { padding-top: 0; }

.how-num {
  font-size: 7rem;
  font-weight: 900;
  letter-spacing: -0.05em;
  line-height: 1;
  color: white;
  user-select: none;
  text-align: center;
}

.how-row--reverse .how-num { text-align: center; }

.how-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #a83248;
  margin: 0 0 0.65rem;
  letter-spacing: -0.02em;
}
.how-desc {
  font-size: 0.9rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.7;
  margin: 0;
}

.feat-section {
  background: #d9d4c7;
  padding: 5rem 2rem;
  border-bottom: 1px solid #ccc7b9;
}
.feat-inner { max-width: 1000px; margin: 0 auto; }
.feat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2rem;
}
.feat-item { display: flex; flex-direction: column; gap: 0.65rem; }
.feat-icon {
  width: 42px; height: 42px; border-radius: 8px;
  background: #c8c3b6;
  border: 1px solid #b8b3a6;
  display: flex; align-items: center; justify-content: center;
  color: #3a3530; flex-shrink: 0;
}
.feat-item h4 {
  font-size: 0.9rem; font-weight: 700;
  color: #a83248; margin: 0;
}
.feat-item p {
  font-size: 0.83rem; font-weight: 700; color: #0f172a;
  line-height: 1.65; margin: 0;
}

.audience-section {
  background: #0f172a;
  padding: 5rem 2rem;
  color: white;
}
.audience-inner { max-width: 1000px; margin: 0 auto; }
.audience-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 3rem;
}
.audience-card {
  border: 1px solid #2e2e2e;
  border-radius: 10px;
  padding: 1.75rem 1.5rem;
  will-change: transform;
  transition: border-color 0.2s;
}
.audience-card:hover { border-color: #a83248; }
.aud-num {
  font-size: 0.72rem; font-weight: 800;
  color: #a83248; letter-spacing: 0.08em;
  margin-bottom: 1rem;
}
.audience-card h4 {
  font-size: 0.95rem; font-weight: 700;
  color: #f3f4f6; margin: 0 0 0.65rem;
}
.audience-card p {
  font-size: 0.83rem; color: rgba(255,255,255,0.42);
  line-height: 1.65; margin: 0;
}
.audience-cta { text-align: center; }

.landing-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.8rem 2rem;
  background: #0f172a; border-top: 1px solid #2e2e2e;
}
.footer-left {
  display: flex; align-items: center; gap: 0.55rem;
  font-size: 0.76rem; color: rgba(255,255,255,0.35);
}
.footer-left strong { color: rgba(255,255,255,0.55); }
.footer-logo {
  width: 22px; height: 22px; border-radius: 4px; background: #a83248;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.52rem; font-weight: 800; color: white; flex-shrink: 0;
}
.footer-right { font-size: 0.72rem; color: rgba(255,255,255,0.22); }

.header-nav { display: flex; align-items: center; gap: 0.5rem; }
.btn {
  padding: 0.42rem 0.9rem; border: none; border-radius: 6px;
  cursor: pointer; font-size: 0.85rem; font-weight: 600;
  font-family: inherit; transition: all 0.15s; white-space: nowrap;
}
.btn-admin { background: none; color: rgba(255,255,255,0.8); border: none; font-size: 0.95rem; padding: 0.25rem 0.5rem; }
.btn-admin:hover { background: none; color: white; }
.btn-login { background: none; color: rgba(255,255,255,0.8); border: none; font-size: 0.95rem; padding: 0.25rem 0.5rem; }
.btn-login:hover { background: none; color: white; }
.btn-register { background: none; color: rgba(255,255,255,0.8); border: none; font-size: 0.95rem; padding: 0.25rem 0.5rem; }
.btn-register:hover { background: none; color: white; }
.btn-logout { background: #a83248; color: white; border: none; font-size: 0.95rem; padding: 0.5rem 1.1rem; }
.btn-logout:hover { background: #7a1f32; color: white; }
.user-menu { display: flex; align-items: center; gap: 0.5rem; padding-left: 0.75rem; border-left: 1px solid #2e2e2e; margin-left: 0.25rem; }
.user-avatar { width: 28px; height: 28px; border-radius: 50%; background: #64748b; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; cursor: pointer; }
.user-name { font-size: 0.95rem; color: rgba(255,255,255,0.8); font-weight: 500; }

.btn-lang {
  display: flex; align-items: center; gap: 5px;
  background: transparent; border: 1px solid #3a3a3a; border-radius: 6px;
  color: rgba(255,255,255,0.45);
  padding: 0.42rem 0.85rem; font-size: 0.82rem; font-weight: 700;
  cursor: pointer; font-family: inherit; transition: all 0.15s; letter-spacing: 0.06em;
}
.btn-lang:hover { border-color: #555; color: rgba(255,255,255,0.65); }
.lang-sep { color: #3a3a3a; font-size: 0.65rem; }
.lang-active { color: white; }

@media (max-width: 780px) {
  .hero-inner { padding: 3rem 1.25rem 2rem; }
  .hero-heading { font-size: 2rem; }
  .how-row { grid-template-columns: 1fr; gap: 1rem; padding: 2rem 0; }
  .how-row--reverse .how-num { text-align: left; }
  .how-num { font-size: 4rem; }
  .feat-grid { grid-template-columns: 1fr 1fr; }
  .audience-grid { grid-template-columns: 1fr; }
  .stats-bar, .how-section, .feat-section, .audience-section, .feature-rows { padding-left: 1.25rem; padding-right: 1.25rem; }
  .feature-row { grid-template-columns: 1fr; gap: 1.5rem; direction: ltr; }
  .feature-row--reverse { direction: ltr; }
  .landing-nav { padding: 0 1.25rem; }
  .landing-footer { flex-direction: column; gap: 0.35rem; text-align: center; padding: 1rem 1.25rem; }
}
</style>
