(function () {
  var namePools = {
    '🐺': ['Wolfgang', 'Lone Wolf Leo', 'Howler Harry'], '😈': ['Devil Dave', 'Inferno Ian', 'Sinister Sam'], '🦊': ['Cunning Charlie', 'Sneaky Fox Fred', 'Foxy Frank'], '🤖': ['Robo Rick', 'Circuit Steve', 'Byte Bot Ben'], '🦥': ['Lazy Larry', 'Slowpoke Sam', 'Chill Charlie'], '🦈': ['Sharky Shaun', 'Finley Blue', 'Reef Rob'], '🦄': ['Prism Pat', 'Glitter Gwen', 'Rainbow Rae']
  };
  var avatars = Object.keys(namePools);
  var defaultColours = { '😈': '#a31522', '🐺': '#777f86', '🦊': '#e46f25', '🤖': '#8fa3ad', '🦥': '#817044', '🦈': '#55798d', '🦄': '#ff82c8' };
  function generateAIName(avatar, usedNames) {
    var pool = namePools[avatar] || ['Dice Dana', 'Cup Casey', 'Bluff Blake'];
    var available = pool.filter(function (name) { return !usedNames.includes(name); });
    return (available[0] || pool[Math.floor(Math.random() * pool.length)] + ' ' + Math.floor(Math.random() * 9));
  }
  function getAvatarPersonality(avatar) {
    var map = {
      '😈': ['Infernal Bluffer', 9, 3, 9, 5, 'Smiles like the dice owe rent.'],
      '🐺': ['Pack Hunter', 7, 5, 8, 6, 'Trusts instinct, mistrusts everyone.'],
      '🦊': ['Clever Trickster', 8, 6, 7, 7, 'Every bid has a little tail on it.'],
      '🤖': ['Probability Gremlin', 4, 8, 5, 6, 'Calculates loudly, panics quietly.'],
      '🦥': ['Sleepy Sandbagger', 5, 9, 3, 8, 'Looks harmless until the cup lifts.'],
      '🦈': ['Table Predator', 6, 4, 9, 6, 'Circles weak bids with dental confidence.'],
      '🦄': ['Chaos Sparkle', 8, 4, 6, 9, 'Runs on glitter and unlikely calls.']
    };
    var p = map[avatar] || ['Mystery Guest', 5, 5, 5, 5, 'A puzzle wearing a cup.'];
    return { type: p[0], bluffing: p[1], caution: p[2], aggression: p[3], luck: p[4], flavourLine: p[5] };
  }
  function chooseAICupColour(avatar, name) {
    var stats = window.getLeaderboardStats ? window.getLeaderboardStats(name) : null;
    if (stats && stats.bestPerformingCupColour && stats.bestPerformingCupColour !== 'None' && Math.random() < 0.35) return stats.bestPerformingCupColour;
    if (stats && stats.currentWinStreak === 0 && stats.gamesPlayed > 2 && Math.random() < 0.25) return defaultColours[avatar] || '#888888';
    return defaultColours[avatar] || '#888888';
  }
  function applyLeaderboardPersonalityModifiers(ai) {
    var stats = window.getLeaderboardStats ? window.getLeaderboardStats(ai.name) : null;
    if (!stats) return ai;
    var pressure = window.getStreakPressureLevel(stats.currentWinStreak);
    ai.winStreakStatus = pressure === 'None' ? 'No streak' : pressure;
    if (stats.currentWinStreak >= 2) ai.personality.aggression = Math.min(10, ai.personality.aggression + 1);
    if (stats.gamesPlayed && stats.wins === 0) ai.personality.caution = Math.min(10, ai.personality.caution + 1);
    return ai;
  }
  function generateAIPlayer(index, usedNames) {
    var avatar = avatars[Math.floor(Math.random() * avatars.length)];
    var name = generateAIName(avatar, usedNames);
    usedNames.push(name);
    var personality = getAvatarPersonality(avatar);
    var ai = { id: 'ai-' + index + '-' + Date.now(), ai: true, avatar: avatar, name: name, personality: personality, mood: 'calm', cupColour: chooseAICupColour(avatar, name), diceCount: 5, dice: [], events: {}, winStreakStatus: 'New Challenger' };
    return applyLeaderboardPersonalityModifiers(ai);
  }
  function estimateBidCount(player, face, totalDice, palifico) {
    var own = player.dice.filter(function (v) { return palifico ? v === face : (face === 1 ? v === 1 : v === face || v === 1); }).length;
    var unknown = totalDice - player.dice.length;
    var chance = palifico || face === 1 ? 1 / 6 : 2 / 6;
    return own + unknown * chance;
  }
  function chooseAIMove(player, state) {
    var totalDice = state.players.filter(function (p) { return !p.empty && !p.eliminated; }).reduce(function (sum, p) { return sum + p.diceCount; }, 0);
    if (state.currentBid) {
      var estimate = estimateBidCount(player, state.currentBid.face, totalDice, state.palificoActive);
      var pressure = player.personality.aggression + (state.streakTarget ? 1 : 0) - player.personality.caution;
      var dudoChance = estimate + (pressure * 0.08) < state.currentBid.quantity ? 0.78 : 0.12 + player.personality.aggression * 0.025;
      if (Math.random() < dudoChance) return { type: 'dudo' };
    }
    return { type: 'bid', bid: chooseLegalBid(player, state, totalDice) };
  }
  function chooseLegalBid(player, state, totalDice) {
    var previous = state.currentBid;
    var locked = state.lockedFace;
    var candidates = [];
    for (var q = 1; q <= totalDice + 5; q += 1) {
      for (var f = 1; f <= 6; f += 1) {
        var bid = { quantity: q, face: f };
        var ok = state.palificoActive ? window.isValidPalificoBid(previous, bid, locked || f) : window.isValidBid(previous, bid);
        if (ok) candidates.push(bid);
      }
    }
    candidates.sort(function (a, b) { return a.quantity - b.quantity || a.face - b.face; });
    var risk = Math.max(0, player.personality.bluffing - player.personality.caution);
    return candidates[Math.min(candidates.length - 1, Math.floor(Math.random() * (2 + risk)))];
  }
  window.PerudoAI = { generateAIPlayer: generateAIPlayer, generateAIName: generateAIName, getAvatarPersonality: getAvatarPersonality, chooseAICupColour: chooseAICupColour, applyLeaderboardPersonalityModifiers: applyLeaderboardPersonalityModifiers, chooseAIMove: chooseAIMove };
  Object.assign(window, window.PerudoAI);
})();
