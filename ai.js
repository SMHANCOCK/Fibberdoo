(function () {
  var SKILL_KEY = 'perudoAiSkillLevel';
  var MEMORY_KEY = 'perudoAiMemory';
  var SKILL_LEVELS = ['easy', 'normal', 'hard', 'expert'];

  var namePools = {
    '🐺': ['Wolfgang', 'Lone Wolf Leo', 'Howler Harry'],
    '😈': ['Devil Dave', 'Inferno Ian', 'Sinister Sam'],
    '🦊': ['Cunning Charlie', 'Sneaky Fox Fred', 'Foxy Frank'],
    '🤖': ['Robo Rick', 'Circuit Steve', 'Byte Bot Ben'],
    '🦥': ['Lazy Larry', 'Slowpoke Sam', 'Chill Charlie'],
    '🦈': ['Sharky Shaun', 'Finley Blue', 'Reef Rob'],
    '🦄': ['Prism Pat', 'Glitter Gwen', 'Rainbow Rae'],
    '🐻': ['Bristol Bear', 'Grizzly Gaz', 'Paddington Pete'],
    '🦝': ['Bin Bag Barry', 'Rummage Ron', 'Wheelie Winnie'],
    '🦆': ['Ducky Dan', 'Waddle Wendy', 'Quack Quentin'],
    '🐱': ['Smug Cat Sid', 'Whiskers Will', 'Moggy Mae'],
    '🦉': ['Oxford Owl', 'Wisdom Walt', 'Hoots Henry'],
    '🐸': ['Froggy Phil', 'Pond Pete', 'Ribbit Rita']
  };
  var avatars = Object.keys(namePools);
  var defaultColours = { '😈': '#a31522', '🐺': '#777f86', '🦊': '#e46f25', '🤖': '#8fa3ad', '🦥': '#817044', '🦈': '#55798d', '🦄': '#ff82c8', '🐻': '#8b5e34', '🦝': '#596066', '🦆': '#d7a927', '🐱': '#c47c43', '🦉': '#7a5c2e', '🐸': '#55a85a' };
  var animalTypes = { '😈': 'devil', '🐺': 'wolf', '🦊': 'fox', '🤖': 'robot', '🦥': 'sloth', '🦈': 'shark', '🦄': 'unicorn', '🐻': 'bear', '🦝': 'raccoon', '🦆': 'duck', '🐱': 'cat', '🦉': 'owl', '🐸': 'frog' };

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function randomBetween(min, max) { return min + Math.random() * (max - min); }
  function getAiSkillLevel() {
    var saved = localStorage.getItem(SKILL_KEY) || 'hard';
    return SKILL_LEVELS.indexOf(saved) === -1 ? 'hard' : saved;
  }
  function setAiSkillLevel(level) {
    localStorage.setItem(SKILL_KEY, SKILL_LEVELS.indexOf(level) === -1 ? 'hard' : level);
  }
  function skillProfile(level) {
    return {
      easy: { noise: 1.6, dudoAccuracy: .55, bluffControl: .35, topChoices: 8, memory: 0, calza: .35 },
      normal: { noise: .85, dudoAccuracy: .72, bluffControl: .62, topChoices: 5, memory: .25, calza: .55 },
      hard: { noise: .35, dudoAccuracy: .88, bluffControl: .86, topChoices: 3, memory: .65, calza: .75 },
      expert: { noise: .12, dudoAccuracy: .95, bluffControl: .94, topChoices: 2, memory: 1, calza: .9 }
    }[level || getAiSkillLevel()];
  }

  function loadAiMemory() {
    try { return JSON.parse(localStorage.getItem(MEMORY_KEY)) || {}; } catch (error) { return {}; }
  }
  function saveAiMemory(memory) { localStorage.setItem(MEMORY_KEY, JSON.stringify(memory || {})); }
  function createPlayerMemory() {
    return { totalBids: 0, successfulBids: 0, failedBids: 0, dudoCalls: 0, successfulDudos: 0, failedDudos: 0, calzaCalls: 0, successfulCalzas: 0, failedCalzas: 0, averageBidRisk: 0, bluffRate: 0, challengeAccuracy: 0, recentRiskHistory: [], recentDudoHistory: [] };
  }
  function getPlayerMemory(nameOrPlayer, memoryStore) {
    var name = typeof nameOrPlayer === 'string' ? nameOrPlayer : nameOrPlayer && nameOrPlayer.name;
    memoryStore = memoryStore || loadAiMemory();
    if (!name) return createPlayerMemory();
    memoryStore[name] = memoryStore[name] || createPlayerMemory();
    return memoryStore[name];
  }
  function riskToNumber(risk) {
    return { safe: 0, reasonable: 1, risky: 2, dangerous: 3, absurd: 4 }[risk] == null ? 1 : { safe: 0, reasonable: 1, risky: 2, dangerous: 3, absurd: 4 }[risk];
  }
  function refreshDerivedMemory(mem) {
    mem.bluffRate = mem.totalBids ? mem.failedBids / mem.totalBids : 0;
    var challenges = mem.successfulDudos + mem.failedDudos + mem.successfulCalzas + mem.failedCalzas;
    mem.challengeAccuracy = challenges ? (mem.successfulDudos + mem.successfulCalzas) / challenges : 0;
    mem.averageBidRisk = mem.recentRiskHistory.length ? mem.recentRiskHistory.reduce(function (a, b) { return a + b; }, 0) / mem.recentRiskHistory.length : 0;
  }
  function recordBidMemory(player, bid, roundState, memoryStore) {
    memoryStore = memoryStore || loadAiMemory();
    var mem = getPlayerMemory(player, memoryStore);
    mem.totalBids += 1;
    mem.recentRiskHistory.push(riskToNumber(getBidRiskLevel(bid, player, roundState)));
    mem.recentRiskHistory = mem.recentRiskHistory.slice(-12);
    refreshDerivedMemory(mem);
    saveAiMemory(memoryStore);
    return mem;
  }
  function updateMemoryAfterDudo(caller, bidder, result, roundState, memoryStore) {
    memoryStore = memoryStore || loadAiMemory();
    var callerMem = getPlayerMemory(caller, memoryStore);
    var bidderMem = getPlayerMemory(bidder, memoryStore);
    callerMem.dudoCalls += 1;
    callerMem.recentDudoHistory.push(result.callerCorrect ? 1 : 0);
    callerMem.recentDudoHistory = callerMem.recentDudoHistory.slice(-10);
    if (result.callerCorrect) {
      callerMem.successfulDudos += 1;
      bidderMem.failedBids += 1;
    } else {
      callerMem.failedDudos += 1;
      bidderMem.successfulBids += 1;
    }
    refreshDerivedMemory(callerMem);
    refreshDerivedMemory(bidderMem);
    saveAiMemory(memoryStore);
  }
  function updateMemoryAfterCalza(caller, bidder, result, memoryStore) {
    memoryStore = memoryStore || loadAiMemory();
    var callerMem = getPlayerMemory(caller, memoryStore);
    callerMem.calzaCalls += 1;
    if (result.exact) callerMem.successfulCalzas += 1; else callerMem.failedCalzas += 1;
    refreshDerivedMemory(callerMem);
    saveAiMemory(memoryStore);
  }

  function generateAIName(avatar, usedNames) {
    var pool = namePools[avatar] || ['Dice Dana', 'Cup Casey', 'Bluff Blake'];
    var available = pool.filter(function (name) { return usedNames.indexOf(name) === -1; });
    return (available[0] || pool[Math.floor(Math.random() * pool.length)] + ' ' + Math.floor(Math.random() * 9));
  }
  function getAvatarPersonality(avatar) {
    var map = {
      '😈': ['Sarcastic Devil', 9, 3, 9, 5, 'Loves pressure and terrible choices.'],
      '🐺': ['Pack Bully', 7, 5, 8, 6, 'Circles weak bids.'],
      '🦊': ['Sneaky Fox', 9, 6, 7, 7, 'Slippery little bidder.'],
      '🤖': ['Dry Calculator', 4, 9, 5, 6, 'Annoyingly tidy maths.'],
      '🦥': ['Chill Trap', 5, 9, 3, 8, 'Looks asleep. Is not.'],
      '🦈': ['Table Shark', 6, 4, 10, 6, 'Pressure first, teeth second.'],
      '🦄': ['Chaos Sparkle', 8, 4, 6, 9, 'Makes odd bids work.'],
      '🐻': ['Pub Bouncer Bear', 6, 5, 9, 5, 'Big raises, bigger growl.'],
      '🦝': ['Bin Goblin', 8, 3, 7, 8, 'Rummages through nonsense.'],
      '🦆': ['Loose Duck', 7, 4, 6, 8, 'Waddles into danger.'],
      '🐱': ['Smug Cat', 8, 6, 6, 7, 'Acts like it invented lying.'],
      '🦉': ['Sharp Owl', 4, 9, 5, 8, 'Quiet, then horrible.'],
      '🐸': ['Pond Goblin', 8, 4, 7, 8, 'Jumpy little chaos merchant.']
    };
    var p = map[avatar] || ['Mystery Guest', 5, 5, 5, 5, 'A puzzle with a cup.'];
    return { type: p[0], bluffing: p[1], caution: p[2], aggression: p[3], luck: p[4], flavourLine: p[5] };
  }
  function getPlayStyleFromPersonality(personality) {
    if (personality.aggression >= 8) return 'aggressive';
    if (personality.caution >= 8) return 'cautious';
    if (personality.bluffing >= 8) return 'cocky';
    if (personality.luck >= 8) return 'chaotic';
    return 'calm';
  }
  function chooseAICupColour(avatar, name) {
    var stats = window.getLeaderboardStats ? window.getLeaderboardStats(name) : null;
    if (stats && stats.bestPerformingCupColour && stats.bestPerformingCupColour !== 'None' && Math.random() < 0.35) return stats.bestPerformingCupColour;
    return defaultColours[avatar] || '#888888';
  }
  function applyLeaderboardPersonalityModifiers(ai) {
    var stats = window.getLeaderboardStats ? window.getLeaderboardStats(ai.name) : null;
    if (!stats) return ai;
    var pressure = window.getStreakPressureLevel(stats.currentWinStreak);
    ai.winStreakStatus = pressure === 'None' ? 'No streak' : pressure;
    if (stats.currentWinStreak >= 2) ai.personality.aggression = Math.min(10, ai.personality.aggression + 1);
    if (stats.gamesPlayed && stats.wins === 0) ai.personality.caution = Math.min(10, ai.personality.caution + 1);
    ai.playStyle = getPlayStyleFromPersonality(ai.personality);
    return ai;
  }
  function generateAIPlayer(index, usedNames) {
    var avatar = avatars[Math.floor(Math.random() * avatars.length)];
    var name = generateAIName(avatar, usedNames);
    usedNames.push(name);
    var personality = getAvatarPersonality(avatar);
    var ai = { id: 'ai-' + index + '-' + Date.now(), ai: true, avatar: avatar, animalType: animalTypes[avatar] || 'player', playStyle: getPlayStyleFromPersonality(personality), moodLevel: 'calm', name: name, personality: personality, mood: 'calm', cupColour: chooseAICupColour(avatar, name), diceColour: chooseAICupColour(avatar, name), diceCount: 5, dice: [], events: {}, palaficoUsed: false, winStreakStatus: 'New Challenger' };
    ai.diceColour = ai.cupColour;
    return applyLeaderboardPersonalityModifiers(ai);
  }

  function getTotalDiceInPlay(roundState) {
    return (roundState.players || []).filter(function (p) { return p && !p.empty && !p.eliminated; }).reduce(function (sum, p) { return sum + (Number(p.diceCount) || 0); }, 0);
  }
  function getKnownDiceForPlayer(player) { return Array.isArray(player && player.dice) ? player.dice.slice() : []; }
  function isPalafico(roundState) { return !!(roundState && (roundState.palaficoActive || roundState.palificoActive)); }
  function getFaceCountInOwnDice(player, face, roundState) {
    var dice = getKnownDiceForPlayer(player);
    return dice.filter(function (value) {
      if (isPalafico(roundState) || face === 1) return value === face;
      return value === face || value === 1;
    }).length;
  }
  function getExpectedFaceCount(player, face, roundState) {
    var knownMatches = getFaceCountInOwnDice(player, face, roundState);
    var ownDice = getKnownDiceForPlayer(player).length || player.diceCount || 0;
    var unknownDice = Math.max(0, getTotalDiceInPlay(roundState) - ownDice);
    var probability = (isPalafico(roundState) || face === 1) ? (1 / 6) : (2 / 6);
    return knownMatches + unknownDice * probability;
  }
  function getBidRiskLevel(bid, player, roundState) {
    if (!bid) return 'safe';
    var expected = getExpectedFaceCount(player, bid.face, roundState);
    if (bid.quantity <= expected) return 'safe';
    if (bid.quantity <= expected + 1) return 'reasonable';
    if (bid.quantity <= expected + 2) return 'risky';
    if (bid.quantity <= expected + 3) return 'dangerous';
    return 'absurd';
  }
  function getBidConfidenceScore(bid, player, roundState) {
    var expected = getExpectedFaceCount(player, bid.face, roundState);
    var ownSupport = getFaceCountInOwnDice(player, bid.face, roundState);
    var risk = riskToNumber(getBidRiskLevel(bid, player, roundState));
    var confidence = 100 - Math.max(0, bid.quantity - expected) * 18 + ownSupport * 8 - risk * 8;
    var bidderMemory = roundState.previousBidderId && (roundState.players || []).find(function (p) { return p.id === roundState.previousBidderId; });
    var mem = bidderMemory ? getPlayerMemory(bidderMemory, roundState.aiMemory) : null;
    if (mem) confidence -= mem.bluffRate * 12;
    return confidence;
  }
  function getLegalBidOptions(player, roundState) { return window.getLegalBids ? window.getLegalBids(player, roundState) : []; }
  function moodModifier(player, key) {
    var mood = player.moodLevel || player.mood || 'calm';
    var table = {
      angry: { bluff: 12, dudo: 16, safe: -8, variance: 7 },
      nervous: { bluff: 3, dudo: 5, safe: 4, variance: 18 },
      cocky: { bluff: 14, dudo: -5, safe: -6, variance: 6 },
      confident: { bluff: 7, dudo: 5, safe: 5, variance: 3 },
      calm: { bluff: 0, dudo: 0, safe: 10, variance: 1 }
    };
    return (table[mood] || table.calm)[key] || 0;
  }
  function scoreBidOption(bid, player, roundState) {
    var risk = getBidRiskLevel(bid, player, roundState);
    var riskNum = riskToNumber(risk);
    var expected = getExpectedFaceCount(player, bid.face, roundState);
    var ownSupport = getFaceCountInOwnDice(player, bid.face, roundState);
    var style = player.playStyle || 'calm';
    var personality = player.personality || {};
    var skill = skillProfile(roundState.aiSkillLevel || getAiSkillLevel());
    var totalDice = getTotalDiceInPlay(roundState);
    var score = 80;
    score -= Math.abs(bid.quantity - expected) * 9;
    score += ownSupport * 11;
    score += bid.quantity > (roundState.currentBid ? roundState.currentBid.quantity : 0) ? 4 : 0;
    if (bid.quantity > totalDice) score -= 80;
    if (risk === 'safe') score += style === 'cautious' || style === 'calm' ? 22 : 8;
    if (risk === 'reasonable') score += 24;
    if (risk === 'risky') score += style === 'aggressive' || style === 'cocky' ? 18 : 4;
    if (risk === 'dangerous') score += style === 'aggressive' || style === 'chaotic' ? 5 : -22;
    if (risk === 'absurd') score += (style === 'chaotic' || style === 'cocky' || player.moodLevel === 'angry') ? -18 : -65;
    score += (personality.bluffing || 5) * (riskNum > 1 ? 1.8 : .4);
    score += (personality.caution || 5) * (riskNum <= 1 ? 1.8 : -1.6);
    score += moodModifier(player, 'bluff') * (riskNum >= 2 ? 1 : 0);
    score += moodModifier(player, 'safe') * (riskNum <= 1 ? 1 : 0);
    if (bid.face === 1 && !isPalafico(roundState)) score -= 3;
    if (skill.bluffControl > .8 && risk === 'absurd') score -= 35;
    score += randomBetween(-skill.noise * 10, skill.noise * 10) + moodModifier(player, 'variance') * randomBetween(-1, 1);
    return score;
  }
  function chooseBestBid(player, roundState) {
    var options = getLegalBidOptions(player, roundState).filter(function (bid) { return bid.quantity <= getTotalDiceInPlay(roundState) + 1; });
    if (!options.length) options = getLegalBidOptions(player, roundState);
    if (!options.length) return null;
    var skill = skillProfile(roundState.aiSkillLevel || getAiSkillLevel());
    var scored = options.map(function (bid) { return { bid: bid, score: scoreBidOption(bid, player, roundState) }; }).sort(function (a, b) { return b.score - a.score; });
    var top = scored.slice(0, Math.max(1, skill.topChoices));
    return top[Math.floor(Math.random() * top.length)].bid;
  }
  function dudoTolerance(player, roundState) {
    var style = player.playStyle || 'calm';
    var tolerance = { cautious: 0, calm: 1, aggressive: 2, cocky: 2, chaotic: Math.floor(randomBetween(0, 4)) }[style];
    if (tolerance == null) tolerance = 1;
    if (player.moodLevel === 'angry') tolerance -= 1;
    if (player.moodLevel === 'nervous') tolerance += Math.floor(randomBetween(-1, 4));
    if (player.moodLevel === 'confident') tolerance -= .5;
    if (player.diceCount <= 2 || getTotalDiceInPlay(roundState) <= 8) tolerance -= .5;
    return tolerance;
  }
  function shouldCallDudo(player, roundState) {
    var bid = roundState.currentBid;
    if (!bid || !window.canCallDudo || !window.canCallDudo(player, roundState)) return false;
    var expected = getExpectedFaceCount(player, bid.face, roundState);
    var tolerance = dudoTolerance(player, roundState);
    var bidder = (roundState.players || []).find(function (p) { return p.id === roundState.previousBidderId; });
    var mem = bidder ? getPlayerMemory(bidder, roundState.aiMemory) : null;
    var skill = skillProfile(roundState.aiSkillLevel || getAiSkillLevel());
    if (mem && skill.memory) tolerance -= mem.bluffRate * 1.5 * skill.memory;
    var gap = bid.quantity - expected;
    var chance = 0.04;
    if (gap > tolerance) chance += 0.42 + (gap - tolerance) * 0.16;
    if (getBidRiskLevel(bid, player, roundState) === 'absurd') chance += 0.35;
    if (player.moodLevel === 'angry') chance += 0.14;
    if (player.moodLevel === 'cocky' && getTotalDiceInPlay(roundState) > 10) chance -= 0.08;
    if (player.moodLevel === 'nervous') chance += randomBetween(-0.12, 0.18);
    chance *= skill.dudoAccuracy + .15;
    return Math.random() < clamp(chance, 0.02, 0.97);
  }
  function shouldCallCalza(player, roundState) {
    if (!window.canCallCalza || !window.canCallCalza(player, roundState)) return false;
    var bid = roundState.currentBid;
    var expected = getExpectedFaceCount(player, bid.face, roundState);
    var ownSupport = getFaceCountInOwnDice(player, bid.face, roundState);
    var skill = skillProfile(roundState.aiSkillLevel || getAiSkillLevel());
    var style = player.playStyle || 'calm';
    var closeness = Math.abs(bid.quantity - expected);
    var chance = 0;
    if (closeness <= .35) chance = .24;
    else if (closeness <= .75) chance = .12;
    else if (closeness <= 1.1) chance = .04;
    chance += ownSupport === bid.quantity ? .08 : 0;
    chance *= skill.calza;
    if (style === 'cautious') chance *= .45;
    if (style === 'cocky' || player.moodLevel === 'angry') chance *= 1.45;
    if (player.moodLevel === 'nervous') chance += .02;
    return Math.random() < clamp(chance, 0, .42);
  }
  function chooseAiAction(player, roundState) {
    roundState.aiSkillLevel = roundState.aiSkillLevel || getAiSkillLevel();
    if (shouldCallCalza(player, roundState)) return { type: 'calza' };
    if (shouldCallDudo(player, roundState)) return { type: 'dudo' };
    return { type: 'bid', bid: chooseBestBid(player, roundState) };
  }
  function chooseAIMove(player, state) { return chooseAiAction(player, state); }

  function applyAIMoodEvent(player, event) {
    if (!player || !player.ai) return;
    var roll = Math.random();
    if (event === 'lostDie') player.moodLevel = roll < .45 ? 'angry' : roll < .8 ? 'nervous' : 'calm';
    if (event === 'wonDudo') player.moodLevel = roll < .55 ? 'confident' : 'cocky';
    if (event === 'failedDudo') player.moodLevel = roll < .55 ? 'nervous' : 'angry';
    if (event === 'successfulCalza') player.moodLevel = roll < .65 ? 'cocky' : 'confident';
    if (event === 'failedCalza') player.moodLevel = roll < .55 ? 'nervous' : 'angry';
    if (event === 'mocked' && roll < .18) player.moodLevel = 'angry';
    player.mood = player.moodLevel || player.mood || 'calm';
  }
  function validateAiIntelligence() {
    var players = [
      { id: 'ai', name: 'Owl', ai: true, diceCount: 5, dice: [1, 4, 4, 2, 6], personality: { bluffing: 4, caution: 9, aggression: 4, luck: 6 }, playStyle: 'calm', moodLevel: 'calm' },
      { id: 'b', name: 'Bluffer', diceCount: 5, dice: [1, 3, 5, 6, 2] },
      { id: 'c', name: 'Raj', diceCount: 5, dice: [4, 2, 6, 3, 5] }
    ];
    var state = { players: players, currentBid: { quantity: 8, face: 4 }, previousBidderId: 'b', turnIndex: 0, aiSkillLevel: 'hard', calzaEnabled: true, aceBidsThisRound: [], aiMemory: {} };
    var expectedNormal = getExpectedFaceCount(players[0], 4, state);
    var expectedAce = getExpectedFaceCount(players[0], 1, state);
    var pal = Object.assign({}, state, { palaficoActive: true, lockedFace: 4, currentBid: { quantity: 3, face: 4 } });
    var calmBid = chooseBestBid(players[0], Object.assign({}, state, { currentBid: null }));
    var angry = Object.assign({}, players[0], { moodLevel: 'angry', playStyle: 'aggressive', personality: { bluffing: 8, caution: 2, aggression: 9, luck: 5 } });
    var cocky = Object.assign({}, players[0], { moodLevel: 'cocky', playStyle: 'cocky', personality: { bluffing: 9, caution: 3, aggression: 7, luck: 6 } });
    var nervous = Object.assign({}, players[0], { moodLevel: 'nervous', playStyle: 'chaotic', personality: { bluffing: 7, caution: 4, aggression: 5, luck: 8 } });
    var legalActions = Array.from({ length: 20 }, function () { return chooseAiAction(players[0], state); }).every(function (action) { return action.type !== 'bid' || window.isLegalBid(action.bid, state.currentBid, state, players[0]); });
    var palAction = chooseBestBid(players[0], pal);
    state.aiMemory.Bluffer = createPlayerMemory();
    state.aiMemory.Bluffer.totalBids = 10; state.aiMemory.Bluffer.failedBids = 7; refreshDerivedMemory(state.aiMemory.Bluffer);
    return {
      normalNonAceUsesTwoSixths: Math.abs(expectedNormal - (3 + 10 * (2 / 6))) < .001,
      aceUsesOneSixth: Math.abs(expectedAce - (1 + 10 * (1 / 6))) < .001,
      palaficoUsesOneSixth: Math.abs(getExpectedFaceCount(players[0], 4, pal) - (2 + 10 * (1 / 6))) < .001,
      hardRejectsAbsurd: scoreBidOption({ quantity: 14, face: 4 }, players[0], state) < scoreBidOption({ quantity: 5, face: 4 }, players[0], state),
      expertChallengesBluffers: shouldCallDudo(players[0], Object.assign({}, state, { aiSkillLevel: 'expert' })) || getBidConfidenceScore(state.currentBid, players[0], state) < 45,
      calmChoosesSaferBids: ['safe', 'reasonable', 'risky'].indexOf(getBidRiskLevel(calmBid, players[0], Object.assign({}, state, { currentBid: null }))) !== -1,
      angryChallengesMore: dudoTolerance(angry, state) <= dudoTolerance(players[0], state),
      nervousHasHigherVariance: moodModifier(nervous, 'variance') > moodModifier(players[0], 'variance'),
      cockyBluffsMore: moodModifier(cocky, 'bluff') > moodModifier(players[0], 'bluff'),
      aiNeverIllegal: legalActions,
      noIllegalPalaficoFaceChange: !palAction || window.isLegalBid(palAction, pal.currentBid, pal, players[0]),
      respectsAcesRules: !window.isLegalBid({ quantity: 1, face: 1 }, null, state, players[0]),
      aiCalzaLegalOnly: !shouldCallCalza(players[0], Object.assign({}, state, { palaficoActive: true })) && !shouldCallCalza(players[0], { players: [players[0], players[1]], currentBid: { quantity: 2, face: 4 }, previousBidderId: 'b', turnIndex: 0, calzaEnabled: true })
    };
  }

  window.PerudoAI = { generateAIPlayer: generateAIPlayer, generateAIName: generateAIName, getAvatarPersonality: getAvatarPersonality, chooseAICupColour: chooseAICupColour, applyLeaderboardPersonalityModifiers: applyLeaderboardPersonalityModifiers, getAiSkillLevel: getAiSkillLevel, setAiSkillLevel: setAiSkillLevel, loadAiMemory: loadAiMemory, saveAiMemory: saveAiMemory, createPlayerMemory: createPlayerMemory, getPlayerMemory: getPlayerMemory, recordBidMemory: recordBidMemory, updateMemoryAfterDudo: updateMemoryAfterDudo, updateMemoryAfterCalza: updateMemoryAfterCalza, getTotalDiceInPlay: getTotalDiceInPlay, getKnownDiceForPlayer: getKnownDiceForPlayer, getFaceCountInOwnDice: getFaceCountInOwnDice, getExpectedFaceCount: getExpectedFaceCount, getBidRiskLevel: getBidRiskLevel, getBidConfidenceScore: getBidConfidenceScore, getLegalBidOptions: getLegalBidOptions, scoreBidOption: scoreBidOption, chooseBestBid: chooseBestBid, shouldCallDudo: shouldCallDudo, shouldCallCalza: shouldCallCalza, chooseAiAction: chooseAiAction, chooseAIMove: chooseAIMove, applyAIMoodEvent: applyAIMoodEvent, validateAiIntelligence: validateAiIntelligence };
  Object.assign(window, window.PerudoAI);
})();
