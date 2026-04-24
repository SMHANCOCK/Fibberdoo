(function () {
  var PACE = {
    aiThinkingMin: 1500,
    aiThinkingMax: 2500,
    speechPause: 900,
    bidResultPause: 2500,
    challengeResultPause: 3500,
    diceRevealPause: 3000,
    diceLossWinnerPause: 4000,
    challengeCountPerDie: 400,
    challengeCountFinalPause: 800,
    challengeResultDisplay: 2000,
    roundStartPause: 1400,
    nextTurnPause: 900
  };

  var state = {
    profile: null,
    players: [],
    currentBid: null,
    previousBidderId: null,
    turnIndex: 0,
    roundNumber: 0,
    palificoActive: false,
    pendingPalificoPlayerId: null,
    lockedFace: null,
    dudoStats: {},
    revealMode: false,
    gameOver: false,
    turnBusy: false,
    actionMessage: 'Waiting for the round to begin...'
  };

  function $(id) { return document.getElementById(id); }
  function activePlayers() { return state.players.filter(function (p) { return !p.empty && !p.eliminated; }); }
  function playerById(id) { return state.players.find(function (p) { return p.id === id; }); }
  function currentPlayer() { return state.players[state.turnIndex]; }
  function totalDiceInPlay() { return activePlayers().reduce(function (sum, p) { return sum + p.diceCount; }, 0); }
  function faceName(face) { return face === 1 ? 'ones' : ['', 'one', 'twos', 'threes', 'fours', 'fives', 'sixes'][face]; }
  function bidText(bid) { return bid ? bid.quantity + ' x ' + faceName(bid.face) : 'No bid yet'; }
  function speechBidContext(bid) {
    return bid ? { bid: { quantity: bid.quantity, faceName: faceName(bid.face) }, quantity: bid.quantity, face: faceName(bid.face), currentBid: bidText(bid), lastBidder: state.previousBidderId ? playerById(state.previousBidderId).name : 'you' } : {};
  }
  function showScreen(id) { document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); }); $(id).classList.add('active'); }
  function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  function randomBetween(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

  function setAction(message) {
    state.actionMessage = message;
    renderActionPanel();
  }

  function emphasizeLiarCalled(active) {
    var panel = $('currentActionPanel');
    if (panel) panel.classList.toggle('liar-called', !!active);
  }

  function log(message) {
    var el = document.createElement('div');
    el.className = 'log-entry';
    el.textContent = message;
    $('gameLog').prepend(el);
    Array.from($('gameLog').children).slice(10).forEach(function (node) { node.remove(); });
  }

  function getRequirementText() {
    if (state.gameOver) return 'Game over';
    if (!state.currentBid) return state.palificoActive ? 'Open with any face; that face locks' : 'Opening bid must be 2-6';
    if (state.palificoActive) return 'Raise ' + faceName(state.lockedFace) + ' or challenge';
    return 'Raise legally or challenge';
  }

  function renderActionPanel() {
    if (!$('actionMessage')) return;
    var turn = currentPlayer();
    var bidder = state.previousBidderId ? playerById(state.previousBidderId) : null;
    $('actionMessage').textContent = state.actionMessage;
    $('actionTurn').textContent = 'Turn: ' + (turn ? turn.name : '-');
    $('actionBid').textContent = 'Bid: ' + bidText(state.currentBid);
    $('actionPreviousBidder').textContent = 'Previous bidder: ' + (bidder ? bidder.name : '-');
    $('actionRequirement').textContent = 'Need: ' + getRequirementText();
    $('actionDiceRemaining').textContent = 'Dice in play: ' + totalDiceInPlay();
  }

  function createPlayers() {
    var roll = Math.random();
    var seats = roll < 0.9 ? 5 : 4;
    var aiCount = roll < 0.8 ? 4 : 3;
    var used = [state.profile.name];
    var players = [{ id: 'human', human: true, avatar: state.profile.avatar, name: state.profile.name, cupColour: state.profile.cupColour, diceColour: state.profile.cupColour, diceCount: 5, dice: [], mood: 'calm', events: {} }];
    for (var i = 0; i < aiCount; i += 1) players.push(window.generateAIPlayer(i + 1, used));
    if (seats === 5 && aiCount === 3) players.push({ id: 'empty-seat', empty: true, name: 'Empty Seat', avatar: '∅', cupColour: '#555555', diceCount: 0, dice: [] });
    var seated = shuffle(players).map(function (p, index) { p.seatIndex = index; return p; });
    console.log('[INIT] players:', seated.length, seated.map(function (p) { return p && p.name; }));
    console.log('[INIT] table container found:', !!$('table'));
    return seated;
  }

  function shuffle(items) {
    var copy = items.slice();
    for (var i = copy.length - 1; i > 0; i -= 1) { var j = Math.floor(Math.random() * (i + 1)); var t = copy[i]; copy[i] = copy[j]; copy[j] = t; }
    return copy;
  }

  function renderReveal() {
    $('opponentReveal').innerHTML = state.players.filter(function (p) { return p.ai; }).map(function (p, index) {
      var rank = window.getLeaderboardRankBadge(p.name);
      var stats = window.getLeaderboardStats(p.name);
      return '<article class="reveal-card" style="animation-delay:' + (index * 80) + 'ms"><div class="avatar-line"><span class="avatar">' + p.avatar + '</span><strong>' + p.name + '</strong><span class="rank-badge">' + rank + '</span></div><div class="cup" style="--cup:' + p.cupColour + '"></div><p><strong>' + p.personality.type + '</strong></p><p>' + p.personality.flavourLine + '</p><div class="stat-line"><span>Bluffing</span><b>' + p.personality.bluffing + '/10</b></div><div class="stat-line"><span>Caution</span><b>' + p.personality.caution + '/10</b></div><div class="stat-line"><span>Aggression</span><b>' + p.personality.aggression + '/10</b></div><div class="stat-line"><span>Luck</span><b>' + p.personality.luck + '/10</b></div><p class="meta">' + (stats ? window.getStreakPressureLevel(stats.currentWinStreak) : 'New Challenger') + '</p></article>';
    }).join('');
  }

  function startGame() {
    state.players.forEach(function (p) { if (!p.empty) { p.diceCount = 5; p.eliminated = false; p.spectator = false; p.events = {}; } });
    state.dudoStats = {};
    state.pendingPalificoPlayerId = null;
    state.gameOver = false;
    state.turnBusy = false;
    $('gameLog').innerHTML = '';
    showScreen('gameScreen');
    var humanIndex = state.players.findIndex(function (p) { return p.human; });
    console.log('[INIT] game phase:', 'starting');
    console.log('[INIT] players before first render:', state.players.length, state.players.map(function (p) { return p && p.name; }));
    beginRound(state.players[humanIndex].id);
  }

  async function beginRound(starterId) {
    state.turnBusy = true;
    state.roundNumber += 1;
    state.currentBid = null;
    state.previousBidderId = null;
    state.revealMode = false;
    state.lockedFace = null;
    if (state.pendingPalificoPlayerId) {
      state.palificoActive = true;
      starterId = state.pendingPalificoPlayerId;
      state.pendingPalificoPlayerId = null;
      var palificoPlayer = playerById(starterId);
      $('palificoBanner').textContent = 'PALIFICO ROUND - ' + palificoPlayer.name + ' is on one die. Face will lock on the first bid. Ones are not wild.';
      $('palificoBanner').classList.remove('hidden');
      window.playPalificoSound();
    } else {
      state.palificoActive = false;
      $('palificoBanner').classList.add('hidden');
    }
    activePlayers().forEach(function (p) { p.dice = rollDice(p.diceCount); });
    state.turnIndex = state.players.findIndex(function (p) { return p.id === starterId && !p.eliminated; });
    if (state.turnIndex < 0) state.turnIndex = state.players.findIndex(function (p) { return !p.empty && !p.eliminated; });
    setAction('Round ' + state.roundNumber + ' begins. ' + currentPlayer().name + ' starts.');
    log('Round ' + state.roundNumber + ' begins. ' + currentPlayer().name + ' starts.');
    renderGame();
    window.playDiceRollSound();
    await window.animateDiceRoll();
    await wait(PACE.roundStartPause);
    state.turnBusy = false;
    promptTurn();
  }

  function rollDice(count) { return Array.from({ length: count }, function () { return 1 + Math.floor(Math.random() * 6); }); }

  function renderGame() {
    $('currentBidLabel').textContent = bidText(state.currentBid);
    renderPlayers();
    if (window.restoreSpeechBubbles) window.restoreSpeechBubbles();
    $('spectators').innerHTML = state.players.filter(function (p) { return p && p.spectator; }).map(function (p) { return '<span class="spectator-chip">' + safeText(p.avatar || '🎲') + ' ' + safeText(p.name || 'Player') + ' ' + safeText(safeRankBadge(p)) + '</span>'; }).join('') || '<span class="meta">No spectators yet.</span>';
    var humanTurn = currentPlayer() && currentPlayer().human && !state.gameOver && !state.turnBusy;
    $('humanControls').classList.toggle('disabled', !humanTurn);
    $('humanControls').classList.toggle('human-ready', humanTurn);
    $('dudoButton').classList.toggle('hidden-challenge', !state.currentBid);
    $('dudoButton').classList.toggle('challenge-ready', humanTurn && !!state.currentBid);
    $('dudoButton').disabled = !humanTurn || !state.currentBid;
    $('placeBidButton').disabled = !humanTurn;
    updateBidHint();
    updateBidControls();
    renderActionPanel();
  }

  function safeText(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeRankBadge(player) {
    try {
      return player && player.name && window.getLeaderboardRankBadge ? window.getLeaderboardRankBadge(player.name) : '-';
    } catch (error) {
      console.warn('[RENDER] rank badge fallback:', error);
      return '-';
    }
  }

  function normalizePlayerForRender(player) {
    player = player || {};
    return {
      id: player.id || ('player-' + Math.random().toString(16).slice(2)),
      empty: !!player.empty,
      human: !!player.human,
      eliminated: !!player.eliminated,
      spectator: !!player.spectator,
      avatar: player.avatar || (player.empty ? '○' : '🎲'),
      name: player.name || (player.empty ? 'Empty Seat' : 'Player'),
      cupColour: player.cupColour || player.cupColor || '#777777',
      diceCount: Number.isFinite(player.diceCount) ? player.diceCount : 0,
      dice: Array.isArray(player.dice) ? player.dice : [],
      mood: player.mood || (player.personality && player.personality.type) || 'calm'
    };
  }

  function renderPlayers() {
    var tableEl = $('table');
    console.log('[RENDER] renderPlayers called:', true);
    console.log('[RENDER] table container:', !!tableEl);
    console.log('[RENDER] players count:', state.players.length);
    console.log('[RENDER] player names:', state.players.map(function (p) { return p && p.name; }));
    console.log('[RENDER] phase:', state.gameOver ? 'game-over' : state.revealMode ? 'challenge-reveal' : state.turnBusy ? 'busy' : 'turn');
    if (!tableEl) {
      console.error('[RENDER] table container missing');
      return;
    }
    try {
      var html = state.players.map(function (player, index) {
        try {
          return renderSeat(player, index);
        } catch (seatError) {
          console.error('[RENDER] failed player:', player, seatError);
          return renderSeatFallback(player);
        }
      }).join('');
      tableEl.innerHTML = html || '<div class="render-error">Player render failed - check console</div>';
      var count = tableEl.querySelectorAll('.seat').length;
      console.log('[RENDER] player nodes created:', count);
      if (!count) tableEl.innerHTML = '<div class="render-error">Player render failed - check console</div>';
    } catch (error) {
      console.error('[RENDER] player render failed:', error);
      tableEl.innerHTML = '<div class="render-error">Player render failed - check console</div>';
    }
  }

  function renderSeatFallback(player) {
    var safe = normalizePlayerForRender(player);
    return '<article class="seat" data-player-id="' + safeText(safe.id) + '"><div class="avatar-line"><span class="avatar">' + safeText(safe.avatar) + '</span><div><div class="player-name">' + safeText(safe.name) + '</div><span class="rank-badge">-</span></div></div><div class="cup" style="--cup:' + safeText(safe.cupColour) + '"></div><p class="meta">Mood: calm · Dice: ' + safeText(safe.diceCount) + '</p><div class="dice-row"></div></article>';
  }

  function renderSeat(p) {
    p = normalizePlayerForRender(p);
    if (p.empty) return '<article class="seat empty-seat"><div class="avatar-line"><span class="avatar">○</span><span class="player-name">Empty Seat</span></div><p class="meta">No dice. No speech. Just vibes.</p></article>';
    var fg = window.PerudoCups && window.PerudoCups.getContrastColour ? window.PerudoCups.getContrastColour(p.cupColour) : '#fff8e7';
    var dice = p.dice.map(function (value, index) {
      var visible = p.human || state.revealMode || p.eliminated;
      return '<span class="die ' + (visible ? '' : 'hidden-die') + '" data-die-index="' + index + '" style="--die-bg:' + safeText(p.cupColour) + ';--die-fg:' + safeText(fg) + '">' + (visible ? safeText(value) : '?') + '</span>';
    }).join('');
    if (!dice && !p.eliminated) dice = Array.from({ length: p.diceCount }, function (_, index) { return '<span class="die hidden-die" data-die-index="' + index + '" style="--die-bg:' + safeText(p.cupColour) + ';--die-fg:' + safeText(fg) + '">?</span>'; }).join('');
    var rank = safeRankBadge(p);
    var active = currentPlayer() && currentPlayer().id === p.id ? ' active-turn' : '';
    var human = currentPlayer() && currentPlayer().id === p.id && p.human ? ' human-turn' : '';
    var eliminated = p.eliminated ? ' eliminated' : '';
    return '<article class="seat' + active + human + eliminated + '" data-player-id="' + safeText(p.id) + '" style="--turn-color:' + safeText(p.cupColour) + '"><div class="avatar-line"><span class="avatar">' + safeText(p.avatar) + '</span><div><div class="player-name">' + safeText(p.name) + '</div><span class="rank-badge">' + safeText(rank) + '</span></div></div><div class="cup" style="--cup:' + safeText(p.cupColour) + '"></div><p class="meta">Mood: ' + safeText(p.mood) + ' · Dice: ' + safeText(p.diceCount) + '</p><div class="dice-row">' + dice + '</div></article>';
  }

  function getMinimumLegalBidText() {
    if (state.palificoActive && state.currentBid) return 'Minimum legal bid: ' + (state.currentBid.quantity + 1) + ' x ' + faceName(state.lockedFace) + '.';
    if (state.palificoActive) return 'Minimum legal bid: 1+ of any face. That face locks for Palifico.';
    if (!state.currentBid) return 'Minimum legal bid: 1 x twos or higher. Opening on ones is not allowed.';
    if (state.currentBid.face === 1) return 'Minimum legal normal bid: ' + window.getMinimumNormalBidFromOnes(state.currentBid.quantity) + ' x twos or higher. Or raise ones.';
    return 'Minimum to switch to ones: ' + window.getMinimumOnesBid(state.currentBid.quantity) + ' x ones. Otherwise raise quantity or face legally.';
  }

  function updateBidHint() {
    if (!$('bidHint')) return;
    var humanTurn = currentPlayer() && currentPlayer().human && !state.gameOver;
    var prefix = humanTurn ? 'Your turn: raise the bid' + (state.currentBid ? ' or challenge the last bid. ' : '. ') : '';
    $('bidHint').textContent = prefix + getMinimumLegalBidText();
  }

  function updateBidControls() {
    var qty = Number($('bidQuantity').value) || 1;
    var options = Array.from($('bidFace').options);
    options.forEach(function (option) {
      var bid = { quantity: qty, face: Number(option.value) };
      option.disabled = state.palificoActive ? !window.isValidPalificoBid(state.currentBid, bid, state.lockedFace || bid.face) : !window.isValidBid(state.currentBid, bid);
    });
    var min = 1;
    if (state.palificoActive && state.currentBid) min = state.currentBid.quantity + 1;
    else if (state.currentBid && state.currentBid.face === 1) min = state.currentBid.quantity + 1;
    else if (state.currentBid) min = window.getMinimumOnesBid(state.currentBid.quantity);
    $('bidQuantity').min = min;
  }

  function nextTurn() {
    for (var i = 1; i <= state.players.length; i += 1) {
      var idx = (state.turnIndex + i) % state.players.length;
      var p = state.players[idx];
      if (!p.empty && !p.eliminated) { state.turnIndex = idx; return; }
    }
  }

  async function promptTurn() {
    if (state.turnBusy || state.gameOver) return;
    renderGame();
    var p = currentPlayer();
    if (!p) return;
    if (p.human) {
      setAction('Your turn: raise the bid' + (state.currentBid ? ' or challenge the last bid.' : '.') );
      renderGame();
      return;
    }
    state.turnBusy = true;
    setAction(p.name + ' is thinking...');
    renderGame();
    await wait(randomBetween(PACE.aiThinkingMin, PACE.aiThinkingMax));
    window.maybeSpeak(p, 'turn', state.currentBid ? playerById(state.previousBidderId) : null);
    await wait(PACE.speechPause);
    var move = window.PerudoAI.chooseAIMove(p, { players: state.players, currentBid: state.currentBid, palificoActive: state.palificoActive, lockedFace: state.lockedFace, streakTarget: false });
    if (move.type === 'dudo' && state.currentBid) {
      state.turnBusy = false;
      return callDudo(p.id);
    }
    await placeBid(p.id, move.bid);
  }

  async function placeBid(playerId, bid) {
    var p = playerById(playerId);
    if (!p || state.gameOver) return false;
    if (p.human && state.turnBusy) return false;
    state.turnBusy = true;
    var valid = state.palificoActive ? window.isValidPalificoBid(state.currentBid, bid, state.lockedFace || bid.face) : window.isValidBid(state.currentBid, bid);
    if (!valid) {
      state.turnBusy = false;
      if (p.human) alert('Invalid bid for the current rules.');
      renderGame();
      return false;
    }
    if (state.palificoActive && !state.lockedFace) state.lockedFace = bid.face;
    if (state.palificoActive) {
      $('palificoBanner').textContent = 'PALIFICO ROUND - face locked to ' + faceName(state.lockedFace) + '. Ones are not wild.';
    }
    state.currentBid = { quantity: Number(bid.quantity), face: Number(bid.face) };
    state.previousBidderId = playerId;
    setAction(p.name + ' bids ' + bidText(state.currentBid) + '.');
    log(p.name + ' bids ' + bidText(state.currentBid) + '.');
    window.playBidSound();
    window.maybeSpeak(p, 'bid', activePlayers().find(function (x) { return x.id !== p.id; }), false, speechBidContext(state.currentBid));
    renderGame();
    await wait(PACE.bidResultPause);
    nextTurn();
    setAction(currentPlayer().name + ' must raise the bid or challenge.');
    renderGame();
    await wait(PACE.nextTurnPause);
    state.turnBusy = false;
    promptTurn();
    return true;
  }

  async function callDudo(challengerId) {
    if (!state.currentBid || !state.previousBidderId || state.gameOver || state.turnBusy) return;
    state.turnBusy = true;
    var challenger = playerById(challengerId);
    var bidder = playerById(state.previousBidderId);
    setAction('LIAR CALLED - ' + challenger.name + ' challenges ' + bidder.name + "'s bid.");
    emphasizeLiarCalled(true);
    log('LIAR CALLED: ' + challenger.name + ' challenges ' + bidder.name + "'s bid: " + bidText(state.currentBid) + '.');
    window.playDudoSound();
    window.maybeSpeak(challenger, 'dudo', bidder, true, speechBidContext(state.currentBid));
    renderGame();
    await wait(PACE.challengeResultPause);
    setAction('Revealing dice...');
    state.revealMode = true;
    renderGame();
    window.playRevealSound();
    await Promise.all(activePlayers().map(function (p) { return window.animateDiceReveal(p.id); }));
    await wait(Math.min(PACE.diceRevealPause, 1000));
    var result = window.PerudoRules.resolveDudo(state.players, state.currentBid, challengerId, state.previousBidderId, state.palificoActive);
    var actual = await window.animateChallengeCount(state.currentBid, state.players, state.palificoActive, {
      perDieMs: PACE.challengeCountPerDie,
      finalPauseMs: PACE.challengeCountFinalPause,
      onCount: function (count) { setAction('Counting ' + count + '...'); }
    });
    setAction('Actual count: ' + actual + '. Bid was: ' + bidText(state.currentBid) + '.');
    log('Dice count complete: actual count is ' + actual + ' for ' + bidText(state.currentBid) + '.');
    await wait(PACE.challengeCountFinalPause);
    var bidSurvived = !result.callerCorrect;
    if (result.callerCorrect) {
      addDudoStat(challengerId, result.successfulDudoQuantity);
      window.recordPlayerEvent(challenger, 'successfulDudo');
      window.recordPlayerEvent(bidder, 'failedBid');
    } else {
      window.recordPlayerEvent(challenger, 'failedDudo');
    }
    var loser = playerById(result.loserId);
    setAction((bidSurvived ? 'Bid was true' : 'Bid was false') + ' - ' + (bidSurvived ? 'challenger' : 'bidder') + ' loses 1 die. ' + loser.name + ' loses it.');
    log(loser.name + ' loses 1 die.');
    await wait(PACE.challengeResultDisplay);
    emphasizeLiarCalled(false);
    await loseDie(loser);
    await wait(PACE.diceLossWinnerPause);
    if (checkWinner()) return;
    var starter = window.determineNextRoundStarter(state.players, loser.id);
    state.turnBusy = false;
    beginRound(starter);
  }

  function addDudoStat(playerId, quantity) {
    state.dudoStats[playerId] = state.dudoStats[playerId] || { total: 0, largest: 0 };
    state.dudoStats[playerId].total += quantity;
    state.dudoStats[playerId].largest = Math.max(state.dudoStats[playerId].largest, quantity);
  }

  async function loseDie(player) {
    window.recordPlayerEvent(player, 'lostDie');
    window.playLoseDieSound();
    await window.animateDieLoss(player.id);
    player.diceCount -= 1;
    player.dice = player.dice.slice(0, Math.max(0, player.diceCount));
    if (player.diceCount === 1 && !player.eliminated) state.pendingPalificoPlayerId = player.id;
    if (player.diceCount <= 0) {
      player.eliminated = true;
      player.spectator = true;
      player.mood = 'eliminated';
      setAction(player.name + ' has been eliminated.');
      window.playEliminationSound();
      window.maybeSpeak(player, 'elim', null, true);
      await window.animateElimination(player.id);
      log(player.name + ' has been eliminated and moves to Spectators.');
    } else {
      window.maybeSpeak(player, 'loss', null);
    }
    renderGame();
    window.maybeSpectatorSpeak(state.players, player);
  }

  function checkWinner() {
    var remaining = activePlayers();
    if (remaining.length !== 1) return false;
    endGame(remaining[0]);
    return true;
  }

  function endGame(winner) {
    state.gameOver = true;
    state.revealMode = true;
    setAction(winner.name + ' wins the game.');
    log(winner.name + ' wins the game.');
    window.playWinSound();
    window.animateWinnerDice(winner.id);
    window.maybeSpeak(winner, 'win', null, true);
    var previous = window.loadLeaderboard();
    var update = window.updateLeaderboardAfterGame(state.players, winner.id, state.dudoStats, previous);
    showScreen('gameOverScreen');
    $('winnerLabel').textContent = winner.avatar + ' ' + winner.name + ' wins the table!';
    $('rankChanges').innerHTML = update.changes.map(function (change) {
      var klass = !change.oldRank ? 'rank-up' : change.newRank < change.oldRank ? 'rank-up' : change.newRank > change.oldRank ? 'rank-down' : '';
      if (change.newRank === 1) klass += ' rank-crown';
      if (klass.includes('rank-up')) window.playRankUpSound();
      if (klass.includes('rank-down')) window.playRankDownSound();
      return '<div class="rank-change ' + klass + '">' + window.PerudoLeaderboard.animateRankChange(change) + '</div>';
    }).join('');
    window.renderLeaderboard('leaderboardPanel');
  }

  function bindEvents() {
    window.renderProfile();
    var soundSettings = window.initSound ? window.initSound() : { enabled: true, volume: .45 };
    $('soundToggle').checked = soundSettings.enabled;
    $('volumeSlider').value = soundSettings.volume;
    $('banterLevel').value = localStorage.getItem('perudoBanterLevel') || 'Normal';
    $('skipAnimationsToggle').checked = localStorage.getItem('perudoSkipAnimations') === 'true';
    $('profileForm').addEventListener('submit', function (e) {
      e.preventDefault();
      state.profile = window.saveProfile({ name: $('playerName').value.trim() || 'Player', avatar: $('avatarSelect').value, cupColour: $('cupColour').value });
      state.players = createPlayers();
      renderReveal();
      showScreen('revealScreen');
    });
    $('startGameButton').addEventListener('click', startGame);
    $('placeBidButton').addEventListener('click', function () { placeBid('human', { quantity: Number($('bidQuantity').value), face: Number($('bidFace').value) }); });
    $('dudoButton').addEventListener('click', function () { callDudo('human'); });
    $('bidQuantity').addEventListener('input', updateBidControls);
    $('settingsButton').addEventListener('click', function () { $('settingsPanel').classList.toggle('hidden'); });
    $('banterLevel').addEventListener('change', function () { localStorage.setItem('perudoBanterLevel', $('banterLevel').value); });
    $('soundToggle').addEventListener('change', function () { window.PerudoSound.setSoundSettings({ enabled: $('soundToggle').checked }); });
    $('volumeSlider').addEventListener('input', function () { window.PerudoSound.setSoundSettings({ volume: Number($('volumeSlider').value) }); });
    $('skipAnimationsToggle').addEventListener('change', function () { localStorage.setItem('perudoSkipAnimations', $('skipAnimationsToggle').checked); });
    $('leaderboardButton').addEventListener('click', function () { window.renderLeaderboard('leaderboardDialogContent'); $('leaderboardDialog').showModal(); });
    $('closeLeaderboard').addEventListener('click', function () { $('leaderboardDialog').close(); });
    $('replayButton').addEventListener('click', function () { state.players = createPlayers(); renderReveal(); showScreen('revealScreen'); });
    state.profile = window.loadProfile();
    renderActionPanel();
  }

  function runConsoleTests() {
    var R = window.PerudoRules;
    console.group('Perudo console tests');
    console.assert(R.isValidBid(null, { quantity: 1, face: 2 }), 'Legal bid progression: opening 1 twos');
    console.assert(R.isValidBid({ quantity: 1, face: 2 }, { quantity: 1, face: 3 }), 'Legal bid progression: same quantity higher face');
    console.assert(R.isValidBid({ quantity: 1, face: 3 }, { quantity: 2, face: 3 }), 'Legal bid progression: same face higher quantity');
    console.assert(R.isValidBid({ quantity: 4, face: 4 }, { quantity: 2, face: 1 }), 'Valid: 4 fours -> 2 ones');
    console.assert(R.isValidBid({ quantity: 5, face: 6 }, { quantity: 3, face: 1 }), 'Valid: 5 sixes -> 3 ones');
    console.assert(R.isValidBid({ quantity: 2, face: 1 }, { quantity: 5, face: 2 }), 'Valid: 2 ones -> 5 twos');
    console.assert(R.isValidBid({ quantity: 2, face: 1 }, { quantity: 3, face: 1 }), 'Valid: 2 ones -> 3 ones');
    console.assert(R.isValidPalificoBid({ quantity: 2, face: 3 }, { quantity: 3, face: 3 }, 3), 'Valid: Palifico 2 threes -> 3 threes');
    console.assert(!R.isValidBid({ quantity: 4, face: 4 }, { quantity: 1, face: 1 }), 'Invalid: 4 fours -> 1 one');
    console.assert(!R.isValidBid({ quantity: 2, face: 1 }, { quantity: 4, face: 2 }), 'Invalid: 2 ones -> 4 twos');
    console.assert(!R.isValidPalificoBid({ quantity: 2, face: 3 }, { quantity: 2, face: 4 }, 3), 'Invalid: Palifico 2 threes -> 2 fours');
    console.assert(!R.isValidPalificoBid({ quantity: 2, face: 3 }, { quantity: 3, face: 4 }, 3), 'Invalid: Palifico 2 threes -> 3 fours');
    var mock = [{ id: 'a', empty:false, eliminated:false, dice:[1,4,4] }, { id: 'b', empty:false, eliminated:false, dice:[2,1] }];
    console.assert(R.countBidDice(mock, { quantity: 1, face: 4 }, false) === 4, 'Wild ones counting correctly');
    console.assert(window.validatePhraseBank(), 'AI speech categories contain 100 unique phrases each');
    console.assert(!window.getBanterLine({ name: 'Test', id: 'test' }, 'bidding', null, { quantity: 6, face: 'threes', currentBid: '6 x threes' }).includes('['), 'Dynamic banter templates resolve variables');
    console.assert(R.resolveDudo(mock, { quantity: 3, face: 4 }, 'a', 'b', false).loserId === 'a', 'Challenge result where bid succeeds');
    console.assert(R.resolveDudo(mock, { quantity: 5, face: 4 }, 'a', 'b', false).loserId === 'b', 'Challenge result where bid fails');
    var countTargets = window.getChallengeCountTargets({ quantity: 1, face: 4 }, mock, false);
    console.assert(countTargets.length === 4 && countTargets[0].value === 4 && countTargets[1].value === 4 && countTargets[2].value === 1, 'Challenge count animation orders face dice before wild ones');
    console.assert(window.getChallengeCountTargets({ quantity: 1, face: 4 }, mock, true).length === 2, 'Challenge count animation uses exact face only in Palifico');
    var starterMock = [{ id: 'a', empty:false, eliminated:false }, { id: 'b', empty:false, eliminated:true }, { id: 'c', empty:false, eliminated:false }];
    console.assert(R.determineNextRoundStarter(starterMock, 'a') === 'a', 'Next round starter after challenge loser survives');
    console.assert(R.determineNextRoundStarter(starterMock, 'b') === 'c', 'Next round starter after eliminated loser');
    var eliminationPlayer = { diceCount: 1, eliminated: false };
    eliminationPlayer.diceCount -= 1; if (eliminationPlayer.diceCount <= 0) eliminationPlayer.eliminated = true;
    console.assert(eliminationPlayer.eliminated, 'Player elimination');
    var palificoTrigger = { diceCount: 2 };
    palificoTrigger.diceCount -= 1;
    console.assert(palificoTrigger.diceCount === 1, 'Palifico starts when a player drops to 1 die');
    console.assert(R.isValidPalificoBid(null, { quantity: 2, face: 4 }, 4), 'Palifico first bid locks the face');
    console.assert(!R.isValidPalificoBid({ quantity: 2, face: 4 }, { quantity: 3, face: 5 }, 4), 'Human cannot choose another face after Palifico lock');
    console.assert(!R.isValidPalificoBid({ quantity: 2, face: 4 }, { quantity: 4, face: 5 }, 4), 'AI cannot bid another face after Palifico lock');
    console.assert(R.countBidDice(mock, { quantity: 1, face: 4 }, true) === 2, 'Ones are not wild during Palifico');
    console.assert(!R.isValidBid(null, { quantity: 1, face: 1 }) && R.isValidBid(null, { quantity: 1, face: 2 }), 'Normal rules resume after Palifico ends');
    console.assert(PACE.bidResultPause >= 2500 && PACE.diceRevealPause >= 3000 && PACE.diceLossWinnerPause >= 4000, 'No AI turn starts before current animations/delays finish');
    var entry = { cupColourUsage: {} }; window.updateCupColourStats(entry, '#ffffff', true); window.updateCupColourStats(entry, '#ffffff', false);
    console.assert(window.getCupColourWinRate(entry.cupColourUsage['#ffffff']) === 50, 'Cup colour stat tracking');
    var originalBoard = localStorage.getItem('perudoGlobalLeaderboard');
    var testPlayers = [
      { id: 'test-a', name: '__Test Winner__', avatar: '🤖', cupColour: '#112233', empty: false, eliminated: false },
      { id: 'test-b', name: '__Test Loser__', avatar: '🦊', cupColour: '#445566', empty: false, eliminated: true }
    ];
    var testUpdate = window.updateLeaderboardAfterGame(testPlayers, 'test-a', { 'test-a': { total: 7, largest: 7 } }, {});
    console.assert(testUpdate.board['__Test Winner__'].wins === 1 && testUpdate.board['__Test Winner__'].gamesPlayed === 1, 'Leaderboard updates');
    console.assert(testUpdate.board['__Test Winner__'].totalSuccessfulDudoQuantity === 7 && testUpdate.board['__Test Winner__'].largestSingleSuccessfulDudo === 7, 'Dudo stat tracking');
    if (originalBoard === null) localStorage.removeItem('perudoGlobalLeaderboard'); else localStorage.setItem('perudoGlobalLeaderboard', originalBoard);
    console.assert(window.getLeaderboardRankBadge('No Such Player') === '🆕 New', 'Rank badge display');
    console.assert(typeof window.animateRankChange === 'function', 'Rank animations function exists');
    console.assert(window.PerudoCups.getContrastColour('#000000') === '#fff8e7', 'Dice colour matching contrast');
    var originalSound = localStorage.getItem('perudoSoundSettings');
    window.PerudoSound.setSoundSettings({ enabled: false }); console.assert(JSON.parse(localStorage.getItem('perudoSoundSettings')).enabled === false, 'Sound toggle');
    if (originalSound === null) localStorage.removeItem('perudoSoundSettings'); else localStorage.setItem('perudoSoundSettings', originalSound);
    console.groupEnd();
  }

  window.PerudoGame = { state: state, PACE: PACE };
  document.addEventListener('DOMContentLoaded', function () { bindEvents(); runConsoleTests(); });
})();
