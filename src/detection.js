const axios = require('axios');
const cheerio = require('cheerio');
const robotsParser = require('robots-parser');
const { parse: parseUrl } = require('url');
const { getDomain } = require('tldts');

const COMMENT_FOOTPRINT_SELS = [
  '#comments', '.comments-area', 'form#commentform', 'textarea#comment', 'textarea[name="comment"]',
  'ol.comment-list', '.comment-list', '.comment-respond', '.comment-reply-title',
  '#disqus_thread', 'div.commento-root', '#isso-thread',
  'div.jcomments', 'div.komento-wrap'
];

async function canFetch(url, cfg) {
  if (!cfg?.detection?.respect_robots_txt) return true;
  try {
    const u = new URL(url);
    const robotsUrl = `${u.origin}/robots.txt`;
    const { data } = await axios.get(robotsUrl, { timeout: 8000, validateStatus: () => true });
    const rp = robotsParser(robotsUrl, data || '');
    return rp.isAllowed(url, 'Mozilla/5.0 (compatible; NinjaFinder/1.1)');
  } catch {
    return true;
  }
}

function detectLanguage($) {
  const htmlLang = $('html').attr('lang') || $('html').attr('xml:lang') || '';
  return (htmlLang || '').toLowerCase();
}

function extractRelValues($, root) {
  const rels = new Set();
  (root ? root.find('a') : $('a')).each((_, a) => {
    const rel = (($(a).attr('rel') || '') + '').toLowerCase();
    if (rel) rel.split(/\s+/).forEach(x => x && rels.add(x));
  });
  return Array.from(rels);
}

function hasCommentFootprint($) {
  let footprints = [];
  for (const sel of COMMENT_FOOTPRINT_SELS) {
    if ($(sel).length) footprints.push(sel);
  }
  const textFootprints = [
    'laisser un commentaire', 'ajouter un commentaire', 'poster un commentaire', 'répondre à l\'article',
    'leave a comment', 'post a comment', 'reply to article'
  ];
  const bodyText = ($('body').text() || '').toLowerCase();
  for (const t of textFootprints) {
    if (bodyText.includes(t)) footprints.push(`text:${t}`);
  }
  return { detected: footprints.length > 0, footprints };
}

function metaRobotsNoFollow($) {
  const c = ( $('meta[name="robots"]').attr('content') || '' ).toLowerCase();
  return c.includes('nofollow');
}
function xRobotsFromHeaders(headers) {
  const xr = (headers?.['x-robots-tag'] || headers?.['X-Robots-Tag'] || '').toString().toLowerCase();
  return xr.includes('nofollow');
}

function findCommentContainer($) {
  for (const sel of COMMENT_FOOTPRINT_SELS) {
    const el = $(sel);
    if (el.length) return el.first();
  }
  return null;
}

function requiresLoginForComments($) {
  const txt = ($('body').text() || '').toLowerCase();
  return /(se connecter pour commenter|connectez-vous pour commenter|you must be logged in to post a comment)/.test(txt);
}
function moderationDetected($) {
  const txt = ($('body').text() || '').toLowerCase();
  return /(modération|commentaire en attente de validation|held for moderation)/.test(txt);
}
function captchaPresent($) {
  return $('iframe[src*="recaptcha"], div.g-recaptcha').length > 0;
}

// dofollow probable = au moins un lien SANS rel nofollow/ugc/sponsored dans la zone commentaire
function isDofollowProbable($container) {
  let ok = false, firstOk = null;
  $container.find('a').each((_, a) => {
    const rel = (($(a).attr('rel') || '') + '').toLowerCase();
    if (!/\bnofollow\b|\bugc\b|\bsponsored\b/.test(rel)) { ok = true; if (!firstOk) firstOk = a; }
  });
  return { ok, firstOk };
}

