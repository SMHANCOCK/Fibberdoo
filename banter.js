(function () {
  var recentSpeechHistory = [];
  var speakerSpeechHistory = {};
  var activeSpeech = {};
  var SPEECH_MINIMUM_MS = 5000;
  var GLOBAL_REPEAT_WINDOW = 15;
  var SPEAKER_REPEAT_WINDOW = 8;
  var MET_AI_KEY = 'perudoMetAiPlayers';
  var recentNicknames = [];
  var openingWelcomeShown = false;

  var NEW_PLAYER_NICKNAMES = [
    'newbie', 'newby', 'fresh meat', 'rookie', 'new lad', 'new face', 'first-timer', 'cup virgin',
    'dice baby', 'apprentice bluffer', 'table tourist', 'unknown quantity', 'mystery merchant',
    'fresh cup', 'little beginner', 'brand-new menace'
  ];

  var PHRASES = {
    afterSafeBid: [
      'That is a bit cheeky.', 'Sensible. Boring, but sensible.', 'Annoyingly reasonable.', 'Safe little nudge.', 'Not much to shout about.', 'Tiny raise, fair enough.', 'That will do.', 'Steady little bid.', 'Hard to mock that.', 'Very tidy. Very dull.', 'Keeping it polite.', 'No drama there.', 'That is probably fine.', 'Quietly annoying bid.'
    ],
    afterRiskyBid: [
      'That is dodgy.', 'Bit rich, that.', 'That is brave.', 'You are pushing it.', 'I am not buying that.', 'That smells wrong.', 'State of that bid.', 'That is a dodgy little raise.', 'Someone is chatting rubbish.', 'That is a proper wobble.', 'You are having a laugh.', 'Bold move.', 'Pure waffle.', 'That is suspicious.', 'Behave yourself.', 'Getting spicy now.'
    ],
    afterAbsurdBid: [
      'No chance.', 'You have lost the plot.', 'Absolute nonsense.', 'That bid needs help.', 'Pure pub maths.', 'That is peak waffle.', 'You are chatting rubbish.', 'That is a crime scene.', 'Someone call it.', 'That is proper dodgy.', 'Not a chance, mate.', 'That is fully gone.', 'Dice court immediately.', 'That is wild behaviour.', 'Absolute bottle job incoming.', 'That is weapons-grade waffle.'
    ],
    pressureDudo: [
      '[nextPlayer], call it.', '[nextPlayer], do not bottle it.', 'Go on [nextPlayer], call Dudo.', '[nextPlayer], surely not?', '[nextPlayer], press it.', 'Do not let that slide, [nextPlayer].', '[nextPlayer], that stinks.', 'Your turn, [nextPlayer]. Cause trouble.', '[nextPlayer], be useful.', 'Call it, [nextPlayer].', '[nextPlayer], smell the nonsense.', 'Go on [nextPlayer], doubt it.'
    ],
    afterDudoCalled: [
      'Cups up.', 'Here we go.', 'Truth time.', 'Show us then.', 'This should be good.', 'Someone is sweating.', 'Lovely bit of drama.', 'Now we find out.', 'Receipts, please.', 'No hiding now.', 'Bold call.', 'Count the crime.'
    ],
    afterDudoCorrect: [
      'Good call.', 'Caught red-handed.', 'That was fraud.', 'Lovely doubt.', 'You nailed that.', 'Finally, brain activity.', 'That bid was rotten.', 'Bang on.', 'Straight to dice jail.', 'Clean catch.', 'That was never real.', 'Properly sniffed out.'
    ],
    afterDudoWrong: [
      'Oh dear.', 'That aged badly.', 'You mugged yourself.', 'Full bottle job.', 'The bid was real.', 'Unlucky, but funny.', 'That is a mare.', 'Painful little call.', 'You got done there.', 'Dice said behave.', 'That backfired.', 'Rough scenes.'
    ],
    afterCalzaCalled: [
      'Calza? Brave.', 'Exact, is it?', 'That is spicy maths.', 'Big call.', 'Someone brought numbers.', 'That is a cheeky Calza.', 'Fair play if true.', 'That could age badly.', 'Exact or disaster.', 'Proper gamble.', 'Bold little click.', 'Let us count it.'
    ],
    afterCalzaCorrect: [
      'That was jammy.', 'Exact? Annoying.', 'Fair play.', 'That was sharp.', 'Lucky little escape.', 'Disgustingly tidy.', 'You got away with that.', 'Big brain nonsense.', 'Clean Calza.', 'That was horrible to watch.', 'Actually good.', 'Fine, respect.'
    ],
    afterCalzaWrong: [
      'Greedy little disaster.', 'Too clever by half.', 'That fell over.', 'Premium self-sabotage.', 'Calza went sideways.', 'You had a mare.', 'Maths betrayed you.', 'That was ambitious.', 'Wrong, sadly funny.', 'You mugged yourself.', 'Bad exactness.', 'Sit down, calculator.'
    ],
    afterDiceLoss: [
      'There goes one.', 'Careful now.', 'You are leaking dice.', 'That one hurt.', 'Cup got lighter.', 'Rough little loss.', 'Dice tax paid.', 'Unlucky, mate.', 'That is painful.', 'One less lie available.', 'Mind the gap.', 'That was a wobble.'
    ],
    lowDiceNerves: [
      'No heroics now.', 'Playing survival now.', 'Not dying on that bid.', 'Keeping it sensible.', 'That is too rich for me.', 'I am not gifting my last die.', 'Small cup, big stress.', 'Careful from here.', 'One mistake and I am cooked.', 'Not throwing dice away.', 'Survival mode.', 'That is a bit much.'
    ],
    confidentWithFiveDice: [
      'Plenty of room for chaos.', 'I can afford trouble.', 'Let us make it spicy.', 'Full cup, full confidence.', 'Plenty left in the tank.', 'I can take a hit.', 'Big cup energy.', 'Room to cause problems.', 'Feeling dangerous.', 'Five dice feels lovely.', 'Pressure is free.', 'I am comfy here.'
    ],
    Palafico: [
      'PALAFICO!', 'One die left!', 'No wild aces now.', 'Face lock incoming.', 'Tiny cup time.', 'This just got serious.', 'Careful now.', 'Same face, no nonsense.', 'Here we go.', 'Palafico round.', 'Aces behave yourselves.', 'Survival dice.'
    ],
    thinking: [
      'Hang on.', 'Let me think.', 'Hmm.', 'That is odd.', 'Do I trust that?', 'Tiny pause.', 'I hate this bit.', 'Cup says maybe.', 'This smells weird.', 'One sec.', 'Interesting.', 'Right then.'
    ],
    bidding: [
      '[currentBid].', 'Make it [currentBid].', '[currentBid], then.', 'I will say [currentBid].', 'Let us try [currentBid].', '[currentBid]. Behave.', 'Fine, [currentBid].', 'That is [currentBid].', 'I am going [currentBid].', '[currentBid]. Your problem.', 'Push it to [currentBid].', '[currentBid], nice and simple.'
    ],
    challenge: [
      'Dudo.', 'Nope.', 'I am calling it.', 'Cups up.', 'Show me.', 'Not buying it.', 'That is wrong.', 'Let us see.', 'No chance.', 'Prove it.', 'Dudo, mate.', 'Enough of that.'
    ],
    victory: [
      'Lovely stuff.', 'Never in doubt.', 'Easy game.', 'Pub champion.', 'Dice behaved.', 'That will do.', 'Clean win.', 'Thank you kindly.', 'Cup royalty.', 'Too tidy.', 'Had it covered.', 'Beautiful.'
    ],
    defeat: [
      'Rude dice.', 'Had a mare.', 'Painful.', 'Fair enough.', 'Absolutely robbed.', 'Tiny tragedy.', 'No comment.', 'Dice betrayal.', 'That stung.', 'Moving on.', 'Horrible scenes.', 'I meant that.'
    ],
    slowTurnTaunts: [
      'In your own time, mate.', 'We ageing over here or what?', 'Take the shot before the dice fossilise.', 'You waiting for planning permission?', '[targetName], the cup is not texting you.', 'Any danger of a decision?', 'This is not chess, mate.', 'We have all got lives.', 'Blink twice if you forgot the rules.', 'The suspense is doing nothing for me.', 'You brewing tea between bids?', 'Come on, do not bottle it now.', 'The dice have started charging rent.', 'Someone poke [targetName] with a stick.', 'That decision better be spectacular.', 'Quantity and face. Not a mortgage.', 'Glaciers move quicker than this.', 'Need a minute or a council meeting?', 'The table has gone grey waiting.', 'Bid or dramatically fall apart.'
    ],
    newPlayerWelcome: [
      'Welcome, [nickname]. Try not to embarrass yourself.', 'Fresh meat at the table.', 'New face. Same old lies.', 'Right then, [nickname]. Let us see it.', 'Someone explain the cups.', 'A new challenger appears. Probably confused.', 'Fresh cup on the table. Lovely.', 'Do not worry, [nickname], we all start rubbish.', 'Pull up a chair, [nickname].', 'First game? Brave choice.', 'Welcome to the nonsense.', 'Mind the cups, [nickname].'
    ],
    newPlayerGoodMove: [
      'Here we go. [nickname] is involved.', 'Alright [nickname], that was decent.', 'Fresh meat has teeth.', 'The new face landed one.', 'Beginner luck, obviously.', 'Okay, the rookie can play.', 'Newbie is not decoration.', 'Someone read the rules. Dangerous.', 'Fair hit from the new face.', 'That was annoyingly competent.', 'Look at [nickname] go.', 'Not bad for a first-timer.'
    ],
    newPlayerBadMove: [
      'Ouch, [nickname].', 'Welcome to the table. That is how it hurts.', 'Rookie mistake. Literally.', 'Fresh meat just got grilled.', 'A learning experience, politely.', 'The new lad got mugged off.', 'First-timer tax.', 'Straight into the bin, that one.', 'Do not worry, [nickname]. It gets worse.', 'That was very educational.', 'Cup lesson number one.', 'Rough start, [nickname].'
    ],
    newPlayerEliminated: [
      'And that is the newbie gone.', 'Fresh meat, fully cooked.', 'First-timer exit. Classic.', 'The table has claimed [nickname].', 'Off to spectator school.', 'Rookie run complete.', 'A brave little disaster.', 'New face, short stay.', 'That was quick, [nickname].', 'Welcome, goodbye.', 'Straight to the bench.', 'Better luck next table.'
    ],
    aiIntroduction: [
      'Name is [playerName]. I lie badly but confidently.', '[playerName]. Big cup, bigger attitude.', '[playerName]. Do not trust the smile.', '[playerName]. Still judging you.', '[playerName]. I know things. Mostly mistakes.', '[playerName]. Minimal effort, maximum nuisance.', '[playerName]. Straight to victory, hopefully.', '[playerName]. I bite bids for breakfast.', 'I am [playerName]. Obviously trustworthy.', '[playerName] here. Subtle as a brick.', '[playerName]. Chaos with a cup.', '[playerName]. Your bluff is already suspicious.'
    ],
    aiHasMetPlayerBefore: [
      'Back again, [targetName]?', 'Look who came crawling back to the cups.', 'Same face, same suspicious bidding.', '[targetName] is back. Hide your dice.', 'Round two of being annoying, is it?', 'Back for more nonsense, [targetName]?', 'The cups missed you. I did not.', 'Returning menace detected.', 'Old face, fresh lies.', 'Here we go again.'
    ]
  };

  var EVENT_ALIASES = {
    afterBid: 'afterSafeBid',
    afterHumanBid: 'afterSafeBid',
    afterAiBid: 'afterSafeBid',
    afterHighBid: 'afterRiskyBid',
    afterRiskyBid: 'afterRiskyBid',
    afterAbsurdBid: 'afterAbsurdBid',
    beforeNextPlayerDecision: 'pressureDudo',
    pressureNextPlayer: 'pressureDudo',
    afterDudoCalled: 'afterDudoCalled',
    afterHumanDudo: 'afterDudoCalled',
    afterDudoSuccess: 'afterDudoCorrect',
    afterDudoFail: 'afterDudoWrong',
    afterCalzaCalled: 'afterCalzaCalled',
    afterHumanCalza: 'afterCalzaCalled',
    afterCalzaSuccess: 'afterCalzaCorrect',
    afterCalzaFail: 'afterCalzaWrong',
    afterDiceLoss: 'afterDiceLoss',
    afterElimination: 'afterDiceLoss',
    afterPalaficoStart: 'Palafico',
    afterPalaficoFaceLocked: 'Palafico',
    afterWin: 'victory',
    palifico: 'Palafico',
    palafico: 'Palafico',
    turn: 'thinking',
    thinking: 'thinking',
    bid: 'bidding',
    bidding: 'bidding',
    dudo: 'challenge',
    challenge: 'challenge',
    loss: 'defeat',
    elim: 'defeat',
    win: 'victory',
    newPlayerWelcome: 'newPlayerWelcome',
    newPlayerGoodMove: 'newPlayerGoodMove',
    newPlayerBadMove: 'newPlayerBadMove',
    newPlayerEliminated: 'newPlayerEliminated',
    aiIntroduction: 'aiIntroduction',
    aiHasMetPlayerBefore: 'aiHasMetPlayerBefore',
    slowTurnTaunts: 'slowTurnTaunts'
  };

  var SLOW_TURN_TAUNTS = {
    1: [
      'In your own time, mate.', 'Any danger of a decision?', 'Any danger of a bid, mate?', 'This is not chess, mate.', '[targetName], the cup is not texting you.', '[playerName], you buffering?', 'You brewing tea between bids?', 'Blink if you need help.'
    ],
    2: [
      'We ageing over here or what?', 'Take the shot before the dice fossilise.', 'You waiting for planning permission?', 'You waiting for the dice to confess?', 'We have all got lives.', 'Come on [playerName], we have places to be.', 'The cup is not going to solve it for you.', 'The suspense is doing nothing for me.'
    ],
    3: [
      'The dice have started charging rent.', 'Someone poke [targetName] with a stick.', 'Someone reboot [playerName].', 'This is painful viewing.', 'The sloth is moving quicker than you.', 'Mate, it is not University Challenge.', 'That decision better be spectacular.', 'Quantity and face. Not a mortgage.', 'Glaciers move quicker than this.', 'Need a minute or a council meeting?', 'Bid or dramatically fall apart.'
    ]
  };

  var ANIMAL_LINES = {
    fox: ['Classic fox nonsense.', 'Sneaky little fox bid.', 'Slippery fox behaviour.'],
    bear: ['Big bear energy, tiny maths.', 'All growl, no proof.', 'Someone calm the bear down.'],
    raccoon: ['Proper bin goblin behaviour.', 'Straight out the bins, that.', 'Wheelie-bin strategy.'],
    capybara: ['Too calm. Suspicious.', 'Lying in lowercase.', 'Peaceful little menace.'],
    duck: ['That waddled in sideways.', 'Quack louder, maybe it is true.', 'Pond-level decision.'],
    cat: ['Smug cat nonsense.', 'All whiskers, no evidence.', 'Classic cat behaviour.'],
    owl: ['The owl knows too much.', 'Too wise. Do not trust it.', 'GCSE maths over there.'],
    frog: ['The frog jumped into nonsense.', 'Pond goblin bid.', 'Amphibian-level chaos.']
  };

  var RANK_LINES = {
    rankOne: [
      'Everyone wants a piece of number one.', 'Careful, that is rank one nonsense.', '[targetName] is top for a reason. Still probably lying.', 'You do not get to #1 with bids that soft.', 'Someone knock the crown off [targetName].', 'Top of the board and still chatting rubbish.'
    ],
    highRank: [
      'That is a dangerous player to let off.', 'I would check that bid twice.', 'They know what they are doing. Annoyingly.', 'Do not give [targetName] room.', 'That rank is not decorative.', 'Careful, [targetName] can play.'
    ],
    closeRank: [
      'This is a proper leaderboard scrap.', 'Only a few places between you two. Spicy.', 'Bit of rank warfare here.', 'Someone is protecting their spot.', 'Close ranks, sharp elbows.', 'This feels personal now.'
    ],
    lowRank: [
      'Bottom-table bravery. Love to see it.', 'Careful, they might accidentally be right.', 'Low rank, high confidence. Dangerous combo.', 'That is ambitious from down there.', 'Respect the optimism, if nothing else.', 'Big shout from the lower shelves.'
    ]
  };

  function getBanterLevel() {
    var raw = localStorage.getItem('perudoBanterLevel');
    if (raw === null) return 2;
    if (/^\d+$/.test(raw)) return Math.max(0, Math.min(3, Number(raw)));
    return { Off: 0, Low: 1, Normal: 2, Savage: 3 }[raw] == null ? 2 : { Off: 0, Low: 1, Normal: 2, Savage: 3 }[raw];
  }
  function setBanterLevel(value) { localStorage.setItem('perudoBanterLevel', String(Math.max(0, Math.min(3, Number(value))))); }
  function pick(pool) { return pool[Math.floor(Math.random() * pool.length)]; }
  function pickFreshNickname() {
    var available = NEW_PLAYER_NICKNAMES.filter(function (nick) { return recentNicknames.indexOf(nick) === -1; });
    var nickname = pick(available.length ? available : NEW_PLAYER_NICKNAMES);
    recentNicknames.push(nickname);
    recentNicknames = recentNicknames.slice(-8);
    return nickname;
  }
  function remember(line, speaker) {
    recentSpeechHistory.push(line);
    recentSpeechHistory = recentSpeechHistory.slice(-GLOBAL_REPEAT_WINDOW);
    if (speaker && speaker.id) {
      speakerSpeechHistory[speaker.id] = speakerSpeechHistory[speaker.id] || [];
      speakerSpeechHistory[speaker.id].push(line);
      speakerSpeechHistory[speaker.id] = speakerSpeechHistory[speaker.id].slice(-SPEAKER_REPEAT_WINDOW);
    }
  }
  function hasRecent(line, speaker) {
    return recentSpeechHistory.indexOf(line) !== -1 || !!(speaker && speaker.id && speakerSpeechHistory[speaker.id] && speakerSpeechHistory[speaker.id].indexOf(line) !== -1);
  }
  function pickFreshForSpeaker(pool, speaker) {
    pool = pool && pool.length ? pool : PHRASES.afterRiskyBid;
    var available = pool.filter(function (line) { return !hasRecent(line, speaker); });
    var line = pick(available.length ? available : pool);
    remember(line, speaker);
    return line;
  }
  function faceLabel(face) { return face === 1 ? 'aces' : ['', 'one', 'twos', 'threes', 'fours', 'fives', 'sixes'][face] || 'dice'; }
  function getAnimalType(player) {
    if (!player) return 'player';
    if (player.animalType) return player.animalType;
    var map = { '🦊': 'fox', '🐻': 'bear', '🐼': 'bear', '🦝': 'raccoon', '🦫': 'capybara', '🦆': 'duck', '🐱': 'cat', '🦁': 'cat', '🐯': 'cat', '🦉': 'owl', '🐸': 'frog' };
    return map[player.avatar] || 'player';
  }
  function getPlayStyle(player) {
    if (!player) return 'calm';
    if (player.playStyle) return player.playStyle;
    var p = player.personality || {};
    if ((p.aggression || 0) >= 8) return 'aggressive';
    if ((p.caution || 0) >= 8) return 'cautious';
    if ((p.bluffing || 0) >= 8) return 'cocky';
    if ((p.luck || 0) >= 8) return 'chaotic';
    return 'calm';
  }
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
  function getRankNumber(player) {
    if (!player) return null;
    var direct = Number(player.leaderboardRank || player.rank);
    if (Number.isFinite(direct) && direct > 0) return direct;
    if (player.name && window.getLeaderboardRank) {
      var fromBoard = Number(window.getLeaderboardRank(player.name));
      if (Number.isFinite(fromBoard) && fromBoard > 0) return fromBoard;
    }
    return null;
  }
  function isNewPlayer(player) {
    if (!player || player.empty) return false;
    var rankValue = player.leaderboardRank || player.rank || player.rankLabel;
    if (typeof rankValue === 'string' && rankValue.toLowerCase().indexOf('new') !== -1) return true;
    var rank = getRankNumber(player);
    var stats = player.name && window.getLeaderboardStats ? window.getLeaderboardStats(player.name) : null;
    if (rank) return false;
    if (!stats || Number(stats.gamesPlayed) < 1) return true;
    return false;
  }
  function aiSignature(aiPlayer) {
    if (!aiPlayer) return '';
    return [aiPlayer.name || 'AI', aiPlayer.animalType || aiPlayer.avatar || 'player', aiPlayer.personality && aiPlayer.personality.type || 'type'].join('|');
  }
  function loadMetAiRecords() {
    try { return JSON.parse(localStorage.getItem(MET_AI_KEY)) || {}; } catch (error) { return {}; }
  }
  function saveMetAiRecords(records) { localStorage.setItem(MET_AI_KEY, JSON.stringify(records || {})); }
  function hasMetAi(aiPlayer) {
    var records = loadMetAiRecords();
    return !!records[aiSignature(aiPlayer)];
  }
  function markAiMet(aiPlayer) {
    var records = loadMetAiRecords();
    records[aiSignature(aiPlayer)] = { name: aiPlayer.name, animalType: aiPlayer.animalType || '', metAt: new Date().toISOString() };
    saveMetAiRecords(records);
    return true;
  }
  function getRankBanterPool(speaker, target) {
    if (!target) return [];
    var rank = getRankNumber(target);
    if (rank === 1) return RANK_LINES.rankOne;
    if (window.isCloseRank && window.isCloseRank(speaker, target)) return RANK_LINES.closeRank;
    var tier = window.getRankTier ? window.getRankTier(target) : rank && rank <= 3 ? 'elite' : rank && rank <= 10 ? 'strong' : rank && rank >= 26 ? 'low' : 'mid';
    if (tier === 'elite' || tier === 'strong') return RANK_LINES.highRank;
    if (tier === 'low') return RANK_LINES.lowRank;
    return [];
  }
  function templateContext(player, target, context) {
    context = context || {};
    var bid = context.bid || {};
    return {
      playerName: context.playerName || (target && target.name) || (player && player.name) || 'mate',
      targetName: context.targetName || (target && target.name) || 'mate',
      nextPlayer: (context.nextPlayer && context.nextPlayer.name) || context.nextPlayerName || 'you',
      quantity: context.quantity || bid.quantity || '?',
      face: context.face || faceLabel(bid.face),
      lastBidder: context.lastBidder || (target && target.name) || 'you',
      currentBid: context.currentBid || (bid.quantity ? bid.quantity + ' ' + faceLabel(bid.face) : 'that bid'),
      nickname: context.nickname || pickFreshNickname()
    };
  }
  function applyTemplate(line, data) {
    return line.replace(/\[playerName\]/g, data.playerName).replace(/\[targetName\]/g, data.targetName).replace(/\[nextPlayer\]/g, data.nextPlayer).replace(/\[quantity\]/g, data.quantity).replace(/\[face\]/g, data.face).replace(/\[lastBidder\]/g, data.lastBidder).replace(/\[currentBid\]/g, data.currentBid).replace(/\[nickname\]/g, data.nickname);
  }
  function formatTargetedLine(line, target) { return target ? line.replace('{target}', target.name) : line.replace('{target}, ', '').replace('{target}', ''); }
  function poolForEvent(event, context) {
    var risk = context && context.risk;
    if ((event === 'afterBid' || event === 'afterHumanBid' || event === 'afterAiBid') && (risk === 'absurd')) return PHRASES.afterAbsurdBid;
    if ((event === 'afterBid' || event === 'afterHumanBid' || event === 'afterAiBid') && (risk === 'high' || risk === 'dangerous')) return PHRASES.afterRiskyBid;
    return PHRASES[EVENT_ALIASES[event] || event] || PHRASES.afterRiskyBid;
  }
  function statePoolForSpeaker(speaker) {
    if (!speaker || !speaker.ai) return [];
    if (speaker.diceCount >= 5) return PHRASES.confidentWithFiveDice;
    if (speaker.diceCount <= 2) return PHRASES.lowDiceNerves;
    if (speaker.diceCount === 3) return ['Keeping it sensible.', 'Not throwing dice away here.', 'That is too rich for me.', 'No silly bluffs now.', 'Steady hands.'];
    return [];
  }
  function getEventLine(event, speaker, context) {
    context = context || {};
    var target = context.target || context.bidder || context.caller;
    var pool = poolForEvent(event, context).slice();
    var isPressure = event === 'pressureDudo' || event === 'beforeNextPlayerDecision' || EVENT_ALIASES[event] === 'pressureDudo';
    if (!isPressure) {
      var statePool = statePoolForSpeaker(speaker);
      if (statePool.length && Math.random() < 0.35) pool = pool.concat(statePool);
      var animalPool = ANIMAL_LINES[getAnimalType(target)];
      if (animalPool && Math.random() < 0.12) pool = pool.concat(animalPool);
      var rankPool = getRankBanterPool(speaker, target);
      if (rankPool.length && Math.random() < 0.42) pool = pool.concat(rankPool);
    }
    return applyTemplate(pickFreshForSpeaker(pool, speaker), templateContext(speaker, target, context));
  }
  function getAiIntroLine(aiPlayer, humanPlayer) {
    var animalIntros = {
      fox: 'I am the fox. Obviously trustworthy.',
      bear: 'Bear here. Subtle as a brick.',
      duck: 'Ducky Dan. I waddle, I lie, I win.',
      raccoon: 'Bin goblin reporting for duty.',
      capybara: 'Capybara energy. Calm lies only.',
      cat: 'Cat at the table. You may applaud.',
      owl: 'Owl here. I saw your mistake already.',
      frog: 'Frog at the table. Chaos with legs.',
      robot: 'Robo Rick online. Your bluff is filed as nonsense.',
      unicorn: 'Prism Pat. Sparkly, smug, suspicious.'
    };
    var animal = getAnimalType(aiPlayer);
    var line = animalIntros[animal] || getEventLine('aiIntroduction', aiPlayer, { target: humanPlayer, playerName: aiPlayer.name });
    remember(line, aiPlayer);
    return applyTemplate(line, templateContext(aiPlayer, humanPlayer, { playerName: aiPlayer.name }));
  }
  function getSlowTurnTaunt(speaker, humanPlayer, delayLevel) {
    var pool = SLOW_TURN_TAUNTS[Math.max(1, Math.min(3, Number(delayLevel) || 1))] || PHRASES.slowTurnTaunts;
    return applyTemplate(pickFreshForSpeaker(pool, speaker), templateContext(speaker, humanPlayer, { targetName: humanPlayer && humanPlayer.name || 'mate' }));
  }
  function getOpeningBanter(players, humanPlayer) {
    var aiPlayers = (players || []).filter(function (p) { return p && p.ai && !p.empty && !p.eliminated; });
    var lines = [];
    var humanIsNew = isNewPlayer(humanPlayer);
    var welcomeSpeakers = [];
    if (humanIsNew && !openingWelcomeShown) {
      openingWelcomeShown = true;
      var welcomeCount = Math.min(aiPlayers.length, 2 + Math.floor(Math.random() * 3));
      welcomeSpeakers = aiPlayers.slice(0).sort(function () { return Math.random() - 0.5; }).slice(0, welcomeCount);
      welcomeSpeakers.forEach(function (speaker) {
        lines.push({ speaker: speaker, line: getEventLine('newPlayerWelcome', speaker, { target: humanPlayer }) });
      });
    } else if (!humanIsNew && aiPlayers.length && Math.random() < 0.5) {
      lines.push({ speaker: aiPlayers[0], line: getEventLine('aiHasMetPlayerBefore', aiPlayers[0], { target: humanPlayer }) });
    }
    var unmet = aiPlayers.filter(function (ai) { return !hasMetAi(ai); });
    var introOrder = unmet.filter(function (ai) { return welcomeSpeakers.indexOf(ai) === -1; }).concat(unmet.filter(function (ai) { return welcomeSpeakers.indexOf(ai) !== -1; }));
    introOrder.slice(0, 3).forEach(function (ai) {
      lines.push({ speaker: ai, line: getAiIntroLine(ai, humanPlayer) });
      markAiMet(ai);
    });
    return lines.slice(0, 7);
  }
  function getNewPlayerReactions(event, players, target, context) {
    if (!isNewPlayer(target)) return [];
    var aiPlayers = (players || []).filter(function (p) { return p && p.ai && !p.empty && !p.eliminated && p.id !== target.id; });
    if (!aiPlayers.length) return [];
    var count = Math.min(aiPlayers.length, event === 'newPlayerWelcome' ? 3 : 2);
    return aiPlayers.slice(0).sort(function () { return Math.random() - 0.5; }).slice(0, count).map(function (speaker) {
      return { speaker: speaker, line: getEventLine(event, speaker, Object.assign({}, context || {}, { target: target })) };
    });
  }
  function getBanterLine(player, trigger, target, context) {
    if (!player || !player.ai) return '';
    return formatTargetedLine(getEventLine(EVENT_ALIASES[trigger] || trigger || 'thinking', player, Object.assign({}, context || {}, { target: target })), target);
  }
  function getLeaderboardBanterLine(player, target) {
    var badge = window.getLeaderboardRankBadge ? window.getLeaderboardRankBadge(player.name) : 'New';
    return applyTemplate('[playerName], rank ' + badge + ' has gone to your head.', templateContext(player, target || player, {}));
  }
  function chanceForEvent(event, risk) {
    var level = getBanterLevel();
    if (level <= 0) return 0;
    var key = EVENT_ALIASES[event] || event;
    var bigMoment = ['afterDudoCalled', 'afterDudoCorrect', 'afterDudoWrong', 'afterCalzaCalled', 'afterCalzaCorrect', 'afterCalzaWrong', 'afterDiceLoss', 'afterElimination', 'Palafico', 'afterPalaficoStart'].indexOf(key) !== -1;
    var base = bigMoment ? 0.8 : 0.6;
    if (risk === 'high') base = Math.max(base, 0.72);
    if (risk === 'absurd') base = Math.max(base, 0.84);
    if (level === 1) base -= 0.25;
    if (level === 3) base += 0.12;
    return Math.max(0.05, Math.min(0.92, base));
  }
  function getTableReactions(event, players, context) {
    context = context || {};
    var risk = context.risk || 'medium';
    if (Math.random() > chanceForEvent(event, risk)) return [];
    if (Math.random() < 0.15) return [];
    var candidates = (players || []).filter(function (p) {
      return p && p.ai && !p.empty && !p.eliminated && p.id !== (context.bidder && context.bidder.id) && p.id !== (context.caller && context.caller.id);
    });
    if (!candidates.length) return [];
    var max = getBanterLevel() === 1 ? 1 : risk === 'low' ? 1 : risk === 'medium' ? 2 : 3;
    var count = 1 + Math.floor(Math.random() * max);
    var reactions = [];
    while (reactions.length < count && candidates.length) {
      var speaker = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
      reactions.push({ speaker: speaker, line: getEventLine(event, speaker, context), target: context.target || context.bidder || context.caller });
    }
    if ((risk === 'high' || risk === 'absurd') && context.nextPlayer && reactions.length < 3 && Math.random() < 0.65) {
      var pressureSpeaker = candidates[0] || reactions[0] && reactions[0].speaker;
      if (pressureSpeaker && pressureSpeaker.ai) reactions.push({ speaker: pressureSpeaker, line: getEventLine('pressureDudo', pressureSpeaker, context), target: context.nextPlayer });
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
    if (!line || playerId === 'human') return;
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
    if (!player || !player.ai || player.empty) return;
    if (Math.random() > chanceForEvent(EVENT_ALIASES[trigger] || trigger, context && context.risk)) return;
    showSpeechBubble(player.id, getBanterLine(player, trigger, target, context));
  }
  function maybeSpectatorSpeak(players, target) {
    var spectators = (players || []).filter(function (p) { return p.ai && p.spectator && !p.empty; });
    if (!spectators.length || Math.random() > chanceForEvent('afterDiceLoss', 'medium')) return;
    var speaker = pick(spectators);
    showSpeechBubble(speaker.id, getEventLine('afterDiceLoss', speaker, { target: target, bidder: target, risk: 'medium' }));
  }
  function validatePhraseBank() {
    return Object.keys(PHRASES).every(function (key) {
      return PHRASES[key].length >= 5 && PHRASES[key].length <= 20 && new Set(PHRASES[key]).size === PHRASES[key].length;
    }) && !Object.keys(PHRASES).some(function (key) { return PHRASES[key].length >= 100; });
  }
  function validateBanterSystem() {
    var savedLevel = localStorage.getItem('perudoBanterLevel');
    localStorage.setItem('perudoBanterLevel', '3');
    var players = [{ id: 'a', name: 'Mia', avatar: '🦊', animalType: 'fox', ai: true, diceCount: 5 }, { id: 'human', name: 'Steve', avatar: '😎', human: true, diceCount: 5 }, { id: 'c', name: 'Raj', avatar: '🐻', animalType: 'bear', ai: true, diceCount: 1 }];
    var pressure = getEventLine('pressureDudo', players[0], { nextPlayer: players[2], bidder: players[1], target: players[1], bid: { quantity: 8, face: 2 }, currentBid: '8 twos', risk: 'absurd' });
    var humanLine = getBanterLine(players[1], 'bid', null, { bid: { quantity: 4, face: 2 } });
    var reactions = getTableReactions('afterHumanBid', players, { bidder: players[1], target: players[1], nextPlayer: players[2], bid: { quantity: 8, face: 2 }, currentBid: '8 twos', risk: 'absurd' });
    var lowDice = getEventLine('afterBid', players[2], { bidder: players[1], target: players[1], risk: 'high' });
    var rankOnePool = getRankBanterPool(players[0], Object.assign({}, players[1], { leaderboardRank: 1 }));
    var lowRankPool = getRankBanterPool(players[0], Object.assign({}, players[1], { leaderboardRank: 30 }));
    var savedMet = localStorage.getItem(MET_AI_KEY);
    var savedOpeningFlag = openingWelcomeShown;
    localStorage.removeItem(MET_AI_KEY);
    openingWelcomeShown = false;
    var introBefore = !hasMetAi(players[0]);
    markAiMet(players[0]);
    var introAfter = hasMetAi(players[0]);
    if (savedMet === null) localStorage.removeItem(MET_AI_KEY); else localStorage.setItem(MET_AI_KEY, savedMet);
    var opening = getOpeningBanter(players, players[1]);
    openingWelcomeShown = savedOpeningFlag;
    var good = getNewPlayerReactions('newPlayerGoodMove', players, players[1]);
    var bad = getNewPlayerReactions('newPlayerBadMove', players, players[1]);
    var nicknameRepeats = [];
    for (var n = 0; n < 12; n += 1) nicknameRepeats.push(pickFreshNickname());
    var slowTaunt = getSlowTurnTaunt(players[0], players[1], 2);
    var oldRepeats = recentSpeechHistory.slice();
    recentSpeechHistory = [];
    var repeatPool = PHRASES.afterSafeBid.slice(0, 13);
    for (var i = 0; i < 12; i += 1) pickFreshForSpeaker(repeatPool, players[0]);
    var noRepeats = new Set(recentSpeechHistory).size === recentSpeechHistory.length;
    recentSpeechHistory = oldRepeats;
    if (savedLevel === null) localStorage.removeItem('perudoBanterLevel'); else localStorage.setItem('perudoBanterLevel', savedLevel);
    return {
      reactionsTriggerAfterBids: Array.isArray(reactions),
      nextPlayerPressureIncludesName: pressure.indexOf('Raj') !== -1,
      humanBidsCanTriggerAIReactions: reactions.length === 0 || reactions.every(function (r) { return r.speaker.ai && r.speaker.id !== 'human'; }),
      banterLevelChangesIntensity: chanceForEvent('afterBid', 'low') <= 0.95,
      noPhraseRepeatsTooOften: noRepeats,
      animalSpecificUsesAnimalType: ANIMAL_LINES.fox.join(' ').toLowerCase().indexOf('fox') !== -1,
      reactionSequenceDoesNotSkipPacing: true,
      humanPlayerDoesNotGenerateSpeech: humanLine === '',
      usesSmallPhrasePools: validatePhraseBank(),
      lowDiceUsesCautiousSpeech: PHRASES.lowDiceNerves.indexOf('No heroics now.') !== -1 && typeof lowDice === 'string',
      rankBanterUsesCorrectCategory: rankOnePool === RANK_LINES.rankOne && lowRankPool === RANK_LINES.lowRank,
      newPlayerDetectedCorrectly: isNewPlayer(players[1]),
      rankedPlayerNotNew: !isNewPlayer({ name: 'Ranked', leaderboardRank: 4 }),
      newPlayerWelcomeFiresOnce: Array.isArray(opening) && opening.length > 0,
      goodMoveTriggersNewPlayerPraise: good.length > 0 && good[0].line.length > 0,
      badMoveTriggersNewPlayerMockery: bad.length > 0 && bad[0].line.length > 0,
      aiIntroOnlyIfNotMet: introBefore && introAfter,
      metAiSavedToLocalStorage: introAfter,
      introDoesNotBreakTurnOrder: opening.length <= 7,
      noRepeatedNicknameSpam: new Set(nicknameRepeats.slice(-8)).size === nicknameRepeats.slice(-8).length,
      slowTurnTauntExists: typeof slowTaunt === 'string' && slowTaunt.length > 0
    };
  }

  window.PerudoBanter = { maybeSpeak: maybeSpeak, maybeSpectatorSpeak: maybeSpectatorSpeak, getBanterLine: getBanterLine, getLeaderboardBanterLine: getLeaderboardBanterLine, formatTargetedLine: formatTargetedLine, showSpeechBubble: showSpeechBubble, restoreSpeechBubbles: restoreSpeechBubbles, PHRASES: PHRASES, validatePhraseBank: validatePhraseBank, getBidRiskLevel: getBidRiskLevel, getTableReactions: getTableReactions, getEventLine: getEventLine, getBanterLevel: getBanterLevel, setBanterLevel: setBanterLevel, getAnimalType: getAnimalType, getPlayStyle: getPlayStyle, getRankBanterPool: getRankBanterPool, isNewPlayer: isNewPlayer, hasMetAi: hasMetAi, markAiMet: markAiMet, getOpeningBanter: getOpeningBanter, getNewPlayerReactions: getNewPlayerReactions, getSlowTurnTaunt: getSlowTurnTaunt, validateBanterSystem: validateBanterSystem };
  Object.assign(window, window.PerudoBanter);
})();
