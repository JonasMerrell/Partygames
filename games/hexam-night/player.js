// Hexam Night's phone code only restyles the standard screens as the moonlit
// castle; the standard view renderer still draws everything.
import { CSS } from './theme.js';

export default function () {
  if (!document.getElementById('hexam-night-css')) {
    document.head.append(Object.assign(document.createElement('style'), { id: 'hexam-night-css', textContent: CSS }));
  }
  document.body.classList.add('hx-phone');
}
