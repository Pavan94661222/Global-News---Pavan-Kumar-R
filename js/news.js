/* ============================================================
   GLOBALNEWS | Dynamic editorial feed powered by newsdata.io
   ============================================================ */

/* newsdata.io keys are used one after another: when a key hits its plan
   limit the next key in the ring takes over. */
const NEWS_CONFIG = {
    apiKeys: [
        "pub_f13da17841944b4592c0b100bc66cec5",
        "pub_1513e168f834441fbea8dde44aaf7c31",
        "pub_32945805952245579c58be211fa1346c",
        "pub_b6210bc62dd1466f9594a4f2033aa298",
        "pub_480480a39d74f015cde7dfc3556ba58d40de3",
    ],
    endpoint: "https://newsdata.io/api/1/latest",
    defaultLanguage: "en,kn,hi,te,ta",
    pageSize: 10,
    gridTarget: 9,
    cacheTtl: 10 * 60 * 1000,
    heroCount: 3,
};

/* Dedicated newsdata.io datasets exposed as their own sections. */
const DATASETS = {
    crypto: { label: "Crypto", endpoint: "https://newsdata.io/api/1/crypto" },
    market: { label: "Markets", endpoint: "https://newsdata.io/api/1/market" },
};

const CATEGORY_META = {
    top: { label: "Top", color: "#e11d2e" },
    world: { label: "World", color: "#2563eb" },
    business: { label: "Business", color: "#0d9488" },
    technology: { label: "Technology", color: "#0284c7" },
    sports: { label: "Sports", color: "#ea580c" },
    entertainment: { label: "Entertainment", color: "#9333ea" },
    health: { label: "Health", color: "#16a34a" },
    politics: { label: "Politics", color: "#475569" },
    science: { label: "Science", color: "#0891b2" },
    crime: { label: "Crime", color: "#b91c1c" },
    food: { label: "Food", color: "#d97706" },
    lifestyle: { label: "Lifestyle", color: "#db2777" },
    environment: { label: "Environment", color: "#15803d" },
    education: { label: "Education", color: "#4f46e5" },
    travel: { label: "Travel", color: "#0f766e" },
    automotive: { label: "Automotive", color: "#334155" },
    fashion: { label: "Fashion", color: "#c026d3" },
    crypto: { label: "Crypto", color: "#f59e0b" },
    market: { label: "Markets", color: "#0ea5e9" },
    other: { label: "News", color: "#64748b" },
};

const SENTIMENT_META = {
    positive: { label: "Positive", color: "#16a34a" },
    neutral: { label: "Neutral", color: "#64748b" },
    negative: { label: "Negative", color: "#dc2626" },
};

const NAV_CATEGORIES = [
    { label: "Top", value: "top" },
    { label: "World", value: "world" },
    { label: "Business", value: "business" },
    { label: "Technology", value: "technology" },
    { label: "Sports", value: "sports" },
    { label: "Entertainment", value: "entertainment" },
    { label: "Health", value: "health" },
    { label: "Politics", value: "politics" },
    { label: "Science", value: "science" },
    { label: "Crypto", value: "crypto" },
    { label: "Markets", value: "market" },
];

const SITE_ROOT = window.location.pathname.includes("/html/") ? "../" : "./";

/* Local backend (server.js) that returns the complete text of a story.
   When the site is opened without that server the request fails and the
   story page simply falls back to the API summary. */
const API_BASE = `${SITE_ROOT}api`;
const AI_API_URL = `${API_BASE}/ai`;

/* Backup feed: RapidAPI "Real-Time News Data" proxied by server.js, which keeps
   those keys off the client and rotates them. Used when newsdata.io runs out. */
const BACKUP_NEWS = {
    url: `${API_BASE}/news`,
    pageSize: 14,
};

const LANGUAGES = [
    { label: "All languages", value: NEWS_CONFIG.defaultLanguage },
    { label: "English", value: "en" },
    { label: "ಕನ್ನಡ", value: "kn" },
    { label: "हिन्दी", value: "hi" },
    { label: "తెలుగు", value: "te" },
    { label: "தமிழ்", value: "ta" },
];

/* ---------------- helpers ---------------- */

function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    }[char]));
}

