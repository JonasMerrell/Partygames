// Question pairs. Everyone gets `q` except the odd one, who gets `odd`.
// Answers to both should look plausible side by side.
// kind: 'number' (slider, min/max) or 'text'.
export const PAIRS = [
  { kind: 'number', min: 0, max: 15, q: 'How many hours of sleep do you need to feel human?', odd: 'How many cups of tea or coffee could you drink in one day?' },
  { kind: 'number', min: 0, max: 10, q: 'Rate pineapple on pizza out of 10.', odd: 'Rate how scary clowns are out of 10.' },
  { kind: 'number', min: 0, max: 100, q: 'How many people could you name from your school year?', odd: 'How many push-ups could you do right now?' },
  { kind: 'number', min: 0, max: 60, q: 'How many minutes is the perfect shower?', odd: 'How many minutes do you need to get ready in the morning?' },
  { kind: 'number', min: 0, max: 10, q: 'How good a cook are you, out of 10?', odd: 'How good are you at keeping secrets, out of 10?' },
  { kind: 'number', min: 0, max: 50, q: 'How many apps are on your phone\'s home screen?', odd: 'How old were you when you got your first phone?' },
  { kind: 'number', min: 0, max: 20, q: 'How many times a day do you check the weather?', odd: 'How many pairs of shoes do you own?' },
  { kind: 'number', min: 0, max: 10, q: 'How brave are you, out of 10?', odd: 'How much do you like spicy food, out of 10?' },
  { kind: 'number', min: 0, max: 100, q: 'What age would you like to live to?', odd: 'What is the hottest temperature you have been in? (°C)' },
  { kind: 'number', min: 0, max: 12, q: 'How many months of the year is it too cold where you live?', odd: 'How many hours could you sit through a movie marathon?' },
  { kind: 'text', q: 'Name a food you could eat every day.', odd: 'Name a food you would bring to a picnic.' },
  { kind: 'text', q: 'What animal would make the best pet?', odd: 'What animal would win in a fight?' },
  { kind: 'text', q: 'Where would you go on your dream holiday?', odd: 'Where would you hide if zombies attacked?' },
  { kind: 'text', q: 'What is the best thing to do on a rainy day?', odd: 'What is a good first-date activity?' },
  { kind: 'text', q: 'Name a song that always gets you dancing.', odd: 'Name a song you would play at a funeral.' },
  { kind: 'text', q: 'What would you buy first if you won the lottery?', odd: 'What is something you secretly want for your birthday?' },
  { kind: 'text', q: 'Name something you always pack for a trip.', odd: 'Name something you would take to a desert island.' },
  { kind: 'text', q: 'What superpower would be most useful at work or school?', odd: 'What superpower would be the most fun at a party?' },
  { kind: 'text', q: 'Name a smell that reminds you of childhood.', odd: 'Name a smell you love but would never admit.' },
  { kind: 'text', q: 'What is the best topping for ice cream?', odd: 'What is the worst thing to put on a sandwich?' },
  { kind: 'text', q: 'Name a job you would be great at.', odd: 'Name a job you would be fired from on the first day.' },
  { kind: 'text', q: 'What would you name a pet goldfish?', odd: 'What would you name a pirate ship?' },
  { kind: 'text', q: 'Which room in a house is the best?', odd: 'Which room would you sleep in during a thunderstorm?' },
  { kind: 'text', q: 'Name a hobby you would like to try.', odd: 'Name a hobby you think is overrated.' },
];
