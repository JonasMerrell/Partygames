// The smallest useful game. Copy this folder, rename it, and start editing. (Lives in games/quick-poll.)
export default async function (ctx) {
  const { h } = ctx;
  await ctx.say('Quick Poll', 'Answer on your phone!', 2000);

  const question = 'Cats or dogs?';
  ctx.el.replaceChildren(h('h1', question), h('p.sub', 'Votes are coming in…'));
  const answers = await ctx.ask('all', {
    title: question,
    choices: ['Cats', 'Dogs'],
  }, {
    timeout: 20,
    onAnswer: (p) => ctx.el.append(h('div.chip', { style: { '--c': p.color } }, p.name)),
  });

  const counts = { Cats: 0, Dogs: 0 };
  for (const a of answers.values()) counts[a]++;
  ctx.show('all', { wait: 'Look at the TV!' });
  await ctx.say(`Cats ${counts.Cats} · Dogs ${counts.Dogs}`, 'Thanks for voting', 5000);
}