function categoryMeta(category) {
    const key = String(category || "").toLowerCase();
    if (CATEGORY_META[key]) return CATEGORY_META[key];
    return {
        label: key ? key.charAt(0).toUpperCase() + key.slice(1) : "News",
        color: CATEGORY_META.other.color,
    };
}

function trimText(text = "", max = 160) {
    const clean = String(text).replace(/\s+/g, " ").trim();
    return clean.length > max ? `${clean.slice(0, max).trim()}…` : clean;
}

function timeAgo(value) {
    if (!value) return "";
    const date = new Date(`${value.replace(" ", "T")}Z`);
    if (Number.isNaN(date.getTime())) return "";
    const minutes = Math.round((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function formatDate(value) {
    if (!value) return "";
    const date = new Date(`${value.replace(" ", "T")}Z`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function readTime(article) {
    const words = `${article.title || ""} ${article.description || ""}`.trim().split(/\s+/).filter(Boolean).length;
    return `${Math.max(1, Math.round(words / 120))} min read`;
}

function setStatus(element, message, isError = false) {
    if (!element) return;
    element.textContent = message || "";
    element.classList.toggle("is-error", Boolean(isError));
    element.hidden = !message;
}

function attachImageFallbacks(root) {
    root.querySelectorAll("img[data-fb]").forEach((img) => {
        img.addEventListener(
            "error",
            () => {
                const fallback = img.parentElement && img.parentElement.querySelector(".fallback-initial");
                if (fallback) fallback.hidden = false;
                img.remove();
            },
            { once: true }
        );
    });
}

/* ---------------- partials ---------------- */

function chipHtml(category) {
    const meta = categoryMeta(category);
    return `<span class="chip" style="--chip:${meta.color}">${escapeHtml(meta.label)}</span>`;
}

function sentimentHtml(value) {
    const meta = SENTIMENT_META[value];
    if (!meta) return "";
    return `<span class="sentiment" style="--sentiment:${meta.color}">${meta.label}</span>`;
}

function sourceBadgeHtml(article) {
    const initial = escapeHtml((article.source_name || "N").trim().charAt(0).toUpperCase());
    const icon = article.source_icon;
    return `
        <span class="source-badge">
            ${icon ? `<img data-fb src="${escapeHtml(icon)}" alt="" loading="lazy">` : ""}
            <b class="fallback-initial" ${icon ? "hidden" : ""}>${initial}</b>
        </span>`;
}

function sourceHtml(article, withTime = true) {
    return `
        <span class="source">${sourceBadgeHtml(article)}<span class="source-name">${escapeHtml(
        article.source_name || "Unknown source"
    )}</span></span>
        ${withTime ? `<span class="sep">•</span><span>${escapeHtml(timeAgo(article.pubDate))}</span>` : ""}`;
}

/* ---------------- request layer ---------------- */

const KEY_INDEX_STORAGE = "gn_key_index";

let keyIndex = (() => {
    try {
        const stored = Number(localStorage.getItem(KEY_INDEX_STORAGE));
        return Number.isInteger(stored) && stored > 0 && stored < NEWS_CONFIG.apiKeys.length ? stored : 0;
    } catch (error) {
        return 0;
    }
})();

function activeKey() {
    return NEWS_CONFIG.apiKeys[keyIndex];
}

/* Move to the next key and remember the position, so a reload does not
   waste a request on a key that already ran out. */
function rotateKey() {
    keyIndex = (keyIndex + 1) % NEWS_CONFIG.apiKeys.length;
    try {
        localStorage.setItem(KEY_INDEX_STORAGE, String(keyIndex));
    } catch (error) {
        /* storage unavailable - ignore */
    }
    return activeKey();
}

function withKey(url, key) {
    const parsed = new URL(url, window.location.href);
    parsed.searchParams.set("apikey", key);
    return parsed.toString();
}

/* Requests are cached without the key, so switching keys keeps the cache warm. */
function cacheKey(url) {
    const parsed = new URL(url, window.location.href);
    parsed.searchParams.delete("apikey");
    return parsed.toString();
}

function buildFeedUrl({ category, language, query, page, key }) {
    const dataset = DATASETS[category];
    const endpoint = dataset ? dataset.endpoint : NEWS_CONFIG.endpoint;

    const params = new URLSearchParams();
    params.set("apikey", key || activeKey());
    params.set("language", language || NEWS_CONFIG.defaultLanguage);
    params.set("size", String(NEWS_CONFIG.pageSize));
    params.set("removeduplicate", "1");
    if (!dataset && category) params.set("category", category);
    if (query) params.set("q", query.slice(0, 100));
    if (page) params.set("page", page);
    return `${endpoint}?${params.toString()}`;
}

function readCache(url) {
    try {
        const raw = sessionStorage.getItem(`gn_cache_${url}`);
        if (!raw) return null;
        const cached = JSON.parse(raw);
        if (Date.now() - cached.time > NEWS_CONFIG.cacheTtl) {
            sessionStorage.removeItem(`gn_cache_${url}`);
            return null;
        }
        return cached.data;
    } catch (error) {
        return null;
    }
}

function writeCache(url, data) {
    try {
        sessionStorage.setItem(`gn_cache_${url}`, JSON.stringify({ time: Date.now(), data }));
    } catch (error) {
        /* storage unavailable - ignore */
    }
}

async function requestNews(url) {
    const response = await fetch(url);
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.status !== "success") {
        const message = (data.results && data.results.message) || `Request failed (${response.status})`;
        throw new Error(message);
    }

    return data;
}

/* Try the current key first; if it is exhausted (or otherwise rejected)
   fall through to the next key until one of them answers. */
async function fetchNews(url) {
    const key = cacheKey(url);
    const cached = readCache(key);
    if (cached) return cached;

    let lastError = null;

    for (let attempt = 0; attempt < NEWS_CONFIG.apiKeys.length; attempt += 1) {
        try {
            const data = await requestNews(withKey(url, activeKey()));
            writeCache(key, data);
            return data;
        } catch (error) {
            lastError = error;
            rotateKey();
        }
    }

    throw lastError || new Error("Unable to reach the news service");
}

/* ---------------- backup request layer ---------------- */

/* Which source is answering: newsdata.io first, RapidAPI backup once the
   primary keys are used up. */
let feedProvider = "primary";

/* The backup provider is English-first, so the site's multi-language default
   is narrowed down to a single code for it. */
function backupLanguage(language) {
    const value = String(language || "").toLowerCase().replace(/[^a-z,]/g, "");
    return value ? value.split(",")[0].slice(0, 2) : "en";
}

async function fetchBackupNews({ category, language, query }) {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (query) params.set("q", query.slice(0, 100));
    params.set("language", backupLanguage(language));
    params.set("limit", String(BACKUP_NEWS.pageSize));

    const response = await fetch(`${BACKUP_NEWS.url}?${params.toString()}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.status !== "success" || !Array.isArray(data.results)) {
        throw new Error((data && data.error) || "The backup news service is unavailable.");
    }
    return data;
}

/* ---------------- article handoff (feed -> story page) ---------------- */

function rememberArticle(article) {
    try {
        sessionStorage.setItem(`gn_article_${article.article_id}`, JSON.stringify(article));
    } catch (error) {
        /* ignore quota errors */
    }
}

function readStoredArticle(id) {
    try {
        const raw = id && sessionStorage.getItem(`gn_article_${id}`);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        return null;
    }
}

/* Crypto / market articles cannot be re-fetched by id, so every rendered
   link hands its article over to the story page through sessionStorage. */
const articleIndex = new Map();
let currentFeedArticles = [];

function indexArticles(articles) {
    articles.forEach((article) => {
        if (article && article.article_id) articleIndex.set(article.article_id, article);
    });
}

function initArticleHandoff() {
    document.addEventListener("click", (event) => {
        const link = event.target.closest("[data-article-id]");
        if (!link) return;
        const article = articleIndex.get(link.dataset.articleId);
        if (article) rememberArticle(article);
    });
}

/* ---------------- card partials ---------------- */

function mediaHtml(article, lazy = true) {
    if (article.image_url) {
        return `<img data-fb src="${escapeHtml(article.image_url)}" alt=""${
            lazy ? ' loading="lazy"' : ""
        }>`;
    }
    return '<span class="media-fallback"><i class="fas fa-newspaper"></i></span>';
}

function cardHtml(article, index = 0) {
    const category = (article.category && article.category[0]) || "other";
    const description = trimText(article.description || "", 130);

    return `
    <a class="card" style="--i:${index}" data-article-id="${escapeHtml(article.article_id)}" href="./html/article.html?id=${encodeURIComponent(article.article_id)}">
        <div class="card-media">
            ${mediaHtml(article)}
            ${chipHtml(category)}
            ${sentimentHtml(article.sentiment)}
        </div>
        <div class="card-body">
            <h3 class="card-title">${escapeHtml(article.title || "Untitled")}</h3>
            ${description ? `<p class="card-desc">${escapeHtml(description)}</p>` : ""}
            <div class="card-foot">${sourceHtml(article)}</div>
        </div>
    </a>`;
}

function miniHtml(article, index = 0) {
    const category = (article.category && article.category[0]) || "other";
    return `
    <a class="hero-mini" style="--i:${index}" data-article-id="${escapeHtml(article.article_id)}" href="./html/article.html?id=${encodeURIComponent(article.article_id)}">
        <span class="mini-media">${mediaHtml(article)}</span>
        <span class="mini-body">
            ${chipHtml(category)}
            <span class="mini-title">${escapeHtml(article.title || "Untitled")}</span>
            <span class="mini-meta">${sourceHtml(article)}</span>
        </span>
    </a>`;
}

function heroHtml(articles) {
    const [main, ...rest] = articles;
    if (!main) return "";
    const category = (main.category && main.category[0]) || "other";
    const href = `./html/article.html?id=${encodeURIComponent(main.article_id)}`;
    const background = main.image_url
        ? ` style="background-image:url('${escapeHtml(main.image_url)}')"`
        : "";

    return `
    <article class="hero-main${main.image_url ? "" : " no-image"}"${background}>
        <div class="hero-overlay"></div>
        <div class="hero-body">
            ${chipHtml(category)}
            <h1 class="hero-title"><a data-article-id="${escapeHtml(
        main.article_id
    )}" href="${href}">${escapeHtml(main.title || "")}</a></h1>
            <p class="hero-desc">${escapeHtml(trimText(main.description || "", 210))}</p>
            <div class="hero-meta">${sourceHtml(main)}<span class="sep">•</span><span>${readTime(
        main
    )}</span>${sentimentHtml(main.sentiment)}</div>
            <a class="btn-primary" data-article-id="${escapeHtml(
                main.article_id
            )}" href="${href}">Read Full Story <i class="fas fa-arrow-right"></i></a>
        </div>
    </article>
    <div class="hero-side">${rest.slice(0, 2).map((article, index) => miniHtml(article, index)).join("")}</div>`;
}

function skeletonHtml() {
    return Array.from({ length: NEWS_CONFIG.gridTarget })
        .map(
            () => `
    <div class="card skeleton-card">
        <div class="card-media skeleton"></div>
        <div class="card-body">
            <div class="skeleton skeleton-line wide"></div>
            <div class="skeleton skeleton-line"></div>
            <div class="skeleton skeleton-line short"></div>
        </div>
    </div>`
        )
        .join("");
}

/* ---------------- sidebar widgets ---------------- */

function trendingHtml(articles) {
    return articles
        .slice(0, 5)
        .map(
            (article, index) => `
        <li>
            <span class="rank">${String(index + 1).padStart(2, "0")}</span>
            <span class="trend-body">
                <a class="trend-title" data-article-id="${escapeHtml(
                    article.article_id
                )}" href="./html/article.html?id=${encodeURIComponent(
                    article.article_id
                )}">${escapeHtml(trimText(article.title || "", 90))}</a>
                <span class="trend-meta">${sourceHtml(article)}</span>
            </span>
        </li>`
        )
        .join("");
}

function topicsHtml(articles) {
    const counts = new Map();
    articles.forEach((article) => {
        (article.ai_tag || []).forEach((tag) => {
            const key = String(tag).toLowerCase();
            counts.set(key, (counts.get(key) || 0) + 1);
        });
    });

    const tags = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag]) => tag);

    if (!tags.length) return '<p class="widget-empty">Topics will appear as stories load.</p>';
    return tags
        .map(
            (tag) =>
                `<a class="topic-chip" href="./index.html?q=${encodeURIComponent(tag)}">${escapeHtml(tag)}</a>`
        )
        .join("");
}

function exploreHtml() {
    return NAV_CATEGORIES.filter((category) => category.value !== "top")
        .map(
            (category) =>
                `<a class="topic-chip" href="${SITE_ROOT}index.html?category=${encodeURIComponent(
                    category.value
                )}">${escapeHtml(category.label)}</a>`
        )
        .join("");
}

