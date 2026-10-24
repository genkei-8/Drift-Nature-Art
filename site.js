/* GENKEI — progressive enhancement only; pages work without a framework */
(() => {
  'use strict';

  /*
   * Message box delivery.
   * - Direct send (recommended): set FORM_ENDPOINT to a form-to-email service
   *   (e.g. Web3Forms https://api.web3forms.com/submit with FORM_EXTRA = { access_key: '...' },
   *   or Formspree https://formspree.io/f/xxxxxxx). The studio address then never
   *   appears in the site's code, and MAIL_FALLBACK can be emptied.
   * - Fallback: with no endpoint, the form opens the visitor's mail app with a draft.
   *   The address is not shown on the page, but it is readable in this file.
   */
  const FORM_ENDPOINT = '';
  const FORM_EXTRA = {};
  const MAIL_FALLBACK = ['info.genkei', 'gmail.com'];

  const menuButton = document.querySelector('[data-menu-toggle]');
  const primaryNav = document.getElementById('primary-navigation');
  const closeMenu = () => {
    if (!menuButton || !primaryNav) return;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'メニューを開く');
    primaryNav.classList.remove('is-open');
  };
  if (menuButton && primaryNav) {
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
      primaryNav.classList.toggle('is-open', open);
    });
    primaryNav.addEventListener('click', event => {
      if (event.target.closest('a')) closeMenu();
    });
  }

  const dialog = document.getElementById('inquiry-dialog');
  const form = document.getElementById('inquiry-form');
  const status = document.getElementById('inquiry-status');
  const field = name => form?.elements.namedItem(name);
  const direct = Boolean(FORM_ENDPOINT);

  if (form) {
    form.querySelectorAll('[data-notice-mail],[data-label-mail]').forEach(el => { el.hidden = direct; });
    form.querySelectorAll('[data-notice-direct],[data-label-direct]').forEach(el => { el.hidden = !direct; });
  }

  const choose = (select, value) => {
    if (select && value && [...select.options].some(o => o.value === value)) select.value = value;
  };
  const showDialog = ({ work = '', interest = '' } = {}) => {
    if (!dialog || !form || typeof dialog.showModal !== 'function') return false;
    choose(field('work'), work);
    choose(field('interest'), interest);
    if (status) status.textContent = '';
    closeMenu();
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('dialog-open');
    return true;
  };
  document.querySelectorAll('[data-open-inquiry]').forEach(el => {
    el.addEventListener('click', event => {
      if (showDialog({ work: el.dataset.work, interest: el.dataset.interest })) event.preventDefault();
    });
  });
  document.querySelectorAll('[data-close-inquiry]').forEach(el => el.addEventListener('click', () => dialog?.close()));
  dialog?.addEventListener('close', () => document.body.classList.remove('dialog-open'));
  dialog?.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

  // Links such as contact.html?work=03 open the message box with that artwork chosen.
  const params = new URLSearchParams(location.search);
  if (document.body.dataset.page === 'contact' && (params.get('work') || params.get('interest'))) {
    showDialog({ work: params.get('work') || '', interest: params.get('interest') || '' });
  }

  const say = text => { if (status) status.textContent = text; };

  const openMailDraft = (subject, body) => {
    if (!MAIL_FALLBACK.length) return false;
    const href = 'mailto:' + MAIL_FALLBACK.join('@') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    window.location.href = href;
    return true;
  };

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const fd = new FormData(form);
    if (String(fd.get('_gotcha') || '')) return; // bots fill hidden fields
    const name = String(fd.get('name') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const interest = String(fd.get('interest') || '作品相談').trim();
    const work = String(fd.get('work') || '').trim();
    const message = String(fd.get('message') || '').trim();
    if (!name || !email || !message) return;
    const selectedWork = work ? field('work')?.selectedOptions[0]?.textContent || work : '未定';
    const subject = `【GENKEI お問い合わせ】${interest}${work ? ' / No.' + work : ''}`;
    const body = [
      'GENKEI 担当者様', '',
      'Webサイトからのお問い合わせです。', '',
      'お名前：' + name,
      'ご返信先：' + email,
      'お問い合わせ種別：' + interest,
      '対象作品：' + selectedWork, '',
      'メッセージ：', message
    ].join('\n');

    if (!direct) {
      if (openMailDraft(subject, body)) say('メールアプリが開きます。内容をご確認のうえ送信してください（まだ送信されていません）。');
      return;
    }

    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    say('送信しています…');
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...FORM_EXTRA, subject, name, email, replyto: email, interest, work: selectedWork, message })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      form.reset();
      say('送信しました。お問い合わせありがとうございます。内容を確認のうえ、ご返信いたします。');
    } catch (err) {
      say('送信できませんでした。時間をおいて再度お試しいただくか、LINEからご連絡ください。');
    } finally {
      submit.disabled = false;
    }
  });
})();
