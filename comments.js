/**
 * 静态站的评论区脚本 —— 数据从远程 API 拉，提交也发给远程。
 *
 * 用法（由 build-static 自动插入）：
 * <script src="/comments.js" data-api="https://xxx.workers.dev" data-slug="文章地址"></script>
 */
(function () {
  var tag = document.currentScript;
  if (!tag) return;

  var API = (tag.getAttribute('data-api') || '').replace(/\/+$/, '');
  var SLUG = tag.getAttribute('data-slug') || '';
  if (!API || !SLUG) return;

  var list = document.getElementById('cmtlist');
  var num = document.getElementById('cmtn');
  var form = document.getElementById('cmtform');
  var note = document.getElementById('cmtnote');
  if (!list || !form) return;

  function esc(x) {
    return String(x == null ? '' : x).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function render(items) {
    if (num) num.textContent = String(items.length);
    if (!items.length) {
      list.innerHTML = '<div class="cmtempty">还没有评论。说点什么吧。</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var c = items[i];
      var ini = String(c.nickname || '博').trim().slice(0, 1);
      var when = String(c.created_at || '').slice(0, 16).replace('T', ' ');
      var site = c.website
        ? '<a class="em" href="' + esc(c.website) + '" target="_blank" rel="noopener nofollow">' + esc(c.website) + '</a>'
        : '';
      html += '<div class="cmt"><div class="av"><span>' + esc(ini) + '</span></div><div class="c">'
        + '<div class="hd"><span class="nm">' + esc(c.nickname) + '</span>'
        + '<span class="tm">' + when + '</span></div>'
        + '<div class="bd">' + esc(c.body) + '</div>' + site + '</div></div>';
    }
    list.innerHTML = html;
  }

  function load() {
    fetch(API + '/comments?post=' + encodeURIComponent(SLUG))
      .then(function (r) { return r.json(); })
      .then(function (d) { render(d.comments || []); })
      .catch(function () {
        list.innerHTML = '<div class="cmtempty">评论服务暂时连不上</div>';
      });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = new FormData(form);
    if (note) { note.textContent = '提交中…'; note.style.color = ''; }
    fetch(API + '/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        post: SLUG,
        nickname: f.get('nickname'),
        email: f.get('email'),
        website: f.get('website'),
        body: f.get('body'),
        hp: f.get('hp'),
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.ok) {
          if (note) { note.textContent = d.error || '提交失败'; note.style.color = '#a8452f'; }
          return;
        }
        if (note) { note.textContent = '评论已发表'; note.style.color = '#2c7a72'; }
        form.reset();
        load();
      })
      .catch(function () {
        if (note) { note.textContent = '提交失败，检查网络'; note.style.color = '#a8452f'; }
      });
  });

  load();
})();