function renderExploreChips() {
    document.querySelectorAll("[data-explore]").forEach((element) => {
        element.innerHTML = exploreHtml();
    });
}

function renderTopbarDate() {
    const element = document.getElementById("topbar-date");
    if (!element) return;
    element.textContent = new Date().toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

/* ---------------- home feed ---------------- */

function initFeed() {
    const grid = document.getElementById("articles");
    if (!grid) return;

    const hero = document.getElementById("hero-grid");
    const heading = document.getElementById("feed-heading");
    const counter = document.getElementById("feed-count");
    const status = document.getElementById("feed-status");
    const loadMoreBtn = document.getElementById("load-more");
    const tabsWrap = document.getElementById("category-tabs");
    const langSelect = document.getElementById("language-select");
    const searchForm = document.getElementById("search-form");
    const searchInput = document.getElementById("search-input");
    const trendingList = document.getElementById("trending-list");
    const topicChips = document.getElementById("topic-chips");

    const state = {
        category: "top",
        language: NEWS_CONFIG.defaultLanguage,
        query: "",
        nextPage: null,
        pending: [],
        loading: false,
        seen: new Set(),
    };

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("category")) state.category = urlParams.get("category");
    if (urlParams.get("language")) state.language = urlParams.get("language");
    if (urlParams.get("q")) {
        state.query = urlParams.get("q");
        searchInput.value = state.query;
    }

    NAV_CATEGORIES.forEach((category) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "category-tab";
        button.textContent = category.label;
        button.dataset.value = category.value;
        button.addEventListener("click", () => {
            if (state.category === category.value) return;
            state.category = category.value;
            loadFeed(true);
        });
        tabsWrap.appendChild(button);
    });

    LANGUAGES.forEach((language) => {
        const option = document.createElement("option");
        option.value = language.value;
        option.textContent = language.label;
        langSelect.appendChild(option);
    });
    langSelect.value = state.language;
    langSelect.addEventListener("change", () => {
        state.language = langSelect.value;
        loadFeed(true);
    });

    searchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        state.query = searchInput.value.trim();
        loadFeed(true);
    });

    loadMoreBtn.addEventListener("click", () => loadFeed(false));
    window.addEventListener("globalnews:navigate", (event) => {
        const target = event.detail || {};
        if (target.category && NAV_CATEGORIES.some((item) => item.value === target.category)) {
            state.category = target.category;
            state.query = "";
            searchInput.value = "";
            loadFeed(true);
            document.querySelector(".catbar").scrollIntoView({ behavior: "smooth", block: "start" });
            return;
        }
        if (target.query) {
            state.query = String(target.query).slice(0, 100);
            searchInput.value = state.query;
            loadFeed(true);
            document.querySelector(".hero").scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });

    function syncTabs() {
        tabsWrap.querySelectorAll(".category-tab").forEach((button) => {
            button.classList.toggle("active", button.dataset.value === state.category);
        });
    }

    function syncHeading() {
        if (state.query) {
            heading.textContent = `Results for “${state.query}”`;
        } else {
            const active = NAV_CATEGORIES.find((category) => category.value === state.category);
            heading.textContent = `${active ? active.label : "Top"} Stories`;
        }
        const shown = grid.children.length;
        counter.textContent = shown ? `${shown} stories` : "";
    }

    /* One page of headlines, filtered against everything already on screen. */
    async function collect(page) {
        const request = {
            category: state.category,
            language: state.language,
            query: state.query,
            page,
        };

        let data;
        if (feedProvider === "backup") {
            data = await fetchBackupNews(request);
        } else {
            try {
                data = await fetchNews(buildFeedUrl(request));
            } catch (error) {
                console.warn("Primary news source unavailable, using the backup feed:", error.message);
                data = await fetchBackupNews(request);
                feedProvider = "backup";
            }
        }
        state.nextPage = data.nextPage || null;

        const articles = (data.results || []).filter(
            (article) => article.title && !article.duplicate && !state.seen.has(article.article_id)
        );
        articles.forEach((article) => state.seen.add(article.article_id));
        currentFeedArticles.push(...articles);

        /* Crypto / market results carry no `category`, so label them with
           the dataset they came from. */
        if (DATASETS[state.category]) {
            articles.forEach((article) => {
                if (!article.category || !article.category.length) {
                    article.category = [state.category];
                }
            });
        }
        indexArticles(articles);
        return articles;
    }

    function appendCards(articles) {
        if (!articles.length) return;
        grid.insertAdjacentHTML("beforeend", articles.map(cardHtml).join(""));
        attachImageFallbacks(grid);
    }

    async function loadFeed(reset) {
        if (state.loading) return;
        state.loading = true;

        if (reset) {
            state.nextPage = null;
            state.pending = [];
            state.seen.clear();
            currentFeedArticles = [];
            grid.innerHTML = skeletonHtml();
            if (hero) hero.innerHTML = "";
        }

        setStatus(status, "Loading the latest headlines…");
        loadMoreBtn.hidden = true;

        try {
            let articles;

            if (!reset && state.pending.length) {
                /* Reuse the stories the initial top-up already paid for. */
                articles = state.pending.splice(0, state.pending.length);
            } else {
                articles = await collect(state.nextPage);
            }

            if (reset) {
                grid.innerHTML = "";

                if (hero) {
                    hero.innerHTML = heroHtml(articles.slice(0, NEWS_CONFIG.heroCount));
                    attachImageFallbacks(hero);
                }
                if (trendingList) {
                    trendingList.innerHTML = trendingHtml(articles);
                    attachImageFallbacks(trendingList);
                }
                if (topicChips) topicChips.innerHTML = topicsHtml(articles);

                appendCards(articles.slice(NEWS_CONFIG.heroCount));

                /* A single request only returns ten stories, so pull one more
                   page to fill the grid with a complete 3 x 3 block. */
                while (grid.children.length < NEWS_CONFIG.gridTarget && state.nextPage) {
                    const extra = await collect(state.nextPage);
                    if (!extra.length) break;
                    const needed = NEWS_CONFIG.gridTarget - grid.children.length;
                    appendCards(extra.slice(0, needed));
                    state.pending.push(...extra.slice(needed));
                }
            } else {
                appendCards(articles);
            }

            setStatus(
                status,
                state.seen.size ? "" : "No stories found. Try another category, language or keyword."
            );
            loadMoreBtn.hidden = !state.nextPage;
            syncTabs();
            syncHeading();
        } catch (error) {
            console.error(error);
            grid.innerHTML = "";
            setStatus(status, "Unable to load news right now. Please check your connection and try again.", true);
        } finally {
            state.loading = false;
        }
    }

    loadFeed(true);
}

