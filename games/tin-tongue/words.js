// Tin Tongue's word cards. Dashes mark syllables: a card scores one point per
// syllable, up to 3, because long words are harder to explain in short ones.
// Add as many as you like; the deck reshuffles when it runs out.
export const WORDS = `
cake frog moon sock train tent kite bread ghost snail drum shark crown
bridge cloud nest broom clock bell rope duck lamp beard tooth glove
chair horse king boat pearl skunk wheel vase sled cheese whale spoon
plant shell flute bee egg star bat fork tie mask flag wig salt
ham-mer pen-cil pil-low ro-bot mon-key gar-den bas-ket can-dle win-dow
pic-nic but-ter rain-bow pi-rate dol-phin mag-net zip-per jig-saw tea-pot
pud-dle an-chor cac-tus wal-rus pea-nut sun-burn back-pack pret-zel
pump-kin lad-der wiz-ard doc-tor hel-met bub-ble pup-pet gob-lin val-ley
pen-guin tur-tle gui-tar cof-fee jel-ly toast-er ba-by moun-tain sand-wich
wal-let mon-ster hic-cup tun-nel mir-ror sci-ence bal-loon ti-ger cas-tle
wa-ter-fall di-no-saur ba-na-na vol-ca-no but-ter-fly hel-i-cop-ter
um-brel-la tel-e-scope pi-a-no kan-ga-roo oc-to-pus pine-ap-ple
cam-er-a pa-ja-mas mu-se-um ham-burg-er bi-cy-cle as-tro-naut
ro-bot-ics pop-si-cle skel-e-ton choc-o-late sat-el-lite cu-cum-ber
la-sa-gna to-ma-to dic-tion-ar-y al-li-ga-tor broc-co-li
fla-min-go tram-po-line pa-ra-chute ac-ci-dent bar-be-cue
spa-ghet-ti vi-o-lin cal-en-dar cin-na-mon in-ter-net av-o-ca-do
lem-on-ade ex-er-cise el-e-va-tor tor-na-do yo-gurt hur-ri-cane
gor-il-la cro-co-dile mi-cro-wave sun-flow-er cat-er-pil-lar
wa-ter-mel-on ham-ster spi-der re-mote ta-co glass-es
fire-work snow-man jel-ly-fish tooth-brush cup-cake air-port
book-shelf pop-corn base-ball head-phones night-mare bath-tub
`.trim().split(/\s+/).map((w) => {
  const parts = w.split('-');
  return { word: parts.join(''), syllables: parts.length, points: Math.min(3, parts.length) };
});
