import {Container, Graphics} from 'pixi.js';

export type DogMood = 'idle' | 'review' | 'approve' | 'celebrate';
const PIXEL = 3;
const palette: Record<string, number> = {
  K: 0x101c18, O: 0xbd581f, B: 0x713719, C: 0xde792b,
  W: 0xfff5de, S: 0xdcd8bd, R: 0xc86857,
};

/** Hand-drawn pixel geometry, articulated with held poses at six frames/second. */
export function createArcadeDog() {
  const view = new Container();
  function pixels(rows: string[], x: number, y: number, parent = view) {
    const joint = new Container(); joint.position.set(x, y);
    const art = new Graphics({roundPixels:true});
    rows.forEach((row, j) => [...row].forEach((color, i) => {
      if (palette[color] !== undefined) art.rect(i*PIXEL,j*PIXEL,PIXEL,PIXEL).fill(palette[color]);
    }));
    joint.addChild(art); parent.addChild(joint); return joint;
  }
  pixels([
    '....BBBBBBBB....',
    '..BBOOCCCCOOBB..',
    '.BOOCCCCCCCCOOB.',
    'BOOCCCCCCCCCCOOB',
    'BOCCCCCCCCCCCCOB',
    'BOCCCCCCCCCCCCOB',
    '.BOCCCCCCCCCCOB.',
    '..BOCCCCCCCCOB..',
    '...BOOCCCCOOB...',
    '...BOOOBBOOOB...',
    '..BOOOB..BOOOB..',
    '..BOOOB..BOOOB..',
    '.KOOOOB..BOOOOK.',
    '.KKKKKK..KKKKKK.',
  ],-24,-42);
  // Solid neck and shoulder bridge overlaps both muzzle and torso in every pose.
  pixels([
    '....OOOOOOOO....',
    '...OCCCCCCCCO...',
    '..OCCCCCCCCCCO..',
    '.OCCCCCCCCCCCCO.',
    'OCCCCCCCCCCCCCCO',
    'OCCCCCCCCCCCCCCO',
    'OCCCCCCCCCCCCCCO',
    '.OCCCCCCCCCCCCO.',
    '..OCCCCCCCCCCO..',
    '...OCCCCCCCCO...',
  ],-24,-66);
  const restingArm = [
    '..BBB...', '.BOCCB..', 'BOCCCB..', 'BOCCCB..',
    'BOCCCB..', 'BOCCCB..', 'BOCCCB..', '.BOCCCB.',
    '.BOCCCB.', '..BCCCBB', '..BOCCCB', '...BBBB.',
  ];
  const leftArm=pixels(restingArm,-39,-66);
  const rightArm=pixels(restingArm,39,-66);rightArm.scale.x=-1;
  const raisedArm=pixels([
    '..............BBBB..',
    '.............BCCCCB.',
    '............BOCCCCB.',
    '...........BOCCCCCB.',
    '..........BOCCCCCB..',
    '.........BOCCCCCB...',
    '........BOCCCCCB....',
    '.......BOCCCCCB.....',
    '......BOCCCCCB......',
    '.....BOCCCCCB.......',
    '....BOCCCCCB........',
    '...BOCCCCCB.........',
    '..BOCCCCCB..........',
    '.BOCCCCCB...........',
    'BOCCCCCB............',
    'BOCCCCB.............',
    '.BBBBB..............',
  ],18,-105);
  raisedArm.visible=false;
  const head = new Container(); head.position.set(-45,-114); view.addChild(head);
  const ears = pixels([
    '....KKKKK............KKKKK....',
    '..KKKKKKKK..........KKKKKKKK..',
    '.KKKKKKKKK..........KKKKKKKKK.',
    'KKKKKKKK..............KKKKKKKK',
    'KKKKKK..................KKKKKK',
    'KKKKK....................KKKKK',
    'KKKKK....................KKKKK',
    '.KKKK....................KKKK.',
    '.KKK......................KKK.',
  ],0,6,head);
  pixels([
    '......OOOOOOOO......',
    '....OOCCCCCCCCOO....',
    '...OCCCWWCCWWCCCO...',
    '..OCCCWWWCCWWWCCCO..',
    '..OCCWWWWCCWWWWCCO..',
    '..OCCWWWWCCWWWWCCO..',
    '..OCCWWWWCCWWWWCCO..',
    '..OCCCWWWCCWWWCCCO..',
    '...OCCCWWWWWWCCCO...',
    '...WWWWKKKKKKWWWW...',
    '..WWWWWKKKKKKWWWWW..',
    '.WWWWWWWKKKKWWWWWWW.',
    'WWWWWWWWWWWWWWWWWWWW',
    'WWKWWKWWWWWWWWKWWKWW',
    'WWWWWWWWWWWWWWWWWWWW',
    '.WWWKWWWWWWWWWWKWWW.',
    '..WWWWKKWWWWKKWWWW..',
    '...WWWWKKKKKKWWWW...',
    '....WWWWWWWWWWWW....',
    '......WWWWWWWW......',
  ],15,0,head);
  const eyes = pixels(['KK....KK','KW....KW','KK....KK','KK....KK'],33,12,head);
  const blink = pixels(['KK....KK'],33,18,head); blink.visible=false;
  const tongue = pixels(['RRRR','.RR.'],39,51,head);
  let previousFrame = -1, previousMood: DogMood | undefined;
  return {view, update(t: number, mood: DogMood) {
    const frame = Math.floor(t*6);
    if(frame===previousFrame && mood===previousMood) return;
    previousFrame=frame; previousMood=mood;
    const pose=frame%16, happy=mood==='celebrate', review=mood==='review', approved=mood==='approve';
    // Whole-pixel pose changes only: feet remain planted during idle/review.
    head.position.set(-45+(review&&pose>3?-3:0),-114+(approved&&pose%4>1?3:0));
    ears.y=6+(happy&&pose%2?3:0);
    leftArm.y=-66;
    rightArm.visible=!(approved||happy);
    raisedArm.visible=approved||happy;
    // Two held arm poses share the same shoulder overlap, never a detached paw.
    raisedArm.y=-105+(happy&&pose%4>1?-3:0);
    rightArm.y=-66+(review&&pose>7?-3:0);
    eyes.visible=pose!==14; blink.visible=pose===14;
    tongue.visible=happy||approved;
  }};
}
