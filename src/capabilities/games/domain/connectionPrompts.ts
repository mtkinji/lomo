export const samePagePrompts = [
  { question: 'Best kind of family morning?', options: ['Slow breakfast', 'Early adventure'] },
  { question: 'Pick the better surprise.', options: ['Mystery snack', 'Mystery outing'] },
  { question: 'Where should the blanket fort go?', options: ['Living room', 'Backyard'] },
  { question: 'Choose tonight’s soundtrack.', options: ['Dance party', 'Sing-along'] },
  { question: 'Which tiny superpower?', options: ['Always find keys', 'Perfect toast'] },
  { question: 'Pick the better rainy day.', options: ['Big blanket pile', 'Puddle mission'] },
  { question: 'Choose a family mascot.', options: ['Brave raccoon', 'Sleepy dragon'] },
  { question: 'Best seat on a road trip?', options: ['Window lookout', 'Backseat DJ'] },
  { question: 'Which secret room?', options: ['Library tunnel', 'Indoor treehouse'] },
  { question: 'Pick a midnight snack.', options: ['Warm cookies', 'Crunchy cereal'] },
  { question: 'Which weekend rule?', options: ['Pajamas all day', 'Dessert first'] },
  { question: 'Better family challenge?', options: ['Build it together', 'Solve it together'] },
];

export const commonThreadPrompts = [
  ['Pancakes', 'Moonlight'],
  ['Grandma', 'A thunderstorm'],
  ['A backpack', 'A secret'],
  ['Snow', 'A birthday'],
  ['A dog', 'An alarm clock'],
  ['A road trip', 'Popcorn'],
  ['A lighthouse', 'A bedtime story'],
  ['A lost mitten', 'A treasure map'],
  ['A kitchen timer', 'A racehorse'],
  ['A family recipe', 'A time machine'],
  ['A pillow fort', 'A castle moat'],
  ['A squeaky door', 'A drum solo'],
];

export const objectQuestPrompts = [
  'Find something older than you.',
  'Find something that makes you laugh.',
  'Find something tiny with a big story.',
  'Find something someone gave you.',
  'Find the softest thing nearby.',
  'Find something you would take to the moon.',
  'Find something that reminds you of someone here.',
  'Find something with a sound nobody expects.',
  'Find something that has traveled far.',
  'Find something useful in a ridiculous way.',
  'Find something with a hidden detail.',
  'Find something you would rescue first from a blanket fort.',
];

export const storyRelayPrompts = [
  'A mysterious package appeared at breakfast.',
  'The family pet knew a secret route through town.',
  'Every light went out—except one under the couch.',
  'The smallest person in the room woke up ten feet tall.',
  'A note inside an old book addressed everyone by name.',
  'The refrigerator began giving surprisingly good advice.',
  'A tiny door appeared in the most ordinary wall.',
  'Someone’s shadow waved before they did.',
];

export const storyTurnPrompts = [
  'Introduce something unexpected.',
  'Make the problem a little stranger.',
  'Bring back an earlier detail.',
  'Give someone a brave decision.',
  'Move the story somewhere new.',
  'End with one delightful surprise.',
];

export const forecastPrompts = [
  { question: 'Which would {{name}} choose for a free afternoon?', options: ['Make something', 'Go somewhere'] },
  { question: 'Which treat would {{name}} save for last?', options: ['Something crunchy', 'Something gooey'] },
  { question: 'Which surprise would delight {{name}} more?', options: ['A hidden note', 'A tiny gift'] },
  { question: 'Where would {{name}} rather wake up?', options: ['A treehouse', 'A houseboat'] },
  { question: 'What would {{name}} rather be famous for?', options: ['Making people laugh', 'Solving hard mysteries'] },
  { question: 'Which helper would {{name}} pick?', options: ['A tiny robot', 'A very clever crow'] },
  { question: 'Which family job would {{name}} claim?', options: ['Choose the music', 'Choose the snacks'] },
  { question: 'Which adventure would {{name}} try first?', options: ['Explore a cave', 'Sail to an island'] },
  { question: 'Which surprise would {{name}} keep?', options: ['An extra free hour', 'A mystery package'] },
  { question: 'Which talent would {{name}} borrow?', options: ['Play any instrument', 'Speak to animals'] },
];

export const clueTargets = [
  'Pillow fight', 'Birthday cake', 'Lost sock', 'Treehouse', 'Popcorn', 'Rain boots',
  'Family photo', 'Pancakes', 'Campfire', 'Snow day', 'Backpack', 'Hiccup',
  'Blanket fort', 'Road trip', 'Secret handshake', 'Kitchen dance', 'Missing puzzle piece', 'Water balloon',
  'Bedtime story', 'Tree swing', 'Movie night', 'Inside joke', 'Silly hat', 'Treasure map',
  'Sock puppet', 'Bubble bath', 'Flashlight', 'Lemonade stand', 'Paper airplane', 'Jump rope',
  'Ice cream cone', 'Laundry basket', 'Alarm clock', 'Rubber duck', 'Garden hose', 'Magic trick',
  'Telescope', 'Seashell', 'Soccer ball', 'Cookie jar', 'Shopping cart', 'Vacuum cleaner',
  'Doorbell', 'Sunglasses', 'Umbrella', 'Marshmallow', 'Kite', 'Hammock',
  'Toolbox', 'Toothbrush', 'Hairbrush', 'Bicycle bell', 'Mud puddle', 'Sleeping bag',
  'Firefly', 'Apple pie', 'Banana peel', 'Watermelon', 'Hot chocolate', 'Snowman',
  'Roller skates', 'Birthday candle', 'Picnic basket', 'Sprinkler', 'Camp tent', 'Sandcastle',
  'Soap bubble', 'Treasure chest', 'Toy robot', 'Jack-in-the-box', 'Wind chime', 'Rocking chair',
  'Pizza delivery', 'Lemon squeeze', 'Popcorn machine', 'Train whistle', 'School bus', 'Traffic cone',
  'Fire truck', 'Cowboy boots', 'Diving board', 'Canoe paddle', 'Fishing pole', 'Beach towel',
  'Moonwalk', 'High five', 'Sneezing fit', 'Tiptoe', 'Cartwheel', 'Hide-and-seek',
  'Tug-of-war', 'Hopscotch', 'Musical chairs', 'Group hug', 'Pillowcase ghost', 'Victory dance',
];

export const clueModes = [
  'Describe it without saying any part of the answer.',
  'Act it out without speaking.',
  'Use sounds and gestures. No descriptive words.',
  'Give fast comparisons: “It’s like…”',
];
