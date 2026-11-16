// Blanktastic's phone code only restyles the standard screens as stickers;
// the standard view renderer still draws everything.
import { CSS } from './look.js';

export default function () {
  if (!document.getElementById('blanktastic-css')) {
    document.head.append(Object.assign(document.createElement('style'), { id: 'blanktastic-css', textContent: CSS }));
  }
  document.body.classList.add('bt-look');
}
