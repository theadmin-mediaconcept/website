// app.js — Amplicue Web Store v3 · All functionality in one file
import {
  auth, db, googleProvider, isAdminEmail,
  signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile,
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc,
  collection, query, where, orderBy, limit,
  onSnapshot, getDocs,
  increment, arrayUnion, arrayRemove,
  serverTimestamp, runTransaction,
} from "./firebase-config.js";

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

export function esc(str) {
  if (str == null) return "";
  return String(str).replace(/[&<>"']/g, c =>
    ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])
  );
}

export function $(id) { return document.getElementById(id); }

export function fmtDate(ts) {
  if (!ts?.seconds) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString("en-US",
    { year:"numeric", month:"short", day:"numeric" });
}

export function toast(msg, type = "") {
  let wrap = $("toastWrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "toastWrap";
    wrap.className = "toast-wrap";
    document.body.appendChild(wrap);
  }
  const t = document.createElement("div");
  t.className = "toast" + (type ? " " + type : "");
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

function starsHtml(avg, count) {
  const r = Math.round(avg || 0);
  const warn = "color:var(--warning)";
  const dim  = "color:var(--line)";
  return `<div class="stars">
    <span style="${warn};font-size:13px;">${"★".repeat(r)}</span>
    <span style="${dim};font-size:13px;">${"★".repeat(5-r)}</span>
    <span style="font-size:11.5px;color:var(--text-3);margin-left:3px;">${count||0}</span>
  </div>`;
}

function badgeHtml(s) {
  if (!s.verified) return "";
  const m = {
    Premium: `<span class="badge badge-premium">⭐ Premium</span>`,
    Trusted: `<span class="badge badge-trusted">✔ Trusted</span>`,
    Featured:`<span class="badge badge-featured">✦ Featured</span>`,
  };
  return m[s.badgeType] || `<span class="badge badge-verified">✔ Verified</span>`;
}

// Global click tracker — called by card Visit buttons safely
window._trackVisit = async (siteId, url) => {
  try { await updateDoc(doc(db, "websites", siteId), { clicks: increment(1) }); } catch(_) {}
  window.open(url, "_blank");
};

function cardHtml(s) {
  const safeUrl = esc(s.url || "#");
  return `<a class="card" href="website.html?id=${s.id}">
    <div class="card-top">
      <img class="card-logo" src="${esc(s.logoUrl||"logo.png")}" alt="${esc(s.name)}"
           loading="lazy" onerror="this.src='logo.png'">
      <div class="card-info">
        <div class="card-name">${esc(s.name||"Untitled")}</div>
        <div class="card-cat">${esc(s.category||"")}</div>
        ${starsHtml(s.avgRating, s.ratingCount)}
      </div>
    </div>
    <p class="card-desc">${esc((s.description||"").slice(0,100))}${(s.description||"").length>100?"…":""}</p>
    <div style="display:flex;gap:6px;flex-wrap:wrap;">${badgeHtml(s)}
      ${(s.tags||[]).slice(0,2).map(t=>`<span class="tag">#${esc(t)}</span>`).join("")}
    </div>
    <div class="card-foot">
      <span class="text-muted text-sm">👁 ${s.views||0}</span>
      <button class="card-visit"
        onclick="event.preventDefault();event.stopPropagation();window._trackVisit('${s.id}','${safeUrl}')">
        Visit
      </button>
    </div>
  </a>`;
}

// ═══════════════════════════════════════════════════════════════
// AUTH STATE
// ═══════════════════════════════════════════════════════════════

let _user    = null;
let _profile = null;
let _ready   = false;
const _cbs   = [];

export const getUser    = () => _user;
export const getProfile = () => _profile;
export const isAdmin    = () => !!_profile && _profile.role === "admin";

export function onReady(cb) {
  if (_ready) cb(_user, _profile);
  else _cbs.push(cb);
}

onAuthStateChanged(auth, async user => {
  _user = user;
  if (user) {
    const ref  = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const adm  = isAdminEmail(user.email);
    if (!snap.exists()) {
      _profile = {
        name: user.displayName || "Member",
        email: user.email,
        photoURL: user.photoURL || "",
        role: adm ? "admin" : "user",
        bookmarks: [],
        banned: false,
        createdAt: serverTimestamp()
      };
      await setDoc(ref, _profile);
    } else {
      _profile = snap.data();
      if (adm && _profile.role !== "admin") {
        await setDoc(ref, { role:"admin" }, { merge:true });
        _profile.role = "admin";
      }
    }
    if (_profile.banned) {
      alert("Your account has been suspended.");
      await signOut(auth);
      _user = null; _profile = null;
    }
  } else {
    _profile = null;
  }
  _ready = true;
  _cbs.forEach(cb => cb(_user, _profile));
  renderNav();
});

// ═══════════════════════════════════════════════════════════════
// NAV RENDERING
// ═══════════════════════════════════════════════════════════════

function renderNav() {
  const slot = $("navAuth");
  if (!slot) return;

  if (!_user) {
    slot.innerHTML = `<a href="login.html" class="btn btn-primary btn-sm">Sign in</a>`;
    return;
  }

  const photo = _profile?.photoURL || _user.photoURL || "logo.png";
  const name  = esc(_profile?.name || "Account");
  const email = esc(_profile?.email || "");

  slot.innerHTML = `
    <div class="rel">
      <button id="navAvatarBtn" style="border:none;background:none;cursor:pointer;padding:0;border-radius:50%;">
        <img src="${photo}" class="nav-avatar" alt="${name}" onerror="this.src='logo.png'">
      </button>
      <div id="navMenu" class="nav-dropdown hidden">
        <div class="nav-dropdown-head">
          <div style="font-weight:600;font-size:13.5px;">${name}</div>
          <div style="font-size:12px;color:var(--text-3);margin-top:2px;">${email}</div>
        </div>
        <a href="profile.html">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Profile
        </a>
        <a href="dashboard.html">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          Dashboard
        </a>
        ${isAdmin() ? `<div class="nav-dropdown-divider"></div><a href="admin.html">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>
          Admin Panel
        </a>` : ""}
        <div class="nav-dropdown-divider"></div>
        <button id="navSignOut" style="color:var(--error);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign out
        </button>
      </div>
    </div>`;

  $("navAvatarBtn").addEventListener("click", e => {
    e.stopPropagation();
    $("navMenu").classList.toggle("hidden");
  });
  $("navSignOut").addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
  document.addEventListener("click", () => $("navMenu")?.classList.add("hidden"));
}

// ═══════════════════════════════════════════════════════════════
// PWA / SERVICE WORKER
// ═══════════════════════════════════════════════════════════════

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

let _installPrompt = null;
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  _installPrompt = e;
  const bar = document.createElement("div");
  bar.className = "install-bar";
  bar.innerHTML = `
    <img src="logo.png" alt="" style="width:34px;height:34px;border-radius:8px;flex-shrink:0;">
    <p>Install Amplicue Web Store for faster, offline browsing.</p>
    <button class="btn btn-primary btn-sm" id="installBtn">Install</button>
    <button class="btn btn-ghost btn-sm" id="installDismiss">✕</button>`;
  document.body.appendChild(bar);
  $("installBtn").addEventListener("click", async () => {
    if (!_installPrompt) return;
    _installPrompt.prompt();
    await _installPrompt.userChoice;
    _installPrompt = null;
    bar.remove();
  });
  $("installDismiss").addEventListener("click", () => bar.remove());
});

export async function shareLink(title, url, text) {
  if (navigator.share) {
    try { await navigator.share({ title, text: text || title, url }); } catch (_) {}
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast("Link copied!", "ok");
  } catch (_) {
    window.prompt("Copy link:", url);
  }
}

// ═══════════════════════════════════════════════════════════════
// IMAGE UPLOAD HELPER
// ═══════════════════════════════════════════════════════════════

const IMG_TYPES = ["image/jpeg","image/png","image/webp","image/gif"];
const IMG_MAX   = 10 * 1024 * 1024; // 10 MB — canvas resize compresses output to ~40-80 KB

function validateImg(file) {
  if (!IMG_TYPES.includes(file.type)) return "Only JPEG, PNG, WebP or GIF accepted.";
  if (file.size > IMG_MAX) return "Image too large (max 10 MB).";
  return null;
}

// Resize + convert image file to base64 string
// maxW/maxH control the output dimensions to keep Firestore docs small
function imgToBase64(file, maxW = 400, maxH = 400) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = e => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width: w, height: h } = img;
        // Scale down proportionally
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width  = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        // Use JPEG at 0.82 quality for best size/quality balance
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Screenshots can be wider
function shotToBase64(file) {
  return imgToBase64(file, 900, 600);
}

function wireDrop(zone, input, onFiles) {
  zone.addEventListener("dragover", e => { e.preventDefault(); zone.classList.add("over"); });
  zone.addEventListener("dragleave", e => { if (!zone.contains(e.relatedTarget)) zone.classList.remove("over"); });
  zone.addEventListener("drop", e => {
    e.preventDefault(); zone.classList.remove("over");
    if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
  });
  zone.addEventListener("click", e => { if (e.target === zone || e.target.tagName === "P" || e.target.tagName === "SVG" || e.target.tagName === "path") input.click(); });
}

// ═══════════════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════════════

export const CATEGORIES = [
  "SaaS","E-commerce","Portfolio","Agency","Education",
  "Finance","Health","Blog & News","Nonprofit","Gaming","Productivity","Other"
];

// ═══════════════════════════════════════════════════════════════
// INDEX PAGE
// ═══════════════════════════════════════════════════════════════

function initIndex() {
  if (!$("siteGrid")) return;

  let allSites = [];
  let state = { q:"", cat:"All", sort:"newest", verified:false };

  function score(s) { return (s.views||0) + (s.ratingCount||0)*6 + (s.avgRating||0)*4; }

  function filtered() {
    let list = [...allSites];
    if (state.cat !== "All") list = list.filter(s => s.category === state.cat);
    if (state.verified)       list = list.filter(s => s.verified);
    if (state.q.trim()) {
      const q = state.q.toLowerCase();
      list = list.filter(s =>
        (s.name||"").toLowerCase().includes(q) ||
        (s.brandName||"").toLowerCase().includes(q) ||
        (s.tags||[]).some(t => t.toLowerCase().includes(q))
      );
    }
    const sorts = {
      rated:   (a,b) => (b.avgRating||0) - (a.avgRating||0),
      viewed:  (a,b) => (b.views||0) - (a.views||0),
      trending:(a,b) => score(b) - score(a),
      newest:  (a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0),
    };
    return list.sort(sorts[state.sort] || sorts.newest);
  }

  function renderGrid() {
    const list = filtered();
    const g = $("siteGrid");
    const c = $("resultCount");
    if (c) c.textContent = `${list.length} website${list.length===1?"":"s"}`;
    g.innerHTML = list.length
      ? list.map(cardHtml).join("")
      : `<div class="empty" style="grid-column:1/-1;"><h3>No results</h3><p>Try a different filter or search term.</p></div>`;

    const feat = $("featuredGrid");
    if (feat) {
      const f = [...allSites].filter(s=>s.verified).sort((a,b)=>score(b)-score(a)).slice(0,4);
      feat.innerHTML = f.length ? f.map(cardHtml).join("")
        : `<p class="text-muted text-sm" style="padding:16px 0;">Featured listings appear once verified websites are approved.</p>`;
    }
    const trend = $("trendingGrid");
    if (trend) {
      const t = [...allSites].sort((a,b) => score(b) - score(a)).slice(0, 4);
      trend.innerHTML = t.length ? t.map(s => {
        return cardHtml(s)
          .replace('<a class="card"', '<a class="card" style="position:relative;"')
          .replace('</a>', `<div style="position:absolute;top:10px;right:10px;background:var(--error);color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;pointer-events:none;">🔥 Trending</div></a>`);
      }).join("")
        : `<p class="text-muted text-sm" style="padding:16px 0;">Trending data will appear soon.</p>`;
    }
  }

  function renderChips() {
    const row = $("categoryChips");
    if (!row) return;
    row.innerHTML = ["All",...CATEGORIES].map(c =>
      `<button class="chip${c===state.cat?" active":""}" data-cat="${esc(c)}">${esc(c)}</button>`
    ).join("");
    row.querySelectorAll(".chip").forEach(btn =>
      btn.addEventListener("click", () => { state.cat = btn.dataset.cat; renderChips(); renderGrid(); })
    );
  }

  // Controls
  $("searchInput")?.addEventListener("input", e => { state.q = e.target.value; renderGrid(); });
  $("sortSelect")?.addEventListener("change", e => { state.sort = e.target.value; renderGrid(); });
  $("verifiedToggle")?.addEventListener("change", e => { state.verified = e.target.checked; renderGrid(); });

  const param = new URLSearchParams(location.search).get("filter");
  if (param === "trending") state.sort = "trending";
  if (param === "verified") state.verified = true;
  if (param === "top")      state.sort = "rated";

  renderChips();
  $("siteGrid").innerHTML = `<div class="spin-row" style="grid-column:1/-1;"><div class="spinner"></div> Loading…</div>`;

  const q = query(collection(db,"websites"), where("status","==","published"));
  onSnapshot(q, snap => {
    allSites = [];
    snap.forEach(d => allSites.push({ id:d.id, ...d.data() }));
    renderGrid();
  }, () => {
    $("siteGrid").innerHTML = `<div class="empty" style="grid-column:1/-1;"><h3>Could not load listings</h3><p>Check your Firebase config.</p></div>`;
  });
}

// ═══════════════════════════════════════════════════════════════
// WEBSITE DETAIL PAGE
// ═══════════════════════════════════════════════════════════════

async function initWebsite() {
  if (!$("detailRoot")) return;
  const siteId = new URLSearchParams(location.search).get("id");
  if (!siteId) { $("detailRoot").innerHTML = notFoundHtml(); return; }

  let siteData = null;
  let myReview = null;
  let pickedRating = 0;
  let unsubReviews = null;

  function notFoundHtml() {
    return `<div class="empty" style="margin:60px 0;"><h3>Listing not found</h3>
      <p>This website doesn't exist or hasn't been published yet.</p>
      <a href="index.html" class="btn btn-primary">Back to directory</a></div>`;
  }

  async function bumpView() {
    const key = "aw_v_" + siteId;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    try { await updateDoc(doc(db,"websites",siteId), { views: increment(1) }); } catch(_) {}
  }

  function renderPage() {
    const s = siteData;
    document.title = `${s.name} — Amplicue Web Store`;
    if ($("breadCat"))  $("breadCat").textContent  = s.category || "Listing";
    if ($("breadName")) $("breadName").textContent = s.name;

    const shots = (s.screenshots||[]).map(u =>
      `<img src="${esc(u)}" class="shot-img" alt="Screenshot" loading="lazy">`
    ).join("") || `<p class="text-muted text-sm">No screenshots uploaded.</p>`;

    $("detailRoot").innerHTML = `
      <div class="detail-head" style="margin:0 -16px;padding:28px 16px;">
        <div class="detail-top">
          <img class="detail-logo" src="${esc(s.logoUrl||"logo.png")}" alt="${esc(s.name)}" onerror="this.src='logo.png'">
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
              <span style="font-size:12px;font-weight:600;color:var(--primary);background:var(--primary-lt);border:1px solid #BFDBFE;border-radius:999px;padding:3px 10px;">${esc(s.category||"")}</span>
              ${badgeHtml(s)}
            </div>
            <div class="detail-name">${esc(s.name)}</div>
            ${s.brandName?`<p style="font-size:13.5px;color:var(--text-3);margin:2px 0 8px;">by ${esc(s.brandName)}</p>`:""}
            <div style="font-size:16px;color:var(--warning);">${"★".repeat(Math.round(s.avgRating||0))}${"☆".repeat(5-Math.round(s.avgRating||0))}
              <span style="font-size:13px;color:var(--text-3);margin-left:6px;">${(s.avgRating||0).toFixed(1)} · ${s.ratingCount||0} reviews</span>
            </div>
            <div style="font-size:12px;color:var(--text-3);margin-top:6px;">👁 ${s.views||0} views</div>
          </div>
        </div>
        <div class="detail-acts">
          <a href="${esc(s.url||"#")}" target="_blank" rel="noopener" class="btn btn-primary btn-lg"
            onclick="try{window._trackVisit('${siteId}','${esc(s.url||"#")}');return false;}catch(e){}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Visit website
          </a>
          <button id="bookmarkBtn" class="btn">Save</button>
          <button id="shareBtn" class="btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Share
          </button>
          <button id="reportBtn" class="btn btn-danger btn-sm">Report</button>
        </div>
      </div>

      <div class="tabs" id="detailTabs" style="margin:0 -16px;">
        <button class="tab active" data-tab="overview" style="padding-left:24px;">Overview</button>
        <button class="tab" data-tab="reviews">Reviews</button>
        <button class="tab" data-tab="owner">Owner</button>
      </div>

      <div class="tab-body" id="tab-overview">
        <h3 style="font-size:16px;margin-bottom:10px;">About</h3>
        <p style="color:var(--text-2);line-height:1.7;max-width:700px;">${esc(s.description||"No description.")}</p>
        ${(s.tags||[]).length?`<div style="margin-top:18px;"><h4 style="font-size:12.5px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;">Tags</h4><div class="tags-row">${(s.tags||[]).map(t=>`<span class="tag">#${esc(t)}</span>`).join("")}</div></div>`:""}
        <div style="margin-top:22px;">
          <h4 style="font-size:12.5px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:12px;">Screenshots</h4>
          <div class="shots-scroll">${shots}</div>
        </div>
      </div>

      <div class="tab-body hidden" id="tab-reviews">
        <div id="reviewFormSlot"></div>
        <div id="reviewListSlot" style="margin-top:16px;"></div>
      </div>

      <div class="tab-body hidden" id="tab-owner">
        <div style="background:var(--bg-soft);border:1px solid var(--line);border-radius:var(--r-l);padding:20px;max-width:440px;">
          <div style="font-weight:700;font-size:16px;margin-bottom:12px;">🏢 ${esc(s.brandName||"—")}</div>
          <div style="font-size:13.5px;color:var(--text-2);display:grid;gap:8px;">
            <div><span class="text-muted">Category:</span> <strong>${esc(s.category||"—")}</strong></div>
            <div><span class="text-muted">Status:</span> <span class="pill pill-approved">Published</span></div>
            ${s.verified?`<div><span class="text-muted">Verification:</span> ${badgeHtml(s)}</div>`:""}
          </div>
        </div>
      </div>`;

    // Tab switching
    $("detailTabs").querySelectorAll(".tab").forEach(tab =>
      tab.addEventListener("click", () => {
        $("detailTabs").querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".tab-body").forEach(p => p.classList.add("hidden"));
        tab.classList.add("active");
        $("tab-"+tab.dataset.tab)?.classList.remove("hidden");
      })
    );

    $("shareBtn").addEventListener("click", () =>
      shareLink(`${s.name} — Amplicue Web Store`, location.href, (s.description||"").slice(0,140))
    );
    $("reportBtn").addEventListener("click", onReport);

    updateBookmarkBtn();
    renderReviewForm();

    unsubReviews = onSnapshot(
      query(collection(db,"reviews"), where("websiteId","==",siteId), orderBy("createdAt","desc")),
      snap => {
        const reviews = [];
        snap.forEach(d => reviews.push({ id:d.id, ...d.data() }));
        renderReviewList(reviews);
        const mine = _user ? reviews.find(r => r.uid === _user.uid) : null;
        myReview = mine || null;
        renderReviewForm();
      }
    );
  }

  function updateBookmarkBtn() {
    const btn = $("bookmarkBtn");
    if (!btn) return;
    const saved = !!(_profile?.bookmarks?.includes(siteId));
    btn.textContent = saved ? "✓ Saved" : "Save";
    btn.onclick = async () => {
      if (!_user) { window.location.href = "login.html"; return; }
      await updateDoc(doc(db,"users",_user.uid), {
        bookmarks: saved ? arrayRemove(siteId) : arrayUnion(siteId)
      });
      _profile.bookmarks = saved
        ? (_profile.bookmarks||[]).filter(id=>id!==siteId)
        : [...(_profile.bookmarks||[]), siteId];
      toast(saved ? "Removed from saved" : "Saved!", "ok");
      updateBookmarkBtn();
    };
  }

  function renderReviewForm() {
    const slot = $("reviewFormSlot");
    if (!slot) return;
    if (!_user) {
      slot.innerHTML = `<div style="background:var(--bg-soft);border:1px solid var(--line);border-radius:var(--r-l);padding:20px;text-align:center;margin-bottom:16px;">
        <p style="margin:0 0 12px;color:var(--text-2);">Sign in to leave a review</p>
        <a href="login.html" class="btn btn-primary btn-sm">Sign in</a></div>`;
      return;
    }
    if (myReview) {
      slot.innerHTML = `<div class="review-card" style="margin-bottom:16px;">
        <div style="font-size:13px;color:var(--text-3);margin-bottom:6px;">Your review ·
          <span style="color:var(--warning);">${"★".repeat(myReview.rating||0)}</span></div>
        <p style="margin:0;font-size:13.5px;">${esc(myReview.text||"")}</p>
      </div>`;
      return;
    }
    pickedRating = 0;
    slot.innerHTML = `<div class="form-card" style="margin-bottom:20px;">
      <h3 style="font-size:15px;margin-bottom:14px;">Write a review</h3>
      <div id="starPicker" style="display:flex;gap:6px;margin-bottom:14px;font-size:28px;cursor:pointer;">
        ${[1,2,3,4,5].map(i=>`<span class="sp" data-v="${i}" style="color:var(--line);transition:color .1s;">★</span>`).join("")}
      </div>
      <textarea class="textarea" id="reviewText" placeholder="Share your experience…" style="min-height:80px;"></textarea>
      <div style="margin-top:12px;"><button class="btn btn-primary" id="submitRevBtn">Post review</button></div>
    </div>`;

    const picks = slot.querySelectorAll(".sp");
    picks.forEach(s => {
      s.addEventListener("mouseover", () => picks.forEach(p => p.style.color = +p.dataset.v <= +s.dataset.v ? "var(--warning)" : "var(--line)"));
      s.addEventListener("mouseout",  () => picks.forEach(p => p.style.color = +p.dataset.v <= pickedRating ? "var(--warning)" : "var(--line)"));
      s.addEventListener("click",     () => { pickedRating = +s.dataset.v; picks.forEach(p => p.style.color = +p.dataset.v <= pickedRating ? "var(--warning)" : "var(--line)"); });
    });

    $("submitRevBtn").addEventListener("click", async () => {
      const text = $("reviewText").value.trim();
      if (!pickedRating) { toast("Pick a star rating", "err"); return; }
      if (!text)          { toast("Write something", "err"); return; }
      $("submitRevBtn").disabled = true;
      try {
        const siteRef = doc(db, "websites", siteId);
        await runTransaction(db, async tx => {
          const snap = await tx.get(siteRef);
          if (!snap.exists()) throw new Error("Website not found");
          const d = snap.data();
          const newCount = (d.ratingCount||0) + 1;
          const newAvg   = ((d.avgRating||0) * (d.ratingCount||0) + pickedRating) / newCount;
          tx.update(siteRef, { avgRating: newAvg, ratingCount: newCount });
        });
        await addDoc(collection(db,"reviews"), {
          websiteId: siteId,
          uid: _user.uid,
          userName: _profile?.name || _user.displayName || "Member",
          userPhoto: _profile?.photoURL || _user.photoURL || "",
          rating: pickedRating,
          text,
          helpfulVotes: 0,
          createdAt: serverTimestamp()
        });
        toast("Review posted!", "ok");
      } catch(e) { toast("Error: " + e.message, "err"); $("submitRevBtn").disabled = false; }
    });
  }

  function renderReviewList(reviews) {
    const slot = $("reviewListSlot");
    if (!slot) return;
    if (!reviews.length) {
      slot.innerHTML = `<div class="empty"><h3>No reviews yet</h3><p>Be the first to share your experience.</p></div>`;
      return;
    }
    slot.innerHTML = reviews.map(r => `
      <div class="review-card">
        <div class="review-head">
          <img class="review-av" src="${esc(r.userPhoto) || "logo.png"}" alt="" onerror="this.src='logo.png'">
          <div>
            <div style="font-weight:600;font-size:13.5px;">${esc(r.userName||"Anonymous")}</div>
            <div style="font-size:11.5px;color:var(--text-3);">${fmtDate(r.createdAt)}</div>
          </div>
          <div style="margin-left:auto;color:var(--warning);font-size:14px;">${"★".repeat(r.rating||0)}</div>
        </div>
        <p style="font-size:13.5px;color:var(--text-2);margin:0;">${esc(r.text||"")}</p>
        <div style="margin-top:10px;">
          <button class="helpful-btn" data-rev-id="${r.id}" style="background:none;border:none;cursor:pointer;font-size:12px;color:var(--text-3);font-family:inherit;padding:0;">
            👍 Helpful (${r.helpfulVotes||0})
          </button>
        </div>
      </div>`).join("");

    // Event delegation — no inline onclick, no window globals
    slot.querySelectorAll(".helpful-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        await updateDoc(doc(db, "reviews", btn.dataset.revId), { helpfulVotes: increment(1) });
      });
    });
  }

  async function onReport() {
    if (!_user) { window.location.href = "login.html"; return; }
    const reason = prompt("Why are you reporting this listing?");
    if (!reason?.trim()) return;
    await addDoc(collection(db,"reports"), {
      siteId, reason: reason.trim(),
      reportedBy: _user.uid, status:"open", createdAt: serverTimestamp()
    });
    toast("Report submitted. Thank you.", "ok");
  }

  // Load page
  try {
    const snap = await getDoc(doc(db,"websites",siteId));
    if (!snap.exists() || snap.data().status !== "published") {
      $("detailRoot").innerHTML = notFoundHtml(); return;
    }
    siteData = { id: snap.id, ...snap.data() };
    bumpView();
    renderPage();
    onReady(() => { updateBookmarkBtn(); renderReviewForm(); });
  } catch(e) {
    $("detailRoot").innerHTML = `<div class="empty"><h3>Error loading listing</h3><p>${esc(e.message)}</p></div>`;
  }
}

// ═══════════════════════════════════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════════════════════════════════

function initLogin() {
  if (!$("loginCard")) return;

  $("googleBtn")?.addEventListener("click", async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      redirect();
    } catch(e) { toast(e.message, "err"); }
  });

  $("loginForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const em = $("loginEmail").value.trim();
    const pw = $("loginPw").value;
    const btn = $("loginSubmitBtn");
    btn.disabled = true; btn.textContent = "Signing in…";
    try {
      await signInWithEmailAndPassword(auth, em, pw);
      redirect();
    } catch(err) {
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        if (confirm("No account found with that email. Create one now?")) {
          try {
            await createUserWithEmailAndPassword(auth, em, pw);
            redirect();
          } catch(e2) { toast(e2.message, "err"); }
        }
      } else { toast(err.message, "err"); }
      btn.disabled = false; btn.textContent = "Sign in";
    }
  });

  function redirect() {
    const r = sessionStorage.getItem("aws_redir") || "index.html";
    sessionStorage.removeItem("aws_redir");
    window.location.href = r;
  }
}

// ═══════════════════════════════════════════════════════════════
// UPLOAD PAGE
// ═══════════════════════════════════════════════════════════════

function initUpload() {
  if (!$("step1")) return;

  onReady(user => {
    if (!user) {
      sessionStorage.setItem("aws_redir", location.pathname);
      window.location.href = "login.html"; return;
    }
    startUploadFlow(user);
  });
}

async function startUploadFlow(user) {
  let ownerDoc = null;
  let logoFile = null;
  let shotFiles = [];
  let currentStep = 1;

  // Check if owner profile exists — use uid as document ID to prevent duplicates
  const ownerRef  = doc(db, "owners", user.uid);
  const ownerSnap = await getDoc(ownerRef);
  if (ownerSnap.exists()) {
    ownerDoc = { id: ownerSnap.id, ...ownerSnap.data() };
    const sum = $("brandSummary");
    if (sum) sum.textContent = `Submitting under ${ownerDoc.brandName}`;
    goStep(2);
  }

  // populate category selects
  ["siteCategory"].forEach(id => {
    const el = $(id);
    if (el) el.innerHTML = CATEGORIES.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
  });

  function goStep(n) {
    for (let i = 1; i <= 3; i++) {
      $("step"+i)?.classList.add("hidden");
      const dot = $("dot"+i);
      const lbl = $("lbl"+i);
      if (!dot) continue;
      dot.classList.remove("active","done");
      lbl?.classList.remove("active");
      if (i < n)      { dot.classList.add("done"); dot.innerHTML = "✓"; }
      else if (i===n) { dot.classList.add("active"); dot.textContent = i; lbl?.classList.add("active"); }
      else            { dot.textContent = i; }
      if (i < 3) $("line"+i)?.classList.toggle("done", i < n);
    }
    $("step"+n)?.classList.remove("hidden");
    currentStep = n;
    window.scrollTo({ top:0, behavior:"smooth" });
  }

  window.goStep = goStep;

  // Logo upload zone
  const logoZone = $("logoZone");
  const logoInput = $("logoInput");
  if (logoZone && logoInput) {
    wireDrop(logoZone, logoInput, files => handleLogo(files[0]));
    logoInput.addEventListener("change", () => { if(logoInput.files[0]) handleLogo(logoInput.files[0]); });
  }

  function handleLogo(file) {
    const err = validateImg(file);
    if (err) { toast(err,"err"); return; }
    logoFile = file;
    const url = URL.createObjectURL(file);
    const prev = $("logoPrev");
    if (prev) { prev.src = url; prev.classList.remove("hidden"); prev.onload=()=>URL.revokeObjectURL(url); }
    const lbl = $("logoLabel");
    if (lbl) lbl.textContent = file.name;
  }

  // Screenshots zone
  const shotZone = $("shotZone");
  const shotInput = $("shotInput");
  if (shotZone && shotInput) {
    wireDrop(shotZone, shotInput, files => handleShots(files));
    shotInput.addEventListener("change", () => handleShots(shotInput.files));
  }

  function handleShots(files) {
    const remaining = 6 - shotFiles.length;
    Array.from(files).slice(0, remaining).forEach(file => {
      const err = validateImg(file);
      if (err) { toast(err,"err"); return; }
      shotFiles.push(file);
    });
    renderShotPreviews();
  }

  function renderShotPreviews() {
    const row = $("shotPreviews");
    if (!row) return;
    row.innerHTML = "";
    shotFiles.forEach((f, i) => {
      const url = URL.createObjectURL(f);
      const wrap = document.createElement("div");
      wrap.className = "shot-thumb";
      wrap.innerHTML = `<img src="${url}" alt=""><button class="shot-rm" data-i="${i}">✕</button>`;
      wrap.querySelector("img").onload = () => URL.revokeObjectURL(url);
      row.appendChild(wrap);
    });
    row.querySelectorAll(".shot-rm").forEach(btn =>
      btn.addEventListener("click", () => { shotFiles.splice(+btn.dataset.i,1); renderShotPreviews(); })
    );
    const lbl = $("shotCount");
    if (lbl) lbl.textContent = `${shotFiles.length}/6 selected`;
  }

  // Step 1 → Step 2: save owner (setDoc with uid = no duplicates ever)
  $("ownerForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Saving…";
    try {
      const data = {
        uid:       user.uid,
        fullName:  $("ownerName").value.trim(),
        brandName: $("brandName").value.trim(),
        email:     $("ownerEmail").value.trim(),
        phone:     $("ownerPhone")?.value.trim()  || "",
        country:   $("ownerCountry")?.value.trim() || "",
        social:    $("ownerSocial")?.value.trim()  || "",
        verificationRequested: $("ownerVerify")?.checked || false,
        updatedAt: serverTimestamp()
      };
      // Use uid as document ID — safe to call multiple times, never duplicates
      await setDoc(doc(db, "owners", user.uid), data, { merge: true });
      ownerDoc = { id: user.uid, ...data };
      const sum = $("brandSummary");
      if (sum) sum.textContent = `Submitting under ${ownerDoc.brandName}`;
      toast("Brand profile saved", "ok");
      goStep(2);
    } catch(err) { toast(err.message, "err"); btn.disabled = false; btn.textContent = "Continue"; }
  });

  // Step 2: website form
  $("siteForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    if (!ownerDoc) { toast("Complete brand info first","err"); goStep(1); return; }
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled=true; btn.textContent="Uploading images…";

    try {
      let logoUrl = "";
      if (logoFile) {
        btn.textContent = "Checking for duplicates…";
      const siteUrl = $("siteUrl").value.trim();

      // Check for duplicate URL in both published and pending collections
      const [dupPub, dupPend] = await Promise.all([
        getDocs(query(collection(db,"websites"),     where("url","==",siteUrl))),
        getDocs(query(collection(db,"pendingWebsites"), where("url","==",siteUrl)))
      ]);
      if (!dupPub.empty || !dupPend.empty) {
        toast("This URL has already been submitted.", "err");
        btn.disabled = false; btn.textContent = "Submit for review";
        return;
      }

      btn.textContent = "Processing logo…";
        logoUrl = await imgToBase64(logoFile, 400, 400);
      }

      btn.textContent = "Processing screenshots…";
      const screenshots = [];
      for (let i = 0; i < shotFiles.length; i++) {
        const b64 = await shotToBase64(shotFiles[i]);
        screenshots.push(b64);
      }

      btn.textContent = "Submitting…";
      const tags = ($("siteTags")?.value||"").split(",").map(t=>t.trim()).filter(Boolean).slice(0,8);
      await addDoc(collection(db,"pendingWebsites"), {
        name:        $("siteName").value.trim(),
        url:         siteUrl,
        description: $("siteDesc").value.trim(),
        category:    $("siteCategory").value,
        tags, logoUrl, screenshots,
        ownerId:   ownerDoc.id,
        ownerUid:  user.uid,
        brandName: ownerDoc.brandName,
        status: "pending",
        verified: false,
        badgeType: null,
        views: 0,
        avgRating: 0,
        ratingCount: 0,
        createdAt: serverTimestamp()
      });
      goStep(3); // success step
    } catch(err) {
      toast("Submission failed: " + err.message, "err");
      btn.disabled=false; btn.textContent="Submit for review";
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// PROFILE PAGE
// ═══════════════════════════════════════════════════════════════

function initProfile() {
  if (!$("profName")) return;

  onReady(async user => {
    if (!user) { sessionStorage.setItem("aws_redir","profile.html"); window.location.href="login.html"; return; }

    // Populate header
    $("profName").textContent  = _profile?.name || user.displayName || "Member";
    $("profEmail").textContent = _profile?.email || user.email || "";
    const av = $("profAvatar");
    if (av) av.src = _profile?.photoURL || user.photoURL || `https://ui-avatars.com/api/?size=80&name=${encodeURIComponent(_profile?.name||"User")}&background=2563EB&color=fff&rounded=true`;

    const joined = $("profJoined");
    if (joined && _profile?.createdAt) joined.textContent = "Joined " + fmtDate(_profile.createdAt);

    $("signOutBtn")?.addEventListener("click", async () => { await signOut(auth); window.location.href="index.html"; });

    // Load submissions
    const submSnap = await getDocs(query(collection(db,"pendingWebsites"),where("ownerUid","==",user.uid)));
    const pubSnap  = await getDocs(query(collection(db,"websites"),where("ownerUid","==",user.uid)));
    const revSnap  = await getDocs(query(collection(db,"reviews"),where("uid","==",user.uid)));
    const saved    = (_profile?.bookmarks||[]).length;

    $("kpiUploads").textContent = submSnap.size + pubSnap.size;
    $("kpiSaved").textContent   = saved;
    $("kpiReviews").textContent = revSnap.size;

    // Render my websites
    const grid = $("myWebsitesGrid");
    if (grid) {
      const all = [];
      submSnap.forEach(d => all.push({ id:d.id, ...d.data(), _pending:true }));
      pubSnap.forEach(d  => all.push({ id:d.id, ...d.data() }));
      grid.innerHTML = all.length ? all.map(s => `
        <div class="card" style="cursor:default;">
          <div class="card-top">
            <img class="card-logo" src="${esc(s.logoUrl||"logo.png")}" alt="" onerror="this.src='logo.png'">
            <div class="card-info">
              <div class="card-name">${esc(s.name||"—")}</div>
              <div class="card-cat">${esc(s.category||"")}</div>
            </div>
          </div>
          <div>${s._pending ? `<span class="pill pill-pending">Pending review</span>` : `<span class="pill pill-approved">Published</span>`}</div>
          ${!s._pending ? `<a href="website.html?id=${s.id}" class="btn btn-sm btn-outline" style="align-self:flex-start;">View listing</a>` : ""}
        </div>`).join("")
        : `<div class="empty" style="grid-column:1/-1;"><h3>No submissions yet</h3><p>Submit your first website to get started.</p><a href="upload.html" class="btn btn-primary">Submit a website</a></div>`;
    }

    // Render saved
    const savedGrid = $("savedGrid");
    if (savedGrid && (_profile?.bookmarks||[]).length) {
      const bms = _profile.bookmarks.slice(0,20);
      const docs = await Promise.all(bms.map(id => getDoc(doc(db,"websites",id))));
      const sites = docs.filter(d=>d.exists()).map(d=>({id:d.id,...d.data()}));
      savedGrid.innerHTML = sites.length ? sites.map(cardHtml).join("") : `<div class="empty" style="grid-column:1/-1;"><h3>No saved websites</h3></div>`;
    } else if (savedGrid) {
      savedGrid.innerHTML = `<div class="empty" style="grid-column:1/-1;"><h3>Nothing saved yet</h3><p>Browse the directory and save websites you like.</p></div>`;
    }

    // Render reviews
    const revWrap = $("myReviews");
    if (revWrap) {
      const revs = [];
      revSnap.forEach(d => revs.push({ id:d.id,...d.data() }));
      revWrap.innerHTML = revs.length ? revs.map(r=>`
        <div class="review-card">
          <div style="font-size:13px;color:var(--text-3);margin-bottom:6px;">${fmtDate(r.createdAt)} ·
            <a href="website.html?id=${r.websiteId}" style="color:var(--primary);">View listing</a>
          </div>
          <div style="color:var(--warning);font-size:14px;margin-bottom:6px;">${"★".repeat(r.rating||0)}</div>
          <p style="margin:0;font-size:13.5px;">${esc(r.text||"")}</p>
        </div>`).join("")
        : `<div class="empty"><h3>No reviews yet</h3></div>`;
    }

    // Settings form
    const sName = $("settingsName");
    if (sName) sName.value = _profile?.name || "";

    $("saveSettingsBtn")?.addEventListener("click", async () => {
      const name = $("settingsName").value.trim();
      if (!name) { toast("Name cannot be empty","err"); return; }
      await updateDoc(doc(db,"users",user.uid), { name });
      if (user.displayName !== name) await updateProfile(user, { displayName: name });
      _profile.name = name;
      $("profName").textContent = name;
      toast("Saved!","ok");
    });

    // Avatar change
    const avInput = $("avatarInput");
    avInput?.addEventListener("change", async () => {
      const file = avInput.files[0];
      if (!file) return;
      const err = validateImg(file);
      if (err) { toast(err,"err"); return; }
      toast("Processing photo…");
      try {
        const b64 = await imgToBase64(file, 200, 200);
        await updateDoc(doc(db,"users",user.uid), { photoURL: b64 });
        await updateProfile(user, { photoURL: "" }); // Firebase Auth doesn't accept base64, keep blank
        _profile.photoURL = b64;
        if (av) av.src = b64;
        renderNav();
        toast("Photo updated","ok");
      } catch(e) { toast(e.message,"err"); }
    });
  });

  // Tab switching
  document.querySelectorAll(".prof-tab").forEach(tab =>
    tab.addEventListener("click", () => {
      document.querySelectorAll(".prof-tab").forEach(t=>t.classList.remove("active"));
      document.querySelectorAll(".prof-panel").forEach(p=>p.classList.add("hidden"));
      tab.classList.add("active");
      $("panel-"+tab.dataset.tab)?.classList.remove("hidden");
    })
  );
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════

function initDashboard() {
  if (!$("dashTableBody")) return;
  onReady(async user => {
    if (!user) { sessionStorage.setItem("aws_redir","dashboard.html"); window.location.href="login.html"; return; }

    const pendSnap = await getDocs(query(collection(db,"pendingWebsites"), where("ownerUid","==",user.uid)));
    const pubSnap  = await getDocs(query(collection(db,"websites"),        where("ownerUid","==",user.uid)));
    const rejSnap  = await getDocs(query(collection(db,"rejectedWebsites"),where("ownerUid","==",user.uid)));

    let total=0, approved=0, pending=0, views=0;
    const all = [];

    pendSnap.forEach(d => { const s=d.data(); all.push({id:d.id,...s,_status:"pending"});  total++; pending++; });
    pubSnap.forEach(d  => { const s=d.data(); all.push({id:d.id,...s,_status:"approved"}); total++; approved++; views+=s.views||0; });
    rejSnap.forEach(d  => { const s=d.data(); all.push({id:d.id,...s,_status:"rejected"}); total++; });

    setText("dashTotal",    total);
    setText("dashApproved", approved);
    setText("dashPending",  pending);
    setText("dashViews",    views);

    renderDashTable(all);

    document.querySelectorAll("#dashTabs .tab").forEach(tab =>
      tab.addEventListener("click", () => {
        document.querySelectorAll("#dashTabs .tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        const f = tab.dataset.panel;
        renderDashTable(f === "all" ? all : all.filter(s => s._status === f));
      })
    );
  });

  function renderDashTable(list) {
    const body = $("dashTableBody");
    if (!list.length) {
      body.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-3);">No submissions yet</td></tr>`;
      return;
    }
    body.innerHTML = list.map(s => {
      const statusBadge =
        s._status === "approved" ? `<span class="pill pill-approved">Approved</span>` :
        s._status === "rejected" ? `<span class="pill pill-rejected">Rejected</span>` :
                                   `<span class="pill pill-pending">Pending review</span>`;
      const reasonCell = s._status === "rejected" && s.rejectionReason
        ? `<span style="font-size:12px;color:var(--error);display:block;margin-top:3px;">Reason: ${esc(s.rejectionReason)}</span>`
        : "";
      return `<tr>
        <td><div style="display:flex;align-items:center;gap:10px;">
          <img src="${esc(s.logoUrl||"logo.png")}" style="width:32px;height:32px;border-radius:8px;border:1px solid var(--line);object-fit:cover;" onerror="this.src='logo.png'" alt="">
          <strong>${esc(s.name||"—")}</strong>
        </div></td>
        <td>${esc(s.category||"—")}</td>
        <td>${statusBadge}${reasonCell}</td>
        <td>${fmtDate(s.createdAt)}</td>
        <td>${s.views||0}</td>
        <td>${s._status==="approved" ? `<a href="website.html?id=${s.id}" class="btn btn-sm">View</a>` :
             s._status==="rejected" ? `<a href="upload.html" class="btn btn-sm btn-outline">Resubmit</a>` : ""}
        </td>
      </tr>`;
    }).join("");
  }
}

// ═══════════════════════════════════════════════════════════════
// ADMIN PAGE
// ═══════════════════════════════════════════════════════════════

function initAdmin() {
  if (!$("adminSidebar")) return;

  onReady(async user => {
    if (!user || !isAdmin()) {
      alert("Admin access only.");
      window.location.href = "index.html"; return;
    }
    loadSection("dashboard");
  });

  document.querySelectorAll(".sb-link[data-sec]").forEach(link =>
    link.addEventListener("click", () => {
      document.querySelectorAll(".sb-link").forEach(l=>l.classList.remove("active"));
      link.classList.add("active");
      document.querySelectorAll(".sec").forEach(s=>s.classList.remove("active"));
      $("sec-"+link.dataset.sec)?.classList.add("active");
      loadSection(link.dataset.sec);
    })
  );
}

function loadSection(name) {
  const loaders = {
    dashboard:    adminDashboard,
    websites:     adminWebsites,
    pending:      adminPending,
    verification: adminVerification,
    reviews:      adminReviews,
    users:        adminUsers,
    reports:      adminReports,
    analytics:    adminAnalytics,
  };
  loaders[name]?.();
}

async function adminDashboard() {
  const [pendSnap, sitesSnap, usersSnap, revsSnap, verSnap, repsSnap] = await Promise.all([
    getDocs(collection(db,"pendingWebsites")),
    getDocs(query(collection(db,"websites"),where("status","==","published"))),
    getDocs(collection(db,"users")),
    getDocs(collection(db,"reviews")),
    getDocs(query(collection(db,"websites"),where("verified","==",true))),
    getDocs(query(collection(db,"reports"),where("status","==","open"))),
  ]);
  setText("wTotal",    sitesSnap.size);
  setText("wPending",  pendSnap.size);
  setText("wUsers",    usersSnap.size);
  setText("wReviews",  revsSnap.size);
  setText("wVerified", verSnap.size);
  setText("wReports",  repsSnap.size);
  setText("pendingCount", pendSnap.size);

  const tbl = $("recentPending");
  if (!tbl) return;
  if (pendSnap.empty) { tbl.innerHTML=`<div class="empty"><h3>Queue is clear 🎉</h3></div>`; return; }
  let rows = "";
  pendSnap.forEach(d => {
    const s=d.data();
    rows += `<tr>
      <td><div style="display:flex;align-items:center;gap:10px;">
        <img src="${esc(s.logoUrl||"logo.png")}" style="width:32px;height:32px;border-radius:8px;border:1px solid var(--line);" onerror="this.src='logo.png'" alt="">
        <div><strong>${esc(s.name||"—")}</strong><br><span class="text-muted text-sm">${esc(s.url||"")}</span></div>
      </div></td>
      <td>${esc(s.brandName||"—")}</td>
      <td>${esc(s.category||"—")}</td>
      <td>${fmtDate(s.createdAt)}</td>
      <td style="white-space:nowrap;">
        <button class="btn btn-primary btn-sm" data-approve="${d.id}">Approve</button>
        <button class="btn btn-danger btn-sm" style="margin-left:6px;" data-reject="${d.id}">Reject</button>
      </td></tr>`;
  });
  tbl.innerHTML = `<div class="table-wrap"><table class="tbl"><thead><tr><th>Website</th><th>Brand</th><th>Category</th><th>Submitted</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  wirePendingActions(tbl);
}

async function adminPending() {
  const el = $("pendingList");
  if (!el) return;
  el.innerHTML = `<div class="spin-row"><div class="spinner"></div> Loading…</div>`;
  const snap = await getDocs(query(collection(db,"pendingWebsites"),orderBy("createdAt","desc")));
  if (snap.empty) { el.innerHTML=`<div class="empty"><h3>Queue is clear 🎉</h3></div>`; return; }
  let rows = "";
  snap.forEach(d => {
    const s=d.data();
    rows+=`<tr>
      <td><div style="display:flex;align-items:center;gap:10px;">
        <img src="${esc(s.logoUrl||"logo.png")}" style="width:40px;height:40px;border-radius:10px;border:1px solid var(--line);object-fit:cover;" onerror="this.src='logo.png'" alt="">
        <div><strong>${esc(s.name||"—")}</strong><br><a href="${esc(s.url||"#")}" target="_blank" style="font-size:12px;color:var(--primary);">${esc(s.url||"")}</a></div>
      </div></td>
      <td>${esc(s.brandName||"—")}</td>
      <td>${esc(s.category||"—")}</td>
      <td>${fmtDate(s.createdAt)}</td>
      <td style="white-space:nowrap;">
        <button class="btn btn-primary btn-sm" data-approve="${d.id}">✔ Approve</button>
        <button class="btn btn-danger btn-sm" style="margin-left:6px;" data-reject="${d.id}">✕ Reject</button>
      </td></tr>`;
  });
  el.innerHTML=`<div class="table-wrap"><table class="tbl"><thead><tr><th>Website</th><th>Brand</th><th>Category</th><th>Submitted</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  wirePendingActions(el);
}

function wirePendingActions(root) {
  root.querySelectorAll("[data-approve]").forEach(b => b.addEventListener("click", () => approveWebsite(b.dataset.approve)));
  root.querySelectorAll("[data-reject]").forEach(b  => b.addEventListener("click", () => rejectWebsite(b.dataset.reject)));
}

async function approveWebsite(id) {
  const snap = await getDoc(doc(db,"pendingWebsites",id));
  if (!snap.exists()) return;
  const data = snap.data();
  await addDoc(collection(db,"websites"), { ...data, status:"published", publishedAt:serverTimestamp() });
  await deleteDoc(doc(db,"pendingWebsites",id));
  toast(`✅ ${data.name} published`,"ok");
  adminPending(); adminDashboard();
}

async function rejectWebsite(id) {
  const reason = prompt("Reason for rejection (will be shown to the owner):");
  if (reason === null) return; // cancelled

  // Save rejection record so owner can see it in their dashboard
  const snap = await getDoc(doc(db, "pendingWebsites", id));
  if (snap.exists()) {
    const data = snap.data();
    await addDoc(collection(db, "rejectedWebsites"), {
      ...data,
      rejectionReason: reason.trim() || "No reason provided.",
      rejectedAt: serverTimestamp()
    });
  }

  await deleteDoc(doc(db, "pendingWebsites", id));
  toast("Submission rejected");
  adminPending();
  adminDashboard();
}

async function adminWebsites() {
  const tbody = $("sitesBody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;"><div class="spinner" style="margin:0 auto 8px;"></div>Loading…</td></tr>`;
  const snap = await getDocs(query(collection(db,"websites"), orderBy("createdAt","desc")));

  let allRows = [];
  snap.forEach(d => allRows.push({ id: d.id, ...d.data() }));

  function renderSitesTable(list) {
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-3);">No results.</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(s => `<tr>
      <td><div style="display:flex;align-items:center;gap:10px;">
        <img src="${esc(s.logoUrl||"logo.png")}" style="width:32px;height:32px;border-radius:8px;border:1px solid var(--line);" onerror="this.src='logo.png'" alt="">
        <strong>${esc(s.name||"—")}</strong>
      </div></td>
      <td>${esc(s.brandName||"—")}</td>
      <td>${esc(s.category||"—")}</td>
      <td>${s.status==="published"?`<span class="pill pill-approved">Published</span>`:`<span class="pill pill-pending">${esc(s.status||"")}</span>`}</td>
      <td>${fmtDate(s.createdAt)}</td>
      <td style="white-space:nowrap;">
        <a href="website.html?id=${s.id}" target="_blank" class="btn btn-sm">View</a>
        <button class="btn btn-danger btn-sm" style="margin-left:6px;" data-del="${s.id}" data-name="${esc(s.name||"")}">Delete</button>
      </td></tr>`).join("");

    tbody.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", async () => {
      if (!confirm(`Delete "${b.dataset.name}"? This cannot be undone.`)) return;
      await deleteDoc(doc(db,"websites",b.dataset.del));
      toast("Deleted");
      allRows = allRows.filter(r => r.id !== b.dataset.del);
      renderSitesTable(allRows);
    }));
  }

  renderSitesTable(allRows);

  // Wire search input
  const searchEl = $("siteSearch");
  if (searchEl) {
    searchEl.value = "";
    searchEl.oninput = () => {
      const q = searchEl.value.trim().toLowerCase();
      renderSitesTable(q
        ? allRows.filter(s =>
            (s.name||"").toLowerCase().includes(q) ||
            (s.brandName||"").toLowerCase().includes(q) ||
            (s.category||"").toLowerCase().includes(q) ||
            (s.url||"").toLowerCase().includes(q)
          )
        : allRows
      );
    };
  }
}

async function adminUsers() {
  const tbody = $("usersBody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;"><div class="spinner" style="margin:0 auto 8px;"></div>Loading…</td></tr>`;
  const snap = await getDocs(collection(db,"users"));
  let rows="";
  snap.forEach(d => {
    const u=d.data();
    rows+=`<tr>
      <td><div style="display:flex;align-items:center;gap:8px;">
        <img src="${esc(u.photoURL||"logo.png")}" style="width:28px;height:28px;border-radius:50%;border:1px solid var(--line);" onerror="this.src='logo.png'" alt="">
        <strong>${esc(u.name||"—")}</strong>
      </div></td>
      <td>${esc(u.email||"—")}</td>
      <td>${fmtDate(u.createdAt)}</td>
      <td>${u.role==="admin"?`<span class="badge badge-verified">Admin</span>`:`<span class="pill pill-approved">User</span>`}</td>
      <td>${u.role!=="admin"?`<button class="btn btn-sm ${u.banned?"":"btn-danger"}" data-ban="${d.id}" data-state="${u.banned?1:0}">${u.banned?"Unban":"Ban"}</button>`:""}</td>
    </tr>`;
  });
  tbody.innerHTML = rows||`<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-3);">No users.</td></tr>`;
  tbody.querySelectorAll("[data-ban]").forEach(b => b.addEventListener("click", async () => {
    const banned = b.dataset.state==="1";
    await updateDoc(doc(db,"users",b.dataset.ban), { banned:!banned });
    toast(banned?"User unbanned":"User banned"); adminUsers();
  }));
}

async function adminVerification() {
  const tbody = $("verifyBody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:32px;"><div class="spinner" style="margin:0 auto 8px;"></div>Loading…</td></tr>`;
  const snap = await getDocs(query(collection(db,"websites"),where("status","==","published")));
  let rows="";
  snap.forEach(d => {
    const s=d.data();
    rows+=`<tr>
      <td><div style="display:flex;align-items:center;gap:10px;">
        <img src="${esc(s.logoUrl||"logo.png")}" style="width:32px;height:32px;border-radius:8px;border:1px solid var(--line);" onerror="this.src='logo.png'" alt="">
        <strong>${esc(s.name||"—")}</strong>
      </div></td>
      <td>${badgeHtml(s)||`<span class="text-muted text-sm">None</span>`}</td>
      <td><select class="sel badge-sel" data-id="${d.id}" style="font-size:13px;">
        <option value="">No badge</option>
        <option value="Verified" ${s.badgeType==="Verified"?"selected":""}>Verified</option>
        <option value="Trusted"  ${s.badgeType==="Trusted"?"selected":""}>Trusted</option>
        <option value="Premium"  ${s.badgeType==="Premium"?"selected":""}>Premium Partner</option>
        <option value="Featured" ${s.badgeType==="Featured"?"selected":""}>Featured</option>
      </select></td>
      <td><button class="btn btn-primary btn-sm badge-save" data-id="${d.id}">Save</button></td>
    </tr>`;
  });
  tbody.innerHTML = rows||`<tr><td colspan="4" style="text-align:center;padding:32px;color:var(--text-3);">No published websites.</td></tr>`;
  tbody.querySelectorAll(".badge-save").forEach(btn => btn.addEventListener("click", async () => {
    const sel = tbody.querySelector(`.badge-sel[data-id="${btn.dataset.id}"]`);
    const type = sel?.value||"";
    await updateDoc(doc(db,"websites",btn.dataset.id), { verified:!!type, badgeType:type||null });
    toast(type?`${type} badge applied ✅`:"Badge removed","ok");
    adminVerification();
  }));
}

async function adminReviews() {
  const tbody = $("reviewsBody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;"><div class="spinner" style="margin:0 auto 8px;"></div>Loading…</td></tr>`;
  const snap = await getDocs(query(collection(db,"reviews"),orderBy("createdAt","desc")));
  let rows="";
  snap.forEach(d => {
    const r=d.data();
    rows+=`<tr>
      <td style="max-width:220px;font-size:13px;">${esc((r.text||"").slice(0,80))}${(r.text||"").length>80?"…":""}</td>
      <td><a href="website.html?id=${r.websiteId}" target="_blank" style="color:var(--primary);font-size:13px;">${esc(r.websiteId||"—")}</a></td>
      <td>${esc(r.userName||"Anonymous")}</td>
      <td style="color:var(--warning);">${"★".repeat(r.rating||0)}</td>
      <td><button class="btn btn-danger btn-sm" data-del="${d.id}">Delete</button></td>
    </tr>`;
  });
  tbody.innerHTML = rows||`<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-3);">No reviews yet.</td></tr>`;
  tbody.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", async () => {
    if (!confirm("Delete this review?")) return;
    await deleteDoc(doc(db,"reviews",b.dataset.del));
    toast("Deleted"); adminReviews();
  }));
}