/* ---------------- Gemini newsroom assistant ---------------- */

function initAIAssistant() {
    const launcher = document.getElementById("ai-launcher");
    const panel = document.getElementById("ai-assistant");
    const close = document.getElementById("ai-close");
    const form = document.getElementById("ai-form");
    const input = document.getElementById("ai-input");
    const send = document.getElementById("ai-send");
    const messages = document.getElementById("ai-messages");
    if (!launcher || !panel || !form || !input || !send || !messages) return;

    function addMessage(text, type = "assistant") {
        const message = document.createElement("div");
        message.className = `ai-message${type === "user" ? " is-user" : ""}${
            type === "error" ? " is-error" : ""
        }${type === "loading" ? " is-loading" : ""}`;
        message.textContent = text;
        messages.appendChild(message);
        messages.scrollTop = messages.scrollHeight;
        return message;
    }

    function showPanel(open) {
        panel.hidden = !open;
        launcher.setAttribute("aria-expanded", String(open));
        if (open) input.focus();
        else launcher.focus();
    }

    function addNavigation(result) {
        const navigation = result && result.navigation;
        if (!navigation) return;
        const category = NAV_CATEGORIES.find((item) => item.value === navigation.category);
        const query = typeof navigation.query === "string" ? navigation.query.trim().slice(0, 100) : "";
        if (!category && !query) return;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "ai-navigation";
        button.innerHTML = '<i class="fas fa-arrow-right" aria-hidden="true"></i>';
        const label = category ? category.label : `Search “${query}”`;
        button.append(document.createTextNode(`Go to ${label}`));
        button.addEventListener("click", () => {
            window.dispatchEvent(
                new CustomEvent("globalnews:navigate", {
                    detail: category ? { category: category.value } : { query },
                })
            );
            showPanel(false);
        });
        messages.appendChild(button);
        messages.scrollTop = messages.scrollHeight;
    }

    async function ask(question, mode = "assistant") {
        const cleanQuestion = String(question || "").trim();
        if (!cleanQuestion) return;

        addMessage(cleanQuestion, "user");
        const loading = addMessage("Checking the current headlines…", "loading");
        send.disabled = true;
        document.querySelectorAll(".ai-quick-action").forEach((button) => {
            button.disabled = true;
        });

        try {
            const response = await fetch(AI_API_URL, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    mode,
                    question: cleanQuestion,
                    articles: currentFeedArticles.slice(0, 12).map((article) => ({
                        title: article.title || "",
                        description: article.description || "",
                        source: article.source_name || article.source_id || "",
                        category: Array.isArray(article.category) ? article.category[0] : "",
                    })),
                }),
            });
            const data = await response.json().catch(() => ({}));
            loading.remove();
            if (!response.ok) {
                throw new Error(data.error || "The AI assistant is temporarily unavailable.");
            }
            addMessage(data.answer || "I couldn't produce an answer. Try asking another way.");
            addNavigation(data);
        } catch (error) {
            loading.remove();
            addMessage(error.message || "Couldn't reach the AI assistant. Please try again.", "error");
        } finally {
            send.disabled = false;
            document.querySelectorAll(".ai-quick-action").forEach((button) => {
                button.disabled = false;
            });
            input.focus();
        }
    }

    launcher.addEventListener("click", () => showPanel(panel.hidden));
    if (close) close.addEventListener("click", () => showPanel(false));
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const question = input.value;
        input.value = "";
        ask(question);
    });
    document.querySelectorAll("[data-ai-action='analyze']").forEach((button) => {
        button.addEventListener("click", () => {
            ask("Analyze the main themes, notable developments, and contrasting viewpoints across today's headlines. Keep it concise and do not invent facts.", "analyze");
        });
    });
    document.querySelectorAll("[data-ai-prompt]").forEach((button) => {
        button.addEventListener("click", () => ask(button.dataset.aiPrompt));
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !panel.hidden) showPanel(false);
    });
}

