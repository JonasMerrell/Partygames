// Glitch Squad's phone code only restyles the standard screens as paper craft;
// the standard view renderer still draws everything.
import { CSS } from './paper.js';

export default function () {
  if (!document.getElementById('glitch-squad-css')) {
    document.head.append(Object.assign(document.createElement('style'), { id: 'glitch-squad-css', textContent: CSS }));
  }
  document.body.classList.add('gs-paper');
}