async function crawlAndDetect(url, query_used, cfg) {
  if (!(await canFetch(url, cfg))) return null;
  const domain = getDomain(url) || parseUrl(url).host || '';

  const res = await axios.get(url, {
    timeout: 15000,
    maxRedirects: 3,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NinjaFinder/1.1)' },
    validateStatus: () => true
  });

  const http_status = res.status;
  if (http_status >= 400) return null;

  const html = res.data || '';
  const $ = cheerio.load(html);

  const lang = detectLanguage($);
  const { detected: comment_space_detected, footprints: comment_footprints } = hasCommentFootprint($);
  const comment_container = findCommentContainer($);
  const requires_login = requiresLoginForComments($);
  const moderation = moderationDetected($);
  const captcha = captchaPresent($);

  const robots_meta_nofollow = metaRobotsNoFollow($);
  const xrobots_nofollow = xRobotsFromHeaders(res.headers);
  const any_robots_nofollow = robots_meta_nofollow || xrobots_nofollow;

  let rel_values_found = [];
  let nofollow_in_comment_area = false;
  let dofollow_probable = false;
  let evidence_selector = '';
  let evidence_html_snippet = '';

  if (comment_container && comment_container.length) {
    rel_values_found = extractRelValues($, comment_container);
    nofollow_in_comment_area = rel_values_found.some(v =>
      ['nofollow', 'ugc', 'sponsored'].includes(v)
    );
    const { ok, firstOk } = isDofollowProbable(comment_container);
    dofollow_probable = ok && !any_robots_nofollow;
    if (firstOk) {
      evidence_selector = COMMENT_FOOTPRINT_SELS.find(s => $(s).length) || '';
      evidence_html_snippet = cheerio.html(firstOk).slice(0, 280);
    }
  }

  const link_field_allowed = $('input[name="url"], input[name="website"]').length > 0;

  const weights = (cfg.scoring && cfg.scoring.tld_weights) || {};
  const bonuses = (cfg.scoring && cfg.scoring.bonuses) || {};
  const penalties = (cfg.scoring && cfg.scoring.penalties) || {};

  let quality_score = 0;
  quality_score += (weights['default'] || 0);
  if (comment_space_detected) quality_score += (bonuses.open_comments || 0);
  if (!requires_login && comment_space_detected) quality_score += (bonuses.no_login_required || 0);
  if (dofollow_probable && !nofollow_in_comment_area && !any_robots_nofollow)
    quality_score += (bonuses.probable_dofollow || 0);
  if (moderation) quality_score -= (penalties.moderation_detected || 0);
  if (captcha) quality_score -= (penalties.captcha_present || 0);

  return {
    domain,
    url,
    domain_extension: domain.split('.').slice(-1)[0] ? '.' + domain.split('.').slice(-1)[0] : '',
    query_used,
    language_detected: lang,
    country_hint: '',
    platform_cms_detected: '',
    forum_engine_detected: '',
    theme_or_plugins: '',
    comment_space_detected,
    comment_footprints: comment_footprints.join(', '),
    requires_login,
    moderation_detected: moderation,
    link_field_allowed,
    max_links_allowed: '',
    sample_comment_form_action: (comment_container && comment_container.find('form').attr('action')) || '',
    nofollow_in_comment_area,
    nofollow_in_profiles: '',
    nofollow_in_signatures: '',
    rel_values_found: rel_values_found.join(', '),
    robots_meta_nofollow,
    external_js_nofollow: '',
    dofollow_confirmed: (dofollow_probable && !nofollow_in_comment_area && !any_robots_nofollow),
    evidence_selector,
    evidence_html_snippet,
    js_required: false,
    fetch_method: 'http',
    http_status,
    captcha_present: captcha,
    cookies_consent_blocked: false,
    rate_limited: http_status === 429,
    last_checked_at: new Date().toISOString(),
    retry_count: 0,
    quality_score,
    quality_reasoning: `lang=${lang}, comments=${comment_space_detected}, login=${requires_login}, dofollow_probable=${dofollow_probable}, robots_nofollow=${any_robots_nofollow}`,
    notes: ''
  };
}

module.exports = { crawlAndDetect };