/* ---------------- story detail page ---------------- */

async function fetchFullArticle(article) {
    if (!article || !article.link) return null;
    const response = await fetch(`${API_BASE}/article?url=${encodeURIComponent(article.link)}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data || !data.ok || !Array.isArray(data.blocks) || !data.blocks.length) return null;
    return data;
}

function buildArticleBody(article, full) {
    if (full && Array.isArray(full.blocks) && full.blocks.length) {
        return full.blocks
            .map((block) =>
                block.type === "h"
                    ? `<h3>${escapeHtml(block.text)}</h3>`
                    : `<p>${escapeHtml(block.text)}</p>`
            )
            .join("");
    }

    const content = article.content && !article.content.includes("ONLY AVAILABLE") ? article.content : "";
    const raw = content || article.description || "";
    if (!raw) return "<p>Full text is available at the original source.</p>";
    return raw
        .split(/\n+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
        .join("");
}

function storyHtml(article) {
    const category = (article.category && article.category[0]) || "other";
    const tags = [...(article.ai_tag || []), ...(article.keywords || [])]
        .map((tag) => String(tag))
        .filter((tag, index, list) => list.indexOf(tag) === index)
        .slice(0, 8);

    return `
    <nav class="breadcrumb">
        <a href="../index.html">Home</a><i class="fas fa-chevron-right"></i>
        <a href="../index.html?category=${encodeURIComponent(category)}">${escapeHtml(
        categoryMeta(category).label
    )}</a><i class="fas fa-chevron-right"></i><span>Story</span>
    </nav>
    <article class="story">
        ${article.image_url ? `<div class="story-hero">${mediaHtml(article, false)}</div>` : ""}
        <div class="story-body">
            <div class="story-labels">${chipHtml(category)}${sentimentHtml(article.sentiment)}</div>
            <h1>${escapeHtml(article.title || "Untitled")}</h1>
            <div class="story-meta">
                ${sourceHtml(article, false)}
                <span class="sep">•</span><span><i class="far fa-calendar"></i> ${escapeHtml(
        formatDate(article.pubDate)
    )}</span>
                <span class="sep">•</span><span id="story-readtime"><i class="far fa-clock"></i> ${readTime(article)}</span>
            </div>
            <p class="story-note" id="story-note" hidden></p>
            <div class="story-content" id="story-content">${buildArticleBody(article)}</div>
            ${
                tags.length
                    ? `<div class="story-tags">${tags
                          .map(
                              (tag) =>
                                  `<a class="topic-chip" href="../index.html?q=${encodeURIComponent(
                                      tag
                                  )}">${escapeHtml(tag)}</a>`
                          )
                          .join("")}</div>`
                    : ""
            }
            <a class="btn-primary" href="${escapeHtml(
                article.link || "#"
            )}" target="_blank" rel="noopener">Read full story at source <i class="fas fa-external-link-alt"></i></a>
        </div>
    </article>`;
}

