/**
 * 站内搜索前端 —— 纯客户端过滤，不需要后端接口。
 *
 * 索引地址用 `../search-index.json` 相对定位：
 *   · 线上：/search/ → /search-index.json
 *   · 挂子路径时：/{base}/search/ → /{base}/search-index.json
 *   · 本地动态服务：/search → /search-index.json
 * 三种情况都能命中，所以这里不写死绝对路径。
 */
(function () {
  var box = document.getElementById('q');
  var hitsEl = document.getElementById('hits');
  var nEl = document.getElementById('n');
  if (!box || !hitsEl) return;

  var data = null;
  var loading = false;

  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** 先转义再插 <mark>，避免把正文里的尖括号当标签 */
  function mark(text, tokens) {
    var out = escHtml(text);
    if (!tokens.length) return out;
    var re = new RegExp('(' + tokens.map(function (t) {
      return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('|') + ')', 'gi');
    return out.replace(re, '<mark>$1</mark>');
  }

  function tokensOf(q) {
    return q.toLowerCase().split(/\s+/).filter(function (t) { return t.length > 0; });
  }

  /** 标题命中权重最高，其次板块和摘要，最后才是正文 */
  function score(item, tokens) {
    var t = item.t.toLowerCase();
    var s = (item.s || '').toLowerCase();
    var x = (item.x || '').toLowerCase();
    var b = (item.b || '').toLowerCase();
    var total = 0;
    for (var i = 0; i < tokens.length; i++) {
      var k = tokens[i];
      var hit = 0;
      if (t.indexOf(k) >= 0) hit += 100;
      if (s.indexOf(k) >= 0) hit += 20;
      if (x.indexOf(k) >= 0) hit += 10;
      if (b.indexOf(k) >= 0) hit += 3;
      if (!hit) return -1; // 每个词都必须出现，否则不算命中
      total += hit;
    }
    return total;
  }

  function snippet(item, tokens) {
    var src = item.x || '';
    if (!src || score({ t: '', s: '', x: src, b: '' }, tokens) < 0) {
      // 摘要里没命中就退到正文里截一段
      var b = item.b || '';
      var at = -1;
      for (var i = 0; i < tokens.length && at < 0; i++) at = b.toLowerCase().indexOf(tokens[i]);
      if (at < 0) return src.slice(0, 130);
      var from = Math.max(0, at - 45);
      return (from > 0 ? '…' : '') + b.slice(from, from + 150) + '…';
    }
    return src;
  }

  function render(q) {
    var tokens = tokensOf(q);
    hitsEl.innerHTML = '';
    if (!tokens.length) {
      if (nEl) nEl.textContent = '';
      hitsEl.innerHTML = '<div class="hits-empty">输入关键词开始搜索</div>';
      return;
    }

    var scored = [];
    for (var i = 0; i < data.length; i++) {
      var sc = score(data[i], tokens);
      if (sc > 0) scored.push({ item: data[i], sc: sc });
    }
    scored.sort(function (a, b) { return b.sc - a.sc; });

    if (nEl) nEl.textContent = scored.length ? scored.length + ' 条结果' : '没有结果';

    if (!scored.length) {
      hitsEl.innerHTML = '<div class="hits-empty">没找到和「' + escHtml(q) + '」相关的文章</div>';
      return;
    }

    var html = '';
    for (var j = 0; j < scored.length; j++) {
      var it = scored[j].item;
      var meta = [it.s, it.d].filter(Boolean).join(' // ');
      html += '<a class="hit" href="' + escHtml(it.u) + '">'
        + '<div class="hm">' + escHtml(meta) + '</div>'
        + '<h2 class="ht2">' + mark(it.t, tokens) + '</h2>'
        + '<p class="hx">' + mark(snippet(it, tokens), tokens) + '</p>'
        + '</a>';
    }
    hitsEl.innerHTML = html;
  }

  function run() {
    var q = (box.value || '').trim();
    if (!data) {
      if (loading) return;
      loading = true;
      fetch('../search-index.json', { cache: 'no-cache' })
        .then(function (r) { return r.json(); })
        .then(function (d) { data = d || []; loading = false; render(q); })
        .catch(function () {
          loading = false;
          hitsEl.innerHTML = '<div class="hits-empty">搜索索引加载失败，请刷新重试</div>';
        });
      return;
    }
    render(q);
  }

  var timer = null;
  box.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(run, 140);
  });

  // 支持从别处带 ?q= 跳进来
  var preset = new URLSearchParams(location.search).get('q');
  if (preset) box.value = preset;

  run();
})();
