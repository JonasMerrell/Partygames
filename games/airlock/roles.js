// Airlock: teams and roles. Shared by host.js (TV) and player.js (phones).

export const TEAMS = {
  crew: { name: 'Crew', color: '#3fd6c6', dark: '#0d3b3a' },
  swarm: { name: 'Swarm', color: '#ff4f9a', dark: '#4a0f2c' },
  drift: { name: 'Drifter', color: '#b9b2d6', dark: '#2e2a40' },
};

export const ROLES = {
  captain: {
    name: 'Captain', team: 'crew', key: true,
    goal: 'Team Crew. Stay away from the Mimic. The Crew wins if you end the game in a different module from the Mimic.',
  },
  mimic: {
    name: 'Mimic', team: 'swarm', key: true,
    goal: 'Team Swarm. Hunt the Captain. The Swarm wins if you end the game in the same module as the Captain.',
  },
  deckhand: {
    name: 'Deckhand', team: 'crew',
    goal: 'Team Crew. Find the Captain and keep the Mimic out of their module.',
  },
  spawn: {
    name: 'Spawn', team: 'swarm',
    goal: 'Team Swarm. Find the Captain and get the Mimic into the same module.',
  },
  scanner: {
    name: 'Scanner', team: 'crew', power: true,
    goal: 'Team Crew. Keep the Mimic away from the Captain. Once per game you can secretly scan the card of someone in your module. They will not know.',
  },
  lurker: {
    name: 'Lurker', team: 'swarm', power: true,
    goal: 'Team Swarm. Get the Mimic to the Captain. Once per game you can secretly peek at the card of someone in your module. They will not know.',
  },
  drifter: {
    name: 'Drifter', team: 'drift',
    goal: 'No team. You are on nobody\'s side. You win alone if you end the game in a different module from the Mimic.',
  },
};

export const MODULES = { A: 'Module A', B: 'Module B' };

/** Cards for n players: always a Captain and a Mimic, equal teams, a Drifter if n is odd. */
export function dealRoles(n, shuffle) {
  const roles = ['captain', 'mimic'];
  let each = Math.floor(n / 2) - 1;
  if (n >= 8) { roles.push('scanner', 'lurker'); each--; }
  for (let i = 0; i < each; i++) roles.push('deckhand', 'spawn');
  if (n % 2) roles.push('drifter');
  return shuffle(roles);
}

/** How many people each chief sends through the airlock, per round. */
export function transfers(n) {
  if (n >= 14) return [2, 2, 1];
  if (n >= 10) return [2, 1, 1];
  return [1, 1, 1];
}
