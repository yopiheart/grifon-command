(() => {
  'use strict';
  const posts = JSON.parse(document.getElementById('post-data').textContent);
  const dialog = document.getElementById('creative-dialog');
  const caption = document.getElementById('dialog-caption');
  const status = document.getElementById('copy-status');
  const slider = document.getElementById('proof-slider');
  let opener = null;
  slider.addEventListener('input', () => slider.closest('.compare').style.setProperty('--split', `${slider.value}%`));
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    let visible = 0;
    document.querySelectorAll('.post-card').forEach(card => {
      card.hidden = filter !== 'all' && card.dataset.family !== filter;
      if (!card.hidden) visible += 1;
    });
    document.querySelectorAll('[data-filter]').forEach(item => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    document.querySelector('.filter-status').textContent = `${visible} creatives shown`;
  }));
  document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => {
    const post = posts.find(item => item.id === button.dataset.open);
    if (!post) return;
    opener = button;
    document.getElementById('dialog-number').textContent = `FIELD NOTE / ${post.id}`;
    document.getElementById('dialog-title').textContent = post.title;
    document.getElementById('dialog-family').textContent = `${post.family} / ${post.awareness}`;
    const image = document.getElementById('dialog-image');
    image.src = post.preview;
    image.alt = post.title;
    caption.value = post.caption;
    status.textContent = '';
    document.getElementById('dialog-inspiration').textContent = typeof post.inspiration === 'string' ? post.inspiration : JSON.stringify(post.inspiration);
    const proof = post.proofContext;
    document.getElementById('dialog-proof').textContent = proof && typeof proof === 'object'
      ? [proof.attestation, proof.conflict, proof.timing, `Source: ${proof.source}`].filter(Boolean).join(' ')
      : proof || 'Typography-led creative. No job date, location or operational availability is claimed.';
    const download = document.getElementById('download-post');
    download.href = post.png;
    download.download = `${post.slug}.png`;
    document.getElementById('open-inquiry').href = post.destination;
    dialog.showModal();
    document.getElementById('close-dialog').focus();
  }));
  document.getElementById('close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { if (opener) opener.focus(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  document.getElementById('copy-caption').addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(caption.value);
      status.textContent = 'Draft caption copied.';
    } catch {
      caption.focus();
      caption.select();
      status.textContent = 'Caption selected. Use Copy on your device.';
    }
  });
})();
