// Story and dialogue: Dana Reyes, a wheelwoman who left Port Azura three
// years ago, is back because fixer Salvo Kane called in a debt — and because
// the Tide Kings took her brother's garage. Every mission opens with a short
// exchange and closes with a line; the dialogue panel shows in the HUD for
// a few seconds. All characters, names and places are original.
import { MISSION_NAMES } from './config.js';

export const STORY = {
  hero: 'Dana Reyes',
  heroBio: 'Wheelwoman. Left Port Azura three years ago after a job went bad. Back to settle a debt.',
  fixer: 'Salvo Kane',
  fixerBio: 'Fixer at the Rusty Anchor bar in Old Port. Knows everyone, owes no one, forgets nothing.',
  villain: 'Rico "Tide" Marsh',
  villainBio: 'Boss of the Tide Kings. Took the Reyes family garage on the Docks and turned it into his vault.',
  gang: 'The Tide Kings',
  city: 'Port Azura',
};
export const MISSION_INTRO = [
  {
    who: 'Salvo Kane',
    lines: [
      'Dana. Three years, and you walk in like the tide never went out.',
      'A package is waiting downtown. Bring it to the safehouse. No noise, no cops.',
      'Do this, and we start talking about your brother\'s garage.',
    ],
  },
  {
    who: 'Salvo Kane',
    lines: [
      'Azura Motors has a red Falco GT out front. The owner owes me. Take it.',
      'The alarm will sing and the PD will come. Drive like you mean it.',
    ],
  },
  {
    who: 'Salvo Kane',
    lines: [
      'Three shops owe me money. Market Row, the Neon Diner, Casino Sol.',
      'Walk in, be polite, walk out with what\'s mine. They know the drill.',
    ],
  },
  {
    who: 'Dana Reyes',
    lines: [
      'The drop went loud. Three stars and every cruiser in the city is awake.',
      'Lose them. Break line of sight, stay out of the searchlights, then come home.',
    ],
  },
  {
    who: 'Salvo Kane',
    lines: [
      'The Azura 500. Five checkpoints, a hundred seconds, half the city watching.',
      'Win it and the street starts saying your name again.',
    ],
  },
  {
    who: 'Salvo Kane',
    lines: [
      'Casino Sol keeps its cash in one till, behind one nervous cashier.',
      'Walk in on foot, hold the till open, and run. The PD will not wave.',
    ],
  },
  {
    who: 'Salvo Kane',
    lines: [
      'The gold Aurora GT. One of one. It sits at Azura Motors like it owns the street.',
      'Steal it, bring it home, and the Tide Kings lose their favourite toy.',
    ],
  },
  {
    who: 'Dana Reyes',
    lines: [
      'This is it. The Docks. Ten Tide Kings between me and my brother\'s garage.',
      'Their boss wears a gold ring and a bigger mouth. Both come off tonight.',
    ],
  },
];
export const MISSION_OUTRO = [
  'Clean. The package is safe. Salvo nods like he never doubted you.',
  'The Falco is ours. Somewhere, a dealer is explaining this to his boss.',
  'Three debts, three envelopes. Salvo counts without smiling. That is his smile.',
  'You vanished like smoke. The PD is still looking in the wrong district.',
  'Checkered flag. The crowd at the finish line is already telling the story.',
  'The till is empty and you are gone. Casino Sol will count its losses twice.',
  'Gold on gold. The Aurora GT purrs in the safehouse like it was always yours.',
  'The Docks are quiet. The garage keys are in your hand. Port Azura is yours, Dana.',
];
export const STREET_LINES = [
  'A cabbie waves you over: "You driving tonight, or what?"',
  'Radio Azura: "…and the PD reminds drivers the speed limit is not a suggestion."',
  'A pedestrian shouts: "That\'s Dana Reyes! She\'s back!"',
  'Radio Azura: "Traffic on Airport Rd is moving like a rumour — slowly."',
  'A kid on the beach points at your car: "Cool ride, miss!"',
];
// One lore line per district, shown under the district banner when you enter.
export const DISTRICT_LORE = {
  'DOWNTOWN': 'Glass towers and every deal in the city.',
  'OLD PORT': 'Salvo\'s bar, rusted cranes, and debts older than you.',
  'CASINO STRIP': 'Neon, noise, and money changing hands.',
  'BEACHFRONT': 'Sun, sand, and the pier where deals go quiet.',
  'INDUSTRIAL YARDS': 'Warehouses and things nobody inventories.',
  'HILLCREST': 'Quiet streets. The money that lives here is louder.',
  'MARKET ROW': 'Stalls, spice, and the first debt on Salvo\'s list.',
  'AIRPORT RD': 'Runways, hangars, and cargo that never gets checked.',
  'PORT AZURA': 'A city that never sleeps — it just changes drivers.',
};
// Epilogue, read on the story-complete screen.
export const EPILOGUE = [
  'Three years ago Dana Reyes left Port Azura in a stolen car with the',
  'police behind her and her brother\'s garage in the Tide Kings\' hands.',
  'Tonight she owns the Docks, the gold Aurora GT, and the whole city.',
  'Salvo pours two drinks at the Rusty Anchor. "Welcome home, Dana."',
];
// Case file — the three people this story turns on, shown on the title.
export const CHARACTER_BIOS = [
  { name: 'DANA REYES', role: 'Wheelwoman', bio: 'Left Port Azura three years ago. Back to take her brother\'s garage back.' },
  { name: 'SALVO KANE', role: 'Fixer, the Rusty Anchor', bio: 'Knows everyone, owes no one, forgets nothing. Dana\'s way back in.' },
  { name: 'RICO "TIDE" MARSH', role: 'Boss of the Tide Kings', bio: 'Took the Reyes garage and turned it into his vault. Wears a gold ring.' },
];
// Show a dialogue box: who is speaking, the lines, how long it stays up.
export function showDialogue(G, who, lines, seconds) {
  G.dialogue = { who, lines, t: seconds || 6, i: 0 };
}
export function missionBriefing(G, index) {
  const intro = MISSION_INTRO[index];
  if (!intro) return;
  showDialogue(G, intro.who, intro.lines, 7);
  G.feed.push('Salvo: ' + intro.lines[0]);
}
export function missionOutro(G, index) {
  const line = MISSION_OUTRO[index];
  if (!line) return;
  showDialogue(G, 'Port Azura', [line], 5);
}
export function ambientLine(G) {
  if (G.dialogue) return;
  const line = STREET_LINES[Math.floor(Math.random() * STREET_LINES.length)];
  showDialogue(G, 'Street', [line], 4);
}
export function updateDialogue(G, dt) {
  if (!G.dialogue) return;
  G.dialogue.t -= dt;
  if (G.dialogue.t <= 0) G.dialogue = null;
}
export function missionTitle(index) {
  return 'M' + (index + 1) + '/8 — ' + MISSION_NAMES[index];
}