async function adminReports() {
  const el = $("reportsList");
  if (!el) return;
  el.innerHTML = `<div class="spin-row"><div class="spinner"></div> Loading…</div>`;
  const snap = await getDocs(query(collection(db,"reports"),orderBy("createdAt","desc")));
  if (snap.empty) { el.innerHTML=`<div class="empty"><h3>No reports 🎉</h3></div>`; return; }
  let rows="";
  snap.forEach(d => {
    const r=d.data();
    rows+=`<tr>
      <td><a href="website.html?id=${r.siteId}" target="_blank" style="color:var(--primary);">${esc(r.siteId||"—")}</a></td>
      <td style="font-size:13px;max-width:260px;">${esc(r.reason||"")}</td>
      <td>${r.status==="resolved"?`<span class="pill pill-approved">Resolved</span>`:`<span class="pill pill-rejected">Open</span>`}</td>
      <td style="white-space:nowrap;">
        ${r.status!=="resolved"?`<button class="btn btn-primary btn-sm" data-resolve="${d.id}">Resolve</button>`:""}
        <button class="btn btn-sm" style="margin-left:6px;" data-dismiss="${d.id}">Dismiss</button>
      </td></tr>`;
  });
  el.innerHTML=`<div class="table-wrap"><table class="tbl"><thead><tr><th>Website</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  el.querySelectorAll("[data-resolve]").forEach(b => b.addEventListener("click", async () => {
    await updateDoc(doc(db,"reports",b.dataset.resolve), { status:"resolved" });
    adminReports();
  }));
  el.querySelectorAll("[data-dismiss]").forEach(b => b.addEventListener("click", async () => {
    if (!confirm("Dismiss this report?")) return;
    await deleteDoc(doc(db,"reports",b.dataset.dismiss));
    toast("Dismissed"); adminReports();
  }));
}

async function adminAnalytics() {
  const tbody = $("analyticsBody");
  if (!tbody) return;

  // Load all data in parallel
  const [sitesSnap, revsSnap, usersSnap] = await Promise.all([
    getDocs(query(collection(db,"websites"), where("status","==","published"), orderBy("views","desc"))),
    getDocs(collection(db,"reviews")),
    getDocs(collection(db,"users")),
  ]);

  let totalV = 0, totalC = 0, rows = "";
  sitesSnap.forEach(d => {
    const s = d.data();
    totalV += s.views  || 0;
    totalC += s.clicks || 0;
    rows += `<tr>
      <td><div style="display:flex;align-items:center;gap:8px;">
        <img src="${esc(s.logoUrl||"logo.png")}" style="width:28px;height:28px;border-radius:7px;border:1px solid var(--line);" onerror="this.src='logo.png'" alt="">
        ${esc(s.name||"—")}
      </div></td>
      <td>${s.views||0}</td>
      <td>${s.ratingCount||0}</td>
      <td style="color:var(--warning);">${(s.avgRating||0).toFixed(1)} ★</td>
    </tr>`;
  });

  setText("anViews",   totalV);
  setText("anClicks",  totalC);
  setText("anReviews", revsSnap.size);
  setText("anUsers",   usersSnap.size);
  tbody.innerHTML = rows || `<tr><td colspan="4" style="text-align:center;padding:32px;color:var(--text-3);">No data yet.</td></tr>`;
}

// ═══════════════════════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════════════════════

function setText(id, val) { const el=$(id); if(el) el.textContent=val; }

// ═══════════════════════════════════════════════════════════════
// ROUTER — run the right init for the current page
// ═══════════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {
  const page = location.pathname.split("/").pop() || "index.html";
  if (page === "index.html"   || page === "") initIndex();
  if (page === "website.html")                initWebsite();
  if (page === "login.html")                  initLogin();
  if (page === "upload.html")                 initUpload();
  if (page === "profile.html")                initProfile();
  if (page === "dashboard.html")              initDashboard();
  if (page === "admin.html")                  initAdmin();
});
