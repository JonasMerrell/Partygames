// Peak Fever's phone code only adds the alpine look; the standard views draw
// everything (the host sends the dice as a picture).
import { CSS } from './look.js';

export default function () {
  if (!document.getElementById('peak-fever-css')) {
    document.head.append(Object.assign(document.createElement('style'), { id: 'peak-fever-css', textContent: CSS }));
  }
  document.body.classList.add('pf-alpine');
}