async function upgradeStoryContent(article) {
    const holder = document.getElementById("story-content");
    if (!holder || !article.link) return;

    const note = document.getElementById("story-note");
    const showNote = (message, isError = false) => {
        if (!note) return;
        note.textContent = message || "";
        note.hidden = !message;
        note.classList.toggle("is-error", Boolean(isError));
    };

    showNote(`Reading the complete article from ${article.source_name || "the original source"}…`);

    try {
        const full = await fetchFullArticle(article);
        if (!full) {
            showNote(
                "The complete text isn’t available from this source. Showing the summary — read the full story at the original site.",
                true
            );
            return;
        }

        holder.innerHTML = buildArticleBody(article, full);

        const readTimeElement = document.getElementById("story-readtime");
        if (readTimeElement && full.words) {
            readTimeElement.innerHTML = `<i class="far fa-clock"></i> ${Math.max(
                1,
                Math.round(full.words / 220)
            )} min read`;
        }
        showNote("");
    } catch (error) {
        showNote(
            "The complete text isn’t available from this source. Showing the summary — read the full story at the original site.",
            true
        );
    }
}

async function initStoryPage() {
    const root = document.getElementById("story-root");
    if (!root) return;

    const status = document.getElementById("feed-status");
    const id = new URLSearchParams(window.location.search).get("id");
    setStatus(status, "Loading story…");

    try {
        let article = id ? readStoredArticle(id) : null;

        if (!article) {
            if (!id) throw new Error("Missing article id");
            const url = `${NEWS_CONFIG.endpoint}?apikey=${encodeURIComponent(
                activeKey()
            )}&id=${encodeURIComponent(id)}`;
            const data = await fetchNews(url);
            article = (data.results || [])[0];
            if (!article) throw new Error("Article not found");
        }

        root.innerHTML = storyHtml(article);
        attachImageFallbacks(root);
        document.title = `${article.title} | GLOBALNEWS`;
        setStatus(status, "");
        upgradeStoryContent(article);
    } catch (error) {
        console.error(error);
        root.innerHTML = `
            <nav class="breadcrumb"><a href="../index.html">Home</a><i class="fas fa-chevron-right"></i><span>Story</span></nav>
            <article class="story"><div class="story-body">
                <h1>Story unavailable</h1>
                <p class="widget-empty">This story could not be loaded. It may have expired from the latest feed.</p>
                <a class="btn-primary" href="../index.html">Back to headlines</a>
            </div></article>`;
        setStatus(status, "");
    }
}

/* Lift the sticky header once the page starts scrolling. */
function initScrollState() {
    const navbar = document.querySelector(".navbar");
    if (!navbar) return;

    const sync = () => navbar.classList.toggle("is-stuck", window.scrollY > 12);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
}

document.addEventListener("DOMContentLoaded", () => {
    renderTopbarDate();
    renderExploreChips();
    initArticleHandoff();
    initScrollState();
    initFeed();
    initAIAssistant();
    initStoryPage();
});
