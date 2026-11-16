// Relay-console look for the phones; the standard views do the drawing.
export default function () {
  document.body.classList.add('sx-phone');
  if (document.getElementById('sx-phone-css')) return;
  const style = document.createElement('style');
  style.id = 'sx-phone-css';
  style.textContent = `
    body.sx-phone { background: radial-gradient(40em 30em at 50% 20%, #13263f, #070c15 70%) !important; color: #e8f4ff !important;
      font-family: 'Share Tech Mono', ui-monospace, 'SF Mono', Menlo, monospace; }
    body.sx-phone .view { border: 2px solid #2a3d57; border-top: 5px solid #3ee6c1; background: #0d1726; padding: 14px;
      clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px); }
    body.sx-phone h1, body.sx-phone h2 { letter-spacing: .06em; text-transform: uppercase; }
    body.sx-phone button { border-radius: 4px !important; font-weight: 800 !important; letter-spacing: .04em; }
    body.sx-phone input, body.sx-phone textarea { background: #060b14 !important; color: #e8f4ff !important;
      border: 2px solid #3ee6c1 !important; border-radius: 4px !important; }
  `;
  document.head.appendChild(style);
}
