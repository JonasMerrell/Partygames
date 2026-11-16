export default function (ctx) {
  document.body.classList.add('lcars-phone');
  if (!document.getElementById('lcars-phone-css')) {
    const style = document.createElement('style');
    style.id = 'lcars-phone-css';
    style.textContent = `
      body.lcars-phone {
        background: #05050a !important;
        color: #ffcf87 !important;
        font-family: 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif;
      }
      body.lcars-phone .card, body.lcars-phone .view {
        border: 2px solid #ff9900;
        border-radius: 18px;
        background: #0c0d16;
        box-shadow: 0 0 18px rgba(255, 153, 0, 0.16);
      }
      body.lcars-phone h1, body.lcars-phone h2, body.lcars-phone .title {
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #ff9900;
      }
      body.lcars-phone button {
        border-radius: 999px !important;
        font-weight: 700 !important;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      body.lcars-phone input, body.lcars-phone textarea {
        background: #04050a !important;
        color: #99ccff !important;
        border: 2px solid #cc99cc !important;
        border-radius: 12px !important;
      }
    `;
    document.head.appendChild(style);
  }
}
