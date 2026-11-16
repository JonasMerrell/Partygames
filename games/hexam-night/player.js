// Hexam Night's phone code only restyles the standard screens as the moonlit
// castle; the standard view renderer still draws everything.
import { CSS, SVG_DEFS } from './theme.js';

export default function () {
  if (!document.getElementById('hexam-night-css')) {
    document.head.append(Object.assign(document.createElement('style'), { id: 'hexam-night-css', textContent: CSS }));
  }
  if (!document.getElementById('hexam-night-defs')) {
    const wrap = document.createElement('div');
    wrap.id = 'hexam-night-defs';
    wrap.innerHTML = SVG_DEFS;
    document.body.append(wrap);
  }
  document.body.classList.add('hx-phone');
}
