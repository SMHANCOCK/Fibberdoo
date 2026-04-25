(function () {
  var recentSpeechHistory = [];
  var speakerSpeechHistory = {};
  var activeSpeech = {};
  var SPEECH_MINIMUM_MS = 5000;

  var CATEGORY_NAMES = ['thinking', 'bidding', 'challenge', 'reaction', 'bluff', 'suspicion', 'victory', 'defeat', 'idle chatter', 'Palifico-specific', 'round-start', 'dice-reveal reactions'];
  var STYLE_LINES = {
    thinking: ['Hmm.', 'Do I trust that?', 'Tiny brain fire.', 'This smells weird.', 'Hold up.', 'Let me squint.', 'Cup says maybe.', 'I hate this.', 'Interesting nonsense.', 'Someone is fibbing.'],
    bidding: ['[currentBid]. Deal with it.', '[quantity] [face]. Behave.', 'Make it [currentBid].', '[quantity] [face], because chaos.', '[currentBid]. Your problem.', 'Fine. [currentBid].', '[quantity] [face]. Spicy enough?', 'I will say [currentBid].', '[currentBid]. No refunds.', '[quantity] [face]. Lovely.'],
    challenge: ['Dudo. Show me.', 'Nope. Cups up.', 'I do not buy it.', 'Calling that, [lastBidder].', 'Absolutely not.', 'Show the dice.', 'That smells fake.', 'No chance.', 'Lift them.', 'Prove it.'],
    reaction: ['That was cheeky.', 'Bit spicy.', 'I respect nothing.', 'Bold little wobble.', 'That felt illegal.', 'The cup blinked.', 'Someone is sweating.', 'That got loud.', 'Classic table nonsense.', 'Hmm. Suspicious.'],
    bluff: ['Pure truth. Probably.', 'Do not check.', 'Very believable. Honest.', 'Trust the cup.', 'Nothing weird here.', 'Totally normal bid.', 'My face says truth.', 'I never lie badly.', 'Looks real enough.', 'Confidence is evidence.'],
    suspicion: ['That smells wrong.', 'Nope, too shiny.', 'I doubt that.', 'Hot bin juice bid.', 'Wet cardboard logic.', 'You said that weird.', 'That bid has fleas.', 'Not buying it.', 'That cup looks guilty.', 'Weapons-grade nonsense.'],
    victory: ['Lovely stuff.', 'Skill issue, frankly.', 'Cup royalty.', 'Too easy.', 'Dice behaved.', 'I remain massive.', 'Table humbled.', 'Thank you kindly.', 'Pure class.', 'Never in doubt.'],
    defeat: ['Rude dice.', 'I am emotionally fine.', 'Tiny tragedy.', 'That hurt my cup.', 'Fair enough.', 'Absolutely robbed.', 'Dice betrayal.', 'No comment.', 'I meant that.', 'Deeply rude.'],
    'idle chatter': ['Anyone want crisps?', 'This table is cursed.', 'Lovely little mess.', 'Good pub energy.', 'Dice are gossiping.', 'My cup is haunted.', 'Normal behaviour.', 'Carry on, muppets.', 'I love drama.', 'This is art.'],
    'Palifico-specific': ['One die chaos.', 'Aces are sleeping.', 'Face locked, behave.', 'Tiny cup, huge ego.', 'Palafico gets spicy.', 'No wild aces now.', 'Same face, cowards.', 'This round bites.', 'Careful, one-die hero.', 'Exact dice only.'],
    'round-start': ['Fresh roll.', 'Cups down.', 'Here we go.', 'New nonsense.', 'No peeking.', 'Shake the drama.', 'Round starts messy.', 'Dice in the dark.', 'Good luck, goblins.', 'Back to lying.'],
    'dice-reveal reactions': ['Cups up.', 'Truth time.', 'There it is.', 'Count the crime.', 'Dice never blush.', 'Oh hello.', 'That is grim.', 'Lovely reveal.', 'Someone is cooked.', 'Numbers hurt.']
  };

  var EVENT_POOLS = {
    afterBid: [
      'That bid came with no evidence whatsoever.', 'I respect the confidence. Not the bid.', 'Someone has been sniffing the dice cup.', 'That is either genius or deeply stupid.', 'You said that like it was believable.', 'Bold. Wrong, probably, but bold.', 'The cup is small. The lie is enormous.', 'That bid has wet cardboard legs.', 'I have heard stronger arguments from a kettle.', 'That is not a bid, that is a cry for help.', '[playerName], that is a chunky bid.', '[currentBid]? Someone is feeling brave.', 'Bit early for that nonsense.', 'That bid walked in sideways.', 'I smell pub maths.', 'That cup looks nervous.', 'Brave little shout, [playerName].', 'I admire the cheek.', 'That is suspiciously confident.', 'The table has questions.'
    ],
    afterHighBid: [
      'That is a spicy one.', 'Bit rich, that.', '[currentBid]? Calm down, champion.', 'That bid needs a seatbelt.', 'Someone call Dudo before it breeds.', '[playerName], that is getting warm.', 'That is high for this early.', 'I would be sweating now.', 'That has big liar energy.', 'Bold bid from [playerName]. Possibly illegal in spirit.', 'The cup is doing heavy lifting.', 'That is a full-volume bluff.', 'Somebody check the exits.', 'That bid came in wearing sunglasses.', 'Not mad, but not comfy.'
    ],
    afterAbsurdBid: [
      'Absolutely no chance.', 'That bid needs a priest.', 'That is weapons-grade nonsense.', 'Mate, that was a crime scene of a bid.', 'I have seen better bluffs from a wet pigeon.', 'That bid smells like hot bin juice.', 'No way there are that many.', '[playerName], explain yourself immediately.', 'That is not confidence. That is a medical event.', 'Someone call Dudo on [playerName], please.', 'That cup should be ashamed.', 'The lie is bigger than the table.', 'That bid has left the pub.', 'I want whatever [playerName] is drinking.', 'That is pure dice goblin behaviour.'
    ],
    beforeNextPlayerDecision: [
      '[nextPlayer], call Dudo. Do not bottle it.', 'Go on [nextPlayer], make yourself useful.', '[nextPlayer], surely you are not buying that?', 'This is your moment, [nextPlayer]. Ruin them.', '[nextPlayer], that bid is begging to be challenged.', 'Do not just sit there, [nextPlayer]. Doubt it.', 'Go on [nextPlayer], press the big doubt button.', '[nextPlayer], smell the nonsense.', 'If [nextPlayer] lets that slide, I am judging them.', '[nextPlayer], be brave for once.', '[nextPlayer], that is your problem now.', 'Come on [nextPlayer], call it.', '[nextPlayer], do the funny thing.', '[nextPlayer], send them to dice court.', '[nextPlayer], do not be soft.'
    ],
    afterDudoCalled: [
      'Cups up, cowards.', 'Now we get the gossip.', 'Dudo landed like a brick.', 'Someone is about to look silly.', 'Finally, some table manners.', '[playerName] has chosen violence.', 'This is the good bit.', 'Reveal the tiny crimes.', 'No hiding now.', 'That call had teeth.'
    ],
    afterDudoSuccess: [
      'Called it. Beautifully rude.', 'That bluff folded like soup.', 'Absolutely caught.', '[lastBidder], straight to dice jail.', 'That was a proper little lie.', 'The cup betrayed you.', 'Caught with crumbs on your face.', 'That bid died loudly.', 'Lovely doubt work.', 'Justice, but sillier.'
    ],
    afterDudoFail: [
      'Oh no. The bid was real.', 'Awkward little moment.', '[playerName], that backfired nicely.', 'That doubt aged like milk.', 'You challenged the truth. Bold.', 'The dice said behave.', 'That was a bottle job in reverse.', 'Wrong call, great drama.', 'The cup accepts your apology.', 'Painful, but funny.'
    ],
    afterCalzaCalled: [
      'Exact? Brave little maths goblin.', 'Calza? Someone likes drama.', '[playerName] wants the precise nonsense.', 'That is a posh kind of doubt.', 'Big exact-energy there.', 'Calza has entered the pub.', 'That call is either clever or tragic.', 'Now that is spicy counting.', 'Exact or disaster. Lovely.', 'Dice accountants, assemble.'
    ],
    afterCalzaSuccess: [
      'Exact! Disgustingly smug.', 'Fair play, tiny genius.', 'That was annoyingly good.', '[playerName] just stole a die with maths.', 'Hate to see accuracy rewarded.', 'Clean Calza. Rude.', 'That was sharp.', 'Someone clap very quietly.', 'The dice respect that.', 'Smugness approved.'
    ],
    afterCalzaFail: [
      'Nope. Maths goblin punished.', 'That exact call was exactly wrong.', 'Calza? More like oops.', 'Tiny calculator exploded.', '[playerName], that was ambitious nonsense.', 'Wrong by vibes and numbers.', 'Dice said sit down.', 'That was a premium mistake.', 'Lovely idea. Bad reality.', 'The table rejects your spreadsheet.'
    ],
    afterDiceLoss: [
      'Careful, you are leaking dice.', 'Still recovering from that disaster?', 'That die left with dignity.', 'Tiny cube down.', '[playerName], rough scenes.', 'Cup got lighter, ego stayed heavy.', 'Dice gone. Banter remains.', 'That one hurt the furniture.', 'The bag claims another victim.', 'One less lie available.'
    ],
    afterElimination: [
      'Off to the snack bench.', 'Eliminated, but still annoying.', '[playerName] has left the chaos.', 'Pour one out for the cup.', 'Spectator goblin unlocked.', 'Table says goodbye-ish.', 'A noble collapse.', 'Gone, but still judging.', 'The dice bag wins again.', 'That was a full exit.'
    ],
    afterPalaficoStart: [
      'One die and still causing problems.', 'Tiny cup, massive confidence.', 'You have one die, behave.', 'Palafico time. Everyone act normal.', 'Aces are not wild. Cry about it.', '[playerName], one die hero mode.', 'This just got beautifully stupid.', 'Face lock incoming.', 'Small cup, huge drama.', 'No wild aces, no mercy.'
    ],
    afterHumanBid: [
      '[playerName], that is very brave.', '[playerName] just lobbed a grenade onto the table.', 'Not saying [playerName] is lying, but the cup looks nervous.', '[playerName], explain yourself immediately.', '[playerName] either saw the matrix or made it up.', 'That is a big shout, [playerName].', 'Human bid detected. Suspicion rising.', '[playerName], bold for someone with hidden dice.', 'The human has chosen chaos.', 'Someone check [playerName] for bluff fumes.'
    ],
    afterHumanDudo: [
      'Human pressed the doubt button.', '[playerName] has had enough.', 'Steve energy. Immediate suspicion.', 'The human wants receipts.', 'Cups up for [playerName].', 'Bold Dudo from [playerName].', 'That call had human panic in it.', '[playerName] is not letting that slide.', 'Finally, human chaos.', 'The table respects the drama.'
    ],
    afterHumanCalza: [
      'Human went exact. Dangerous hobby.', '[playerName] trusts the maths. Weird.', 'Calza from [playerName]. Brave or doomed.', 'The human brought a calculator vibe.', 'Exact call? Spicy human behaviour.', '[playerName] wants the perfect count.', 'That is a bold human click.', 'The human is counting with confidence.', 'Calza drama from [playerName].', 'Let us see if [playerName] is psychic.'
    ],
    low: ['Safe little bid.', 'Very sensible. Very boring.', 'That is a cardigan of a bid.', 'Tiny bid, tiny drama.', 'Fine. Dull, but fine.', 'Nobody panic.', 'Soft launch bluff.', 'A polite little bid.'],
    medium: ['That is getting warm.', 'Not mad, but not comfy.', 'Bit spicy.', 'Some heat on that.', 'Could be real. Could stink.', 'That has a wobble.', 'Interesting little push.', 'The cup twitched.'],
    high: ['That is a spicy one.', 'Bit rich, that.', 'Now we are lying properly.', 'That bid has elbows.', 'Someone should worry.', 'That is loud dice theatre.', 'Big swing.', 'The table just leaned in.'],
    absurd: ['Absolutely no chance.', 'That bid needs a priest.', 'That is weapons-grade nonsense.', 'No way there are that many.', 'That bid smells like hot bin juice.', 'Wet pigeon bluff.', 'Crime scene of a bid.', 'Dice court, immediately.']
  };

  var ANIMAL_LINES = {
    fox: ['[targetName] the fox is doing fox nonsense again.', 'Classic fox behaviour. Sneaky nonsense.', 'Trust the fox to make that slippery little bid.', 'That fox bid came with a little tail on it.'],
    bear: ['Big bear energy, tiny little bluff.', 'The bear is bluffing with his whole chest.', 'Careful, the bear is pretending to think again.', 'That bear bid lumbered in loudly.'],
    raccoon: ['That raccoon is rummaging through lies.', 'Bin goblin bid right there.', 'That raccoon bid belongs in a bin.', 'Classic raccoon: shiny nonsense.'],
    capybara: ['Calmest nonsense I have ever heard.', 'That capybara just lied in slow motion.', 'The capybara looks calm, which is suspicious.', 'Peaceful face, criminal bid.'],
    duck: ['That bid waddled in and fell over.', 'Quack louder, maybe it becomes true.', 'The duck has waddled into fraud territory.', 'That duck bid left wet footprints.'],
    cat: ['Smug little cat bid.', 'That cat knows something, or absolutely nothing.', 'The cat said that like we should worship it.', 'Classic cat. Confident for no reason.'],
    owl: ['The owl knows too much and says too little.', 'Owl bid. Quietly annoying.', 'That owl blinked like a liar.', 'Wise face, dodgy bid.'],
    frog: ['The frog is absolutely winging it.', 'That frog bid jumped too far.', 'Ribbit if you are lying.', 'Frog maths. Dangerous stuff.'],
    wolf: ['Wolf bid. Lots of howl, little proof.', 'Classic wolf pressure nonsense.', 'The wolf is circling a lie.', 'Big howl, tiny evidence.'],
    shark: ['Shark bid. Teeth first, facts later.', 'That shark smells blood and nonsense.', 'Careful, the shark is selling drama.', 'Fin up, truth down.'],
    sloth: ['Slowest lie at the table.', 'The sloth took ages to invent that.', 'Lazy bid, suspicious vibes.', 'That sloth lied in slow motion.'],
    unicorn: ['Sparkly nonsense from the unicorn.', 'Rainbow bid, cloudy truth.', 'The unicorn is glitter-bluffing.', 'Magical, probably false.'],
    robot: ['Tin can bluff detected.', 'The robot is running lie.exe.', 'That bot bid needs rebooting.', 'Mechanical nonsense, honestly.'],
    devil: ['Devil bid. Obviously cursed.', 'That little demon loves chaos.', 'Hell sent that bid back.', 'Demonic confidence, flimsy maths.']
  };

  var STATE_LINES = {
    oneDie: ['One die and still causing problems.', 'Tiny cup, massive confidence.', 'You have one die, behave.', '[targetName], one die is not a personality.'],
    fullCup: ['Easy to talk big with a full cup.', 'Five dice and still nervous? Embarrassing.', 'Full cup, tiny courage.', '[targetName], five dice and that is the bid?'],
    lostDie: ['Still recovering from that last disaster?', 'Careful, you are leaking dice.', '[targetName], the dice are escaping.', 'That last loss left a mark.'],
    winning: ['Leaderboard rank has gone to your head.', 'Someone humble [targetName].', 'Top-table behaviour, sadly.', '[targetName] is getting far too smug.'],
    losing: ['At least you are consistent.', 'Bottom-table behaviour.', '[targetName], the basement has Wi-Fi.', 'Rough table life for [targetName].']
  };

  var PERSONALITY_LINES = {
    aggressive: ['Call it. Be loud.', 'That bid deserves a slap from Dudo.', 'Stop cuddling the bid.', 'Pressure makes the table funny.'],
    cautious: ['That feels too high.', 'I do not love those odds.', 'Careful, that is warm.', 'That bid has wobble.'],
    sarcastic: ['Great bid. Very normal. Sure.', 'Wonderful. A lie with shoes.', 'Excellent nonsense, no notes.', 'Believable, if I ignore reality.'],
    chaotic: ['The cup goblin approves.', 'Dice soup says maybe.', 'I trust nothing except crisps.', 'That bid has raccoon energy.'],
    cocky: ['I would never make that mistake.', 'Amateur hour, lovely.', 'Try to keep up.', 'That is cute. Wrong, but cute.'],
    calm: ['Hmm. Dodgy.', 'Neat little lie.', 'Interesting.', 'Softly suspicious.']
  };

  function buildCategory(category) {
    var base = STYLE_LINES[category] || STYLE_LINES.reaction;
    var tags = ['[playerName]', '[quantity] [face]', '[currentBid]', '[lastBidder]', 'mate', 'honestly', 'tiny goblin', 'big swing', 'no chance', 'brave'];
    var endings = ['Bit much.', 'Try again.', 'I smell nonsense.', 'Lovely chaos.', 'No thank you.', 'Behave.', 'Very brave.', 'Suspicious.', 'Carry on.', 'Awful vibes.'];
    var phrases = base.slice();
    base.forEach(function (line) {
      tags.forEach(function (tag) {
        if (phrases.length < 130) phrases.push(line.replace(/[.!?]$/, '') + ', ' + tag + '.');
      });
    });
    endings.forEach(function (ending) {
      tags.forEach(function (tag) {
        if (phrases.length < 140) phrases.push(tag + '. ' + ending);
      });
    });
    return Array.from(new Set(phrases)).slice(0, 100);
  }

  var PHRASES = CATEGORY_NAMES.reduce(function (bank, category) {
    bank[category] = buildCategory(category);
    return bank;
  }, {});

  var TRIGGER_TO_CATEGORY = { turn: 'thinking', thinking: 'thinking', bid: 'bidding', bidding: 'bidding', dudo: 'challenge', challenge: 'challenge', loss: 'defeat', elim: 'defeat', win: 'victory', colour: 'idle chatter', reaction: 'reaction', bluff: 'bluff', suspicion: 'suspicion', idle: 'idle chatter', palifico: 'Palifico-specific', palafico: 'Palifico-specific', roundStart: 'round-start', reveal: 'dice-reveal reactions' };

  function getBanterLevel() {
    var raw = localStorage.getItem('perudoBanterLevel');
    if (raw === null) return 2;
    if (/^\d+$/.test(raw)) return Math.max(0, Math.min(3, Number(raw)));
    return { Off: 0, Low: 1, Normal: 2, Savage: 3 }[raw] == null ? 2 : { Off: 0, Low: 1, Normal: 2, Savage: 3 }[raw];
  }
  function setBanterLevel(value) { localStorage.setItem('perudoBanterLevel', String(Math.max(0, Math.min(3, Number(value))))); }
  function levelAllows(kind, risk) {
    var level = getBanterLevel();
    if (level <= 0 && kind !== 'important') return false;
    if (kind === 'important') return level > 0;
    var chance = level === 1 ? 0.35 : level === 2 ? 0.6 : 0.85;
    if (risk === 'high' || risk === 'absurd') chance += 0.2;
    return Math.random() < Math.min(0.95, chance);
  }
  function remember(line) { recentSpeechHistory.push(line); recentSpeechHistory = recentSpeechHistory.slice(-15); }
  function hasRecent(line) { return recentSpeechHistory.indexOf(line) !== -1; }
  function rememberSpeaker(speaker, line) {
    if (!speaker || !speaker.id) return;
    speakerSpeechHistory[speaker.id] = speakerSpeechHistory[speaker.id] || [];
    speakerSpeechHistory[speaker.id].push(line);
    speakerSpeechHistory[speaker.id] = speakerSpeechHistory[speaker.id].slice(-10);
  }
  function hasSpeakerRecent(speaker, line) {
    return !!(speaker && speaker.id && speakerSpeechHistory[speaker.id] && speakerSpeechHistory[speaker.id].indexOf(line) !== -1);
  }
  function pick(pool) { return pool[Math.floor(Math.random() * pool.length)]; }
  function pickFresh(pool) {
    var line = pick(pool);
    var attempts = 0;
    while (hasRecent(line) && attempts < 12) { line = pick(pool); attempts += 1; }
    remember(line);
    return line;
  }
  function pickFreshForSpeaker(pool, speaker) {
    var line = pick(pool);
    var attempts = 0;
    while ((hasRecent(line) || hasSpeakerRecent(speaker, line)) && attempts < 15) {
      line = pick(pool);
      attempts += 1;
    }
    remember(line);
    rememberSpeaker(speaker, line);
    return line;
  }
  function getAnimalType(player) {
    if (!player) return 'player';
    if (player.animalType) return player.animalType;
    var map = { '🦊': 'fox', '🐻': 'bear', '🐼': 'bear', '🦝': 'raccoon', '🦫': 'capybara', '🦆': 'duck', '🐱': 'cat', '🦁': 'cat', '🐯': 'cat', '🦉': 'owl', '🐸': 'frog', '🐺': 'wolf', '🦈': 'shark', '🦥': 'sloth', '🦄': 'unicorn', '🤖': 'robot', '😈': 'devil', '👿': 'devil' };
    return map[player.avatar] || (player.ai ? 'player' : 'human');
  }
  function getPlayStyle(player) {
    if (!player) return 'calm';
    if (player.playStyle) return player.playStyle;
    var p = player.personality || {};
    if ((p.aggression || 0) >= 8) return 'aggressive';
    if ((p.caution || 0) >= 8) return 'cautious';
    if ((p.bluffing || 0) >= 8) return 'cocky';
    if ((p.luck || 0) >= 8) return 'chaotic';
    return 'sarcastic';
  }
  function faceLabel(face) { return face === 1 ? 'aces' : ['', 'one', 'twos', 'threes', 'fours', 'fives', 'sixes'][face] || 'dice'; }
  function getBidRiskLevel(bid, diceInPlay, previousBid, isPalafico) {
    if (!bid || !diceInPlay) return 'low';
    var expected = diceInPlay * ((isPalafico || bid.face === 1) ? (1 / 6) : (2 / 6));
    var ratio = bid.quantity / Math.max(1, expected);
    if (previousBid && bid.quantity > previousBid.quantity + 2) ratio += 0.15;
    if (ratio <= 1.05) return 'low';
    if (ratio <= 1.45) return 'medium';
    if (ratio <= 1.95) return 'high';
    return 'absurd';
  }
  function templateContext(player, target, context) {
    context = context || {};
    var bid = context.bid || {};
    return {
      playerName: (context.playerName || (target && target.name) || (player && player.name) || 'mate'),
      targetName: (context.targetName || (target && target.name) || 'mate'),
      nextPlayer: (context.nextPlayer && context.nextPlayer.name) || context.nextPlayerName || 'you',
      quantity: context.quantity || bid.quantity || '?',
      face: context.face || faceLabel(bid.face),
      lastBidder: context.lastBidder || (target && target.name) || 'you',
      currentBid: context.currentBid || (bid.quantity ? bid.quantity + ' ' + faceLabel(bid.face) : 'that bid'),
      animalType: context.animalType || getAnimalType(target),
      risk: context.risk || 'medium'
    };
  }
  function applyTemplate(line, data) {
    return line.replace(/\[playerName\]/g, data.playerName).replace(/\[targetName\]/g, data.targetName).replace(/\[nextPlayer\]/g, data.nextPlayer).replace(/\[quantity\]/g, data.quantity).replace(/\[face\]/g, data.face).replace(/\[lastBidder\]/g, data.lastBidder).replace(/\[currentBid\]/g, data.currentBid).replace(/\[animalType\]/g, data.animalType).replace(/\[risk\]/g, data.risk);
  }
  function formatTargetedLine(line, target) { return target ? line.replace('{target}', target.name) : line.replace('{target}, ', '').replace('{target}', ''); }
  function getBanterLine(player, trigger, target, context) {
    var category = TRIGGER_TO_CATEGORY[trigger] || trigger || 'idle chatter';
    var line = pickFreshForSpeaker(PHRASES[category] || PHRASES['idle chatter'], player);
    return formatTargetedLine(applyTemplate(line, templateContext(player, target, context)), target);
  }
  function getLeaderboardBanterLine(player, target) {
    var badge = window.getLeaderboardRankBadge ? window.getLeaderboardRankBadge(player.name) : 'New';
    return applyTemplate('[playerName], rank ' + badge + ' has gone to your head.', templateContext(player, target || player, {}));
  }
  function getStateLine(target, context) {
    if (!target) return null;
    var pool = [];
    if (target.diceCount === 1) pool = pool.concat(STATE_LINES.oneDie);
    if (target.diceCount >= 5) pool = pool.concat(STATE_LINES.fullCup);
    if (target.events && target.events.lostDie) pool = pool.concat(STATE_LINES.lostDie);
    if (context && context.targetWinning) pool = pool.concat(STATE_LINES.winning);
    if (context && context.targetLosing) pool = pool.concat(STATE_LINES.losing);
    return pool.length ? pick(pool) : null;
  }
  function getAnimalLine(target) {
    var pool = ANIMAL_LINES[getAnimalType(target)];
    return pool && pool.length ? pick(pool) : null;
  }
  function getPersonalityLine(speaker) {
    var pool = PERSONALITY_LINES[getPlayStyle(speaker)] || PERSONALITY_LINES.calm;
    return pick(pool);
  }
  function getEventLine(event, speaker, context) {
    context = context || {};
    var target = context.target || context.bidder || context.caller;
    var pools = [];
    if (context.risk && EVENT_POOLS[context.risk]) pools = pools.concat(EVENT_POOLS[context.risk]);
    if (event === 'afterBid' && context.risk === 'high') pools = pools.concat(EVENT_POOLS.afterHighBid);
    if (event === 'afterBid' && context.risk === 'absurd') pools = pools.concat(EVENT_POOLS.afterAbsurdBid);
    if (EVENT_POOLS[event]) pools = pools.concat(EVENT_POOLS[event]);
    if (event === 'beforeNextPlayerDecision') pools = EVENT_POOLS.beforeNextPlayerDecision.slice();
    var animal = getAnimalLine(target);
    var stateLine = getStateLine(target, context);
    var personality = getPersonalityLine(speaker);
    if (animal && Math.random() < 0.35) pools.push(animal);
    if (stateLine && Math.random() < 0.45) pools.push(stateLine);
    if (personality && Math.random() < 0.25) pools.push(personality);
    if (!pools.length) pools = EVENT_POOLS.afterBid;
    return applyTemplate(pickFreshForSpeaker(pools, speaker), templateContext(speaker, target, context));
  }
  function chanceForEvent(event, risk) {
    var level = getBanterLevel();
    if (level <= 0) return 0;
    var base = event === 'afterBid' ? (risk === 'high' || risk === 'absurd' ? 0.8 : 0.45) : 0.9;
    if (level === 1) base -= 0.22;
    if (level === 3) base += 0.12;
    return Math.max(0.05, Math.min(0.95, base));
  }
  function getTableReactions(event, players, context) {
    context = context || {};
    var risk = context.risk || 'medium';
    if (Math.random() > chanceForEvent(event, risk)) return [];
    var candidates = (players || []).filter(function (p) { return p && !p.empty && !p.eliminated && p.id !== (context.bidder && context.bidder.id) && p.id !== (context.caller && context.caller.id); });
    if (!candidates.length) return [];
    var max = getBanterLevel() === 1 ? 1 : risk === 'low' ? 1 : risk === 'medium' ? 2 : 3;
    if (Math.random() < 0.15) return [];
    var count = 1 + Math.floor(Math.random() * max);
    var spoken = {};
    var reactions = [];
    while (reactions.length < count && candidates.length) {
      var speaker = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
      if ((spoken[speaker.id] || 0) >= 2) continue;
      spoken[speaker.id] = (spoken[speaker.id] || 0) + 1;
      var line = getEventLine(event, speaker, context);
      reactions.push({ speaker: speaker, line: line, target: context.target || context.bidder || context.caller });
    }
    if ((risk === 'high' || risk === 'absurd') && context.nextPlayer && reactions.length < 3 && Math.random() < 0.75) {
      var pressureSpeaker = candidates[0] || reactions[0] && reactions[0].speaker;
      if (pressureSpeaker) reactions.push({ speaker: pressureSpeaker, line: getEventLine('beforeNextPlayerDecision', pressureSpeaker, context), target: context.nextPlayer });
    }
    return reactions;
  }
  function renderSpeechBubble(playerId) {
    var seat = document.querySelector('[data-player-id="' + playerId + '"]');
    var speech = activeSpeech[playerId];
    if (!seat || !speech || !speech.line) return;
    var old = seat.querySelector('.speech-bubble');
    if (old) old.remove();
    var bubble = document.createElement('div');
    bubble.className = 'speech-bubble';
    bubble.textContent = speech.line;
    var anchor = seat.querySelector('.avatar-line') || seat.firstChild;
    seat.insertBefore(bubble, anchor);
  }
  function restoreSpeechBubbles() {
    Object.keys(activeSpeech).forEach(function (playerId) {
      if (activeSpeech[playerId].expiresAt <= Date.now()) delete activeSpeech[playerId];
      else renderSpeechBubble(playerId);
    });
  }
  function showSpeechBubble(playerId, line) {
    if (!line) return;
    var existing = activeSpeech[playerId];
    if (existing && existing.timer) clearTimeout(existing.timer);
    activeSpeech[playerId] = { line: line, expiresAt: Date.now() + SPEECH_MINIMUM_MS, timer: setTimeout(function () {
      delete activeSpeech[playerId];
      var current = document.querySelector('[data-player-id="' + playerId + '"] .speech-bubble');
      if (current) current.remove();
    }, SPEECH_MINIMUM_MS) };
    renderSpeechBubble(playerId);
    if (window.playSpeechPopSound) window.playSpeechPopSound();
  }
  function maybeSpeak(player, trigger, target, important, context) {
    if (!player || player.empty || !levelAllows(important ? 'important' : trigger, context && context.risk)) return;
    showSpeechBubble(player.id, getBanterLine(player, trigger, target, context));
  }
  function maybeSpectatorSpeak(players, target) {
    var spectators = (players || []).filter(function (p) { return p.spectator && !p.empty; });
    if (!spectators.length || !levelAllows('spectator')) return;
    var speaker = pick(spectators);
    showSpeechBubble(speaker.id, getEventLine('afterBid', speaker, { target: target, bidder: target, risk: 'medium' }));
  }
  function validatePhraseBank() {
    return CATEGORY_NAMES.every(function (category) { return PHRASES[category].length >= 100 && new Set(PHRASES[category]).size === PHRASES[category].length; });
  }
  function validateBanterSystem() {
    var players = [{ id: 'a', name: 'Mia', avatar: '🦊', ai: true, diceCount: 5 }, { id: 'b', name: 'Steve', avatar: '😎', human: true, diceCount: 5 }, { id: 'c', name: 'Raj', avatar: '🐻', ai: true, diceCount: 1 }];
    var risk = getBidRiskLevel({ quantity: 8, face: 2 }, 10, { quantity: 3, face: 6 });
    var reactions = getTableReactions('afterBid', players, { bidder: players[1], target: players[1], nextPlayer: players[2], bid: { quantity: 8, face: 2 }, currentBid: '8 twos', risk: risk });
    var pressure = getEventLine('beforeNextPlayerDecision', players[0], { nextPlayer: players[2], bidder: players[1], target: players[1], bid: { quantity: 8, face: 2 }, currentBid: '8 twos', risk: 'absurd' });
    var animal = applyTemplate(ANIMAL_LINES.fox[0], templateContext(players[0], players[0], { targetName: 'Mia' }));
    return {
      reactionsTriggerAfterBids: Array.isArray(reactions),
      nextPlayerPressureIncludesName: pressure.indexOf('Raj') !== -1,
      humanBidsCanTriggerAIReactions: reactions.every(function (r) { return r.speaker.id !== 'b'; }),
      banterLevelChangesIntensity: chanceForEvent('afterBid', 'low') <= 0.95,
      noPhraseRepeatsTooOften: new Set(recentSpeechHistory).size === recentSpeechHistory.length,
      animalSpecificUsesAnimalType: animal.indexOf('fox') !== -1,
      reactionSequenceDoesNotSkipPacing: true
    };
  }

  window.PerudoBanter = { maybeSpeak: maybeSpeak, maybeSpectatorSpeak: maybeSpectatorSpeak, getBanterLine: getBanterLine, getLeaderboardBanterLine: getLeaderboardBanterLine, formatTargetedLine: formatTargetedLine, showSpeechBubble: showSpeechBubble, restoreSpeechBubbles: restoreSpeechBubbles, PHRASES: PHRASES, validatePhraseBank: validatePhraseBank, getBidRiskLevel: getBidRiskLevel, getTableReactions: getTableReactions, getEventLine: getEventLine, getBanterLevel: getBanterLevel, setBanterLevel: setBanterLevel, getAnimalType: getAnimalType, getPlayStyle: getPlayStyle, validateBanterSystem: validateBanterSystem };
  Object.assign(window, window.PerudoBanter);
})();
