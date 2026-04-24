(function () {
  var recentSpeechHistory = [];
  var activeSpeech = {};
  var SPEECH_MINIMUM_MS = 5000;

  var CATEGORY_NAMES = [
    'thinking',
    'bidding',
    'challenge',
    'reaction',
    'bluff',
    'suspicion',
    'victory',
    'defeat',
    'idle chatter',
    'Palifico-specific',
    'round-start',
    'dice-reveal reactions'
  ];

  var PARTS = {
    thinking: {
      openers: ['Hmm', 'Right', 'Okay', 'Hold on', 'Let me see', 'Tiny pause', 'Deep breath', 'Interesting', 'Careful now', 'One second'],
      middles: ['the cup is muttering', 'that bid has teeth', 'something feels spicy', 'the table is twitchy', 'my dice look smug', 'this smells odd', 'the numbers are noisy', 'someone is sweating', 'the vibes are crooked', 'I need courage'],
      closers: ['here', 'again', 'already', 'somehow', 'tonight', 'properly', 'a bit', 'for once', 'under pressure', 'with style']
    },
    bidding: {
      openers: ['I bid', 'Make it', 'Let us say', 'I fancy', 'Put me down for', 'Try', 'The cup says', 'I am seeing', 'I will push', 'Fine then'],
      middles: ['[quantity] [face]', '[currentBid]', '[quantity] lovely [face]', '[quantity] suspicious [face]', '[quantity] brave [face]', '[quantity] noisy [face]', '[quantity] honest [face]', '[quantity] table [face]', '[quantity] sharp [face]', '[quantity] cheeky [face]'],
      closers: ['and breathe', 'your move', 'do enjoy that', 'with confidence', 'because why not', 'no refunds', 'hold steady', 'nice and tidy', 'for the room', 'like poetry']
    },
    challenge: {
      openers: ['Liar', 'I call it', 'Not buying it', 'Dudo', 'Show me', 'Lift the cups', 'That is nonsense', 'I challenge', 'No chance', 'Prove it'],
      middles: ['[lastBidder]', '[playerName]', 'that bid', '[currentBid]', '[quantity] [face]', 'your story', 'the drama', 'this madness', 'that little fairy tale', 'the table'],
      closers: ['right now', 'my friend', 'and good luck', 'with feeling', 'no hiding', 'nice try', 'too far', 'absolutely not', 'let us see', 'I dare you']
    },
    reaction: {
      openers: ['Oof', 'Lovely', 'Painful', 'Classic', 'There it is', 'Well then', 'That happened', 'Big swing', 'Cheeky', 'Spicy'],
      middles: ['from [playerName]', 'from [lastBidder]', 'on [currentBid]', 'at this table', 'under pressure', 'with no shame', 'with shaky hands', 'from the corner', 'in public', 'for everyone'],
      closers: ['honestly', 'somehow', 'again', 'beautifully', 'tragically', 'with flair', 'like that', 'too', 'already', 'naturally']
    },
    bluff: {
      openers: ['Trust me', 'Obviously', 'Clearly', 'No bluff here', 'Pure truth', 'Solid as oak', 'My cup confirms', 'Easy maths', 'Simple stuff', 'Believe me'],
      middles: ['there are [quantity] [face]', '[currentBid] is safe', 'the dice agree', 'I never fib', 'this is clean', 'the table knows', 'my face is honest', 'my hands are calm', 'nothing odd here', 'all perfectly normal'],
      closers: ['probably', 'mostly', 'do not check', 'carry on', 'no questions', 'for sure', 'obviously', 'I promise', 'maybe', 'look away']
    },
    suspicion: {
      openers: ['That smells wrong', 'I doubt it', 'Hmm, no', 'Suspicious', 'Very convenient', 'Bold claim', 'I see wobble', 'That cup twitched', 'Your voice cracked', 'Not convinced'],
      middles: ['[playerName]', '[lastBidder]', 'on [currentBid]', 'with [quantity] [face]', 'from here', 'at all', 'one bit', 'tonight', 'my friend', 'sunshine'],
      closers: ['not even slightly', 'try again', 'nice theatre', 'too neat', 'too loud', 'too quick', 'too shiny', 'I noticed', 'careful now', 'smells fishy']
    },
    victory: {
      openers: ['Lovely work', 'That is mine', 'Cup royalty', 'I will take that', 'Table bows', 'Clean win', 'Too easy', 'Dice behaved', 'Beautiful finish', 'Job done'],
      middles: ['for me', 'from [playerName]', 'against [lastBidder]', 'with style', 'with nerve', 'with tiny cubes', 'under pressure', 'at last', 'somehow', 'tonight'],
      closers: ['cheers', 'thank you', 'no autographs', 'stay humble', 'mostly luck', 'pure skill', 'do clap', 'what a table', 'good game', 'next round']
    },
    defeat: {
      openers: ['Brutal', 'I deserved that', 'Tiny tragedy', 'Dice betrayal', 'Fair enough', 'That hurt', 'I am wounded', 'Rough one', 'Cup down', 'Ouch'],
      middles: ['for me', 'from [playerName]', 'against [lastBidder]', 'on [currentBid]', 'with witnesses', 'at the table', 'in style', 'again', 'somehow', 'tonight'],
      closers: ['I recover', 'barely', 'carry on', 'no comment', 'very rude', 'well played', 'not ideal', 'classic me', 'emotionally fine', 'probably']
    },
    'idle chatter': {
      openers: ['Anyone thirsty', 'Nice cup', 'Quiet table', 'Pub rules', 'Good atmosphere', 'Dice are loud', 'My chair squeaks', 'I miss snacks', 'This table knows', 'Lovely evening'],
      middles: ['[playerName]', '[lastBidder]', 'between bids', 'for chaos', 'with these dice', 'under this pressure', 'near my cup', 'at this pace', 'for bluffing', 'with friends'],
      closers: ['honestly', 'cheers', 'not bad', 'carry on', 'just saying', 'very normal', 'no reason', 'probably', 'good luck', 'watch closely']
    },
    'Palifico-specific': {
      openers: ['Palifico time', 'Face locked', 'No wild ones', 'One die drama', 'Locked suit', 'No switching', 'Same face only', 'Tiny cup pressure', 'Palifico bites', 'Exact dice now'],
      middles: ['[face]', '[currentBid]', '[playerName]', '[lastBidder]', 'this round', 'from here', 'all the way', 'with one die', 'under heat', 'for glory'],
      closers: ['hold firm', 'no escape', 'good luck', 'stay sharp', 'count clean', 'no tricks', 'be brave', 'proper tense', 'lovely mess', 'careful']
    },
    'round-start': {
      openers: ['Fresh roll', 'New round', 'Cups down', 'Dice away', 'Here we go', 'Round opens', 'Shake them up', 'Back in', 'Clean slate', 'New chaos'],
      middles: ['[playerName]', '[lastBidder]', 'everyone', 'the table', 'with five dice', 'under pressure', 'after that mess', 'nice and easy', 'for glory', 'with nerves'],
      closers: ['good luck', 'no peeking', 'play nice', 'not likely', 'deep breaths', 'eyes down', 'cups ready', 'let us begin', 'steady now', 'cheers']
    },
    'dice-reveal reactions': {
      openers: ['There they are', 'Look at that', 'Dice never lie', 'Revealed', 'Count them', 'Oh hello', 'That is spicy', 'The truth lands', 'Cups up', 'Big reveal'],
      middles: ['[quantity] [face]', '[currentBid]', '[playerName]', '[lastBidder]', 'right there', 'on the felt', 'with wild ones', 'exactly there', 'in public', 'at last'],
      closers: ['beautiful', 'terrible', 'called it', 'did not expect that', 'very tasty', 'fair enough', 'what drama', 'keep counting', 'no hiding', 'lovely']
    }
  };

  function buildCategory(parts) {
    var phrases = [];
    parts.openers.forEach(function (opener) {
      parts.middles.forEach(function (middle) {
        if (phrases.length < 100) phrases.push(opener + ', ' + middle + '.');
      });
    });
    var closerIndex = 0;
    while (phrases.length < 100) {
      var opener = parts.openers[phrases.length % parts.openers.length];
      var middle = parts.middles[Math.floor(phrases.length / parts.openers.length) % parts.middles.length];
      var closer = parts.closers[closerIndex % parts.closers.length];
      phrases.push(opener + ', ' + middle + ', ' + closer + '.');
      closerIndex += 1;
    }
    return Array.from(new Set(phrases)).slice(0, 100);
  }

  var PHRASES = CATEGORY_NAMES.reduce(function (bank, category) {
    bank[category] = buildCategory(PARTS[category]);
    return bank;
  }, {});

  var TRIGGER_TO_CATEGORY = {
    turn: 'thinking',
    thinking: 'thinking',
    bid: 'bidding',
    bidding: 'bidding',
    dudo: 'challenge',
    challenge: 'challenge',
    loss: 'defeat',
    elim: 'defeat',
    win: 'victory',
    colour: 'idle chatter',
    reaction: 'reaction',
    bluff: 'bluff',
    suspicion: 'suspicion',
    idle: 'idle chatter',
    palifico: 'Palifico-specific',
    roundStart: 'round-start',
    reveal: 'dice-reveal reactions'
  };

  function levelAllows(kind) {
    var level = localStorage.getItem('perudoBanterLevel') || 'Normal';
    if (level === 'Off') return false;
    if (level === 'Low') return Math.random() < 0.35;
    if (level === 'Savage') return true;
    return kind === 'important' || Math.random() < 0.68;
  }
  function remember(line) {
    recentSpeechHistory.push(line);
    recentSpeechHistory = recentSpeechHistory.slice(-24);
  }
  function templateContext(player, target, context) {
    context = context || {};
    return {
      playerName: target && target.name ? target.name : player.name,
      quantity: context.quantity || (context.bid && context.bid.quantity) || '?',
      face: context.face || (context.bid && context.bid.faceName) || 'dice',
      lastBidder: target && target.name ? target.name : (context.lastBidder || 'you'),
      currentBid: context.currentBid || (context.bid ? context.bid.quantity + ' ' + context.bid.faceName : 'that bid')
    };
  }
  function applyTemplate(line, data) {
    return line
      .replace(/\[playerName\]/g, data.playerName)
      .replace(/\[quantity\]/g, data.quantity)
      .replace(/\[face\]/g, data.face)
      .replace(/\[lastBidder\]/g, data.lastBidder)
      .replace(/\[currentBid\]/g, data.currentBid);
  }
  function formatTargetedLine(line, target) { return target ? line.replace('{target}', target.name) : line.replace('{target}, ', '').replace('{target}', ''); }
  function getBanterLine(player, trigger, target, context) {
    var category = TRIGGER_TO_CATEGORY[trigger] || trigger || 'idle chatter';
    var pool = PHRASES[category] || PHRASES['idle chatter'];
    var line = pool[Math.floor(Math.random() * pool.length)];
    var attempts = 0;
    while (recentSpeechHistory.includes(line) && attempts < 8) {
      line = pool[Math.floor(Math.random() * pool.length)];
      attempts += 1;
    }
    remember(line);
    return formatTargetedLine(applyTemplate(line, templateContext(player, target, context)), target);
  }
  function getLeaderboardBanterLine(player, target) {
    var badge = window.getLeaderboardRankBadge ? window.getLeaderboardRankBadge(player.name) : 'New';
    return applyTemplate('[playerName], bold from ' + badge + '.', templateContext(player, target || player, {}));
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
      if (activeSpeech[playerId].expiresAt <= Date.now()) {
        delete activeSpeech[playerId];
      } else {
        renderSpeechBubble(playerId);
      }
    });
  }
  function showSpeechBubble(playerId, line) {
    if (!line) return;
    var existing = activeSpeech[playerId];
    if (existing && existing.timer) clearTimeout(existing.timer);
    activeSpeech[playerId] = {
      line: line,
      expiresAt: Date.now() + SPEECH_MINIMUM_MS,
      timer: setTimeout(function () {
        delete activeSpeech[playerId];
        var current = document.querySelector('[data-player-id="' + playerId + '"] .speech-bubble');
        if (current) current.remove();
      }, SPEECH_MINIMUM_MS)
    };
    renderSpeechBubble(playerId);
    if (window.playSpeechPopSound) window.playSpeechPopSound();
  }
  function maybeSpeak(player, trigger, target, important, context) {
    if (!player || player.empty || !levelAllows(important ? 'important' : trigger)) return;
    showSpeechBubble(player.id, getBanterLine(player, trigger, target, context));
  }
  function maybeSpectatorSpeak(players, target) {
    var spectators = players.filter(function (p) { return p.spectator && !p.empty; });
    if (!spectators.length || !levelAllows('spectator')) return;
    var speaker = spectators[Math.floor(Math.random() * spectators.length)];
    showSpeechBubble(speaker.id, getBanterLine(speaker, 'idle chatter', target));
  }
  function validatePhraseBank() {
    return CATEGORY_NAMES.every(function (category) {
      return PHRASES[category].length >= 100 && new Set(PHRASES[category]).size === PHRASES[category].length;
    });
  }

  window.PerudoBanter = { maybeSpeak: maybeSpeak, maybeSpectatorSpeak: maybeSpectatorSpeak, getBanterLine: getBanterLine, getLeaderboardBanterLine: getLeaderboardBanterLine, formatTargetedLine: formatTargetedLine, showSpeechBubble: showSpeechBubble, restoreSpeechBubbles: restoreSpeechBubbles, PHRASES: PHRASES, validatePhraseBank: validatePhraseBank };
  Object.assign(window, window.PerudoBanter);
})();
