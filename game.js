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
    tableReactionInitialPause: 800,
    tableReactionMinGap: 1000,
    tableReactionMaxGap: 1500,
    calzaShout: 2600,
    palaficoAnticipationMin: 3500,
    palaficoAnticipationMax: 5000,
    palaficoRoundBanner: 3000,
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
    palaficoPlayerId: null,
    lockedFace: null,
    aceBidsThisRound: [],
    calzaEnabled: false,
    aiSkillLevel: 'hard',
    aiMemory: {},
    dudoStats: {},
    revealMode: false,
    gameOver: false,
    turnBusy: false,
    calzaWindowOpen: false,
    quantityInputTouched: false,
    bidInputContextKey: '',
    actionMessage: 'Waiting for the round to begin...'
  };

  function $(id) { return document.getElementById(id); }
  function activePlayers() { return window.PerudoRules.getActivePlayers(state.players); }
  function playerById(id) { return state.players.find(function (p) { return p.id === id; }); }
  function currentPlayer() { return state.players[state.turnIndex]; }
  function totalDiceInPlay() { return activePlayers().reduce(function (sum, p) { return sum + p.diceCount; }, 0); }
  function faceName(face) { return face === 1 ? 'aces' : ['', 'one', 'twos', 'threes', 'fours', 'fives', 'sixes'][face]; }
  function bidText(bid) { return bid ? bid.quantity + ' x ' + faceName(bid.face) : 'No bid yet'; }
  function selectedBidFace() {
    var faceEl = $('bidFace');
    return faceEl ? Number(faceEl.value) || 2 : 2;
  }
  function speechBidContext(bid) {
    return bid ? { bid: { quantity: bid.quantity, faceName: faceName(bid.face) }, quantity: bid.quantity, face: faceName(bid.face), currentBid: bidText(bid), lastBidder: state.previousBidderId ? playerById(state.previousBidderId).name : 'you' } : {};
  }
  function showScreen(id) { document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); }); $(id).classList.add('active'); }
  function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  function randomBetween(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
  function peekNextPlayer() {
    for (var i = 1; i <= state.players.length; i += 1) {
      var idx = (state.turnIndex + i) % state.players.length;
      var p = state.players[idx];
      if (p && !p.empty && !p.eliminated) return p;
    }
    return null;
  }
  function makeRoundState() {
    return {
      players: state.players,
      currentBid: state.currentBid,
      previousBidderId: state.previousBidderId,
      turnIndex: state.turnIndex,
      palaficoActive: state.palificoActive,
      palificoActive: state.palificoActive,
      palaficoPlayerId: state.palaficoPlayerId,
      lockedFace: state.lockedFace,
      aceBidsThisRound: state.aceBidsThisRound,
      calzaEnabled: state.calzaEnabled,
      aiSkillLevel: state.aiSkillLevel,
      aiMemory: state.aiMemory
    };
  }

  function setAction(message) {
    state.actionMessage = message;
    renderActionPanel();
  }

  function emphasizeLiarCalled(active) {
    var panel = $('currentActionPanel');
    if (panel) panel.classList.toggle('liar-called', !!active);
  }

  function showBigShout(player, text, duration) {
    if (!player) return Promise.resolve(false);
    var seat = document.querySelector('[data-player-id="' + player.id + '"]');
    if (!seat) return Promise.resolve(false);
    var old = seat.querySelector('.shout-bubble');
    if (old) old.remove();
    var bubble = document.createElement('div');
    bubble.className = 'shout-bubble';
    bubble.textContent = text;
    seat.appendChild(bubble);
    setTimeout(function () { if (bubble.parentNode) bubble.remove(); }, duration || 2700);
    return wait(duration || 2700).then(function () { return true; });
  }

  function shouldTriggerPalaficoAnnouncement(player, roundState) {
    return !!(player && player.diceCount === 1 && !player.eliminated && !player.palaficoUsed && window.shouldStartPalafico(player, roundState));
  }

  async function runCalzaShout(player) {
    setAction(player.name + ' calls CALZA!');
    if (window.playDudoSound) window.playDudoSound();
    await showBigShout(player, 'CALZA!', PACE.calzaShout);
    return true;
  }

  async function runPalaficoAnticipationSequence(player) {
    var shouts = ['PALAFICO!', 'PALAFICO ROUND!', 'One die left!', 'Here we go, Palafico!', 'No wild aces now!'];
    var speakers = activePlayers().filter(function (p) { return p.id !== player.id; });
    if (!speakers.length) speakers = [player];
    var count = Math.min(4, Math.max(2, speakers.length));
    var total = randomBetween(PACE.palaficoAnticipationMin, PACE.palaficoAnticipationMax);
    var gap = total / count;
    setAction(player.name + ' is down to one die. PALAFICO is coming!');
    for (var i = 0; i < count; i += 1) {
      var speaker = speakers[i % speakers.length];
      showBigShout(speaker, shouts[i % shouts.length], 2600);
      if (i < count - 1) await wait(gap);
    }
    await wait(900);
    return true;
  }

  async function runPalaficoRoundStartBanner(player) {
    var existing = document.querySelector('.palafico-round-banner');
    if (existing) existing.remove();
    var banner = document.createElement('div');
    banner.className = 'palafico-round-banner';
    banner.innerHTML = '<strong>PALAFICO ROUND</strong><span>' + safeText(player.name) + ' is Palafico - face will lock after the first bid.</span><span>Aces are not wild in Palafico.</span>';
    var panel = $('currentActionPanel');
    if (panel && panel.parentNode) panel.parentNode.insertBefore(banner, panel);
    setAction('PALAFICO ROUND - ' + player.name + ' is Palafico. Face will lock after the first bid.');
    renderGame();
    var seat = document.querySelector('[data-player-id="' + player.id + '"]');
    if (seat) seat.classList.add('palafico-focus');
    await wait(PACE.palaficoRoundBanner);
    if (banner.parentNode) banner.remove();
    if (seat) seat.classList.remove('palafico-focus');
    return true;
  }

  function log(message) {
    var el = document.createElement('div');
    el.className = 'log-entry';
    el.textContent = message;
    $('gameLog').prepend(el);
    Array.from($('gameLog').children).slice(10).forEach(function (node) { node.remove(); });
  }

  async function runTableTalk(event, context) {
    if (!window.getTableReactions || !window.showSpeechBubble) return;
    context = context || {};
    var reactions = window.getTableReactions(event, state.players, context);
    if (!reactions.length) return;
    await wait(PACE.tableReactionInitialPause);
    for (var i = 0; i < reactions.length; i += 1) {
      window.showSpeechBubble(reactions[i].speaker.id, reactions[i].line);
      if (i < reactions.length - 1) await wait(randomBetween(PACE.tableReactionMinGap, PACE.tableReactionMaxGap));
    }
    await wait(PACE.tableReactionMinGap);
  }

  async function maybeAiCalzaWindow() {
    if (!state.calzaEnabled || !state.currentBid || !state.calzaWindowOpen) return false;
    var candidates = activePlayers().filter(function (p) {
      return p.ai && window.getCalzaStatus(p, makeRoundState()).allowed;
    });
    for (var i = 0; i < candidates.length; i += 1) {
      if (window.shouldCallCalza && window.shouldCallCalza(candidates[i], makeRoundState())) {
        await wait(600);
        if (!state.calzaWindowOpen) return true;
        await callCalza(candidates[i].id);
        return true;
      }
    }
    return false;
  }

  function makeTalkContext(actor, bid, extra) {
    var diceInPlay = totalDiceInPlay();
    var previousBid = extra && extra.previousBid;
    var aiRisk = window.getBidRiskLevel ? window.getBidRiskLevel(bid || state.currentBid, actor || currentPlayer(), makeRoundState()) : 'reasonable';
    var risk = { safe: 'low', reasonable: 'medium', risky: 'high', dangerous: 'high', absurd: 'absurd' }[aiRisk] || 'medium';
    return Object.assign({
      playerName: actor && actor.name,
      bidder: actor,
      target: actor,
      caller: actor,
      nextPlayer: peekNextPlayer(),
      bid: bid || state.currentBid,
      quantity: bid && bid.quantity,
      face: bid && faceName(bid.face),
      currentBid: bidText(bid || state.currentBid),
      lastBidder: actor && actor.name,
      diceInPlay: diceInPlay,
      risk: risk,
      aiRisk: aiRisk
    }, extra || {});
  }

  function getRequirementText() {
    if (state.gameOver) return 'Game over';
    if (!state.currentBid) return state.palificoActive ? 'PALAFICO: open face locks; aces only for Palafico player' : 'Opening bid must be 2-6';
    if (state.palificoActive) return 'ACES ARE NOT WILD; raise ' + faceName(state.lockedFace) + ' or challenge';
    return 'Raise legally or challenge';
  }

  function renderActionPanel() {
    if (!$('actionMessage')) return;
    var turn = currentPlayer();
    var bidder = state.previousBidderId ? playerById(state.previousBidderId) : null;
    $('actionMessage').textContent = state.actionMessage;
    if ($('actionRound')) $('actionRound').textContent = 'Round ' + state.roundNumber;
    $('actionTurn').textContent = 'Turn: ' + (turn ? turn.name + (turn.ai ? ' (' + (turn.moodLevel || turn.mood || 'calm') + ')' : '') : '-');
    $('actionBid').textContent = 'Bid: ' + bidText(state.currentBid);
    $('actionPreviousBidder').textContent = 'Previous bidder: ' + (bidder ? bidder.name : '-');
    var calzaStatus = state.calzaEnabled && window.getCalzaStatus ? getHumanCalzaUiStatus(playerById('human')) : null;
    $('actionRequirement').textContent = 'Need: ' + getRequirementText() + (calzaStatus ? ' | Calza: ' + (calzaStatus.allowed ? 'available' : calzaStatus.reason) : '');
    $('actionDiceRemaining').textContent = 'Dice in play: ' + totalDiceInPlay();
  }

  function createPlayers() {
    var roll = Math.random();
    var seats = roll < 0.9 ? 5 : 4;
    var aiCount = roll < 0.8 ? 4 : 3;
    var used = [state.profile.name];
    var players = [{ id: 'human', human: true, avatar: state.profile.avatar, name: state.profile.name, cupColour: state.profile.cupColour, diceColour: state.profile.cupColour, diceCount: 5, dice: [], mood: 'calm', events: {}, palaficoUsed: false }];
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
    state.players.forEach(function (p) { if (!p.empty) { p.diceCount = 5; p.eliminated = false; p.spectator = false; p.events = {}; p.palaficoUsed = false; } });
    state.dudoStats = {};
    state.pendingPalificoPlayerId = null;
    state.palaficoPlayerId = null;
    state.aceBidsThisRound = [];
    state.aiSkillLevel = window.getAiSkillLevel ? window.getAiSkillLevel() : state.aiSkillLevel;
    state.aiMemory = window.loadAiMemory ? window.loadAiMemory() : state.aiMemory;
    state.roundNumber = 0;
    state.gameOver = false;
    state.turnBusy = false;
    state.calzaWindowOpen = false;
    state.quantityInputTouched = false;
    state.bidInputContextKey = '';
    $('gameLog').innerHTML = '';
    showScreen('gameScreen');
    var humanIndex = state.players.findIndex(function (p) { return p.human; });
    console.log('[INIT] game phase:', 'starting');
    console.log('[INIT] players before first render:', state.players.length, state.players.map(function (p) { return p && p.name; }));
    beginRound(null);
  }

  async function beginRound(starterId) {
    state.turnBusy = true;
    state.calzaWindowOpen = false;
    state.roundNumber += 1;
    state.currentBid = null;
    state.previousBidderId = null;
    state.revealMode = false;
    state.lockedFace = null;
    state.aceBidsThisRound = [];
    state.quantityInputTouched = false;
    state.bidInputContextKey = '';
    state.palaficoPlayerId = null;
    if (state.pendingPalificoPlayerId && window.shouldStartPalafico(playerById(state.pendingPalificoPlayerId), makeRoundState())) {
      state.palificoActive = true;
      starterId = state.pendingPalificoPlayerId;
      var palificoPlayer = playerById(starterId);
      state.palaficoPlayerId = starterId;
      window.markPalaficoUsed(palificoPlayer);
      $('palificoBanner').textContent = 'PALAFICO ROUND - ACES ARE NOT WILD - ' + palificoPlayer.name + ' opens. Face will lock on the first bid.';
      $('palificoBanner').classList.remove('hidden');
      window.playPalificoSound();
      await runPalaficoRoundStartBanner(palificoPlayer);
    } else {
      state.palificoActive = false;
      $('palificoBanner').classList.add('hidden');
    }
    state.pendingPalificoPlayerId = null;
    activePlayers().forEach(function (p) { p.dice = rollDice(p.diceCount); });
    if (state.roundNumber === 1 && !starterId) starterId = window.getFirstRoundStarterId(state.players);
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
    var humanTurn = currentPlayer() && currentPlayer().human && !state.gameOver && !state.turnBusy && !state.calzaWindowOpen;
    $('humanControls').classList.toggle('disabled', !humanTurn);
    $('humanControls').classList.toggle('human-ready', humanTurn);
    $('dudoButton').classList.toggle('hidden-challenge', !state.currentBid);
    $('dudoButton').classList.toggle('challenge-ready', humanTurn && !!state.currentBid);
    $('dudoButton').disabled = !humanTurn || !state.currentBid;
    $('placeBidButton').disabled = !humanTurn;
    updateCalzaControl();
    updateBidControls();
    updateBidHint();
    renderActionPanel();
    logMobileLayoutDiagnostics();
  }

  function isMobileLayoutActive() {
    return window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
  }

  function logMobileLayoutDiagnostics() {
    if (!isMobileLayoutActive()) return;
    var tableEl = $('table');
    var controlsEl = $('humanControls');
    var controlsFixed = controlsEl ? window.getComputedStyle(controlsEl).position === 'fixed' : false;
    console.log('[MOBILE] screen width:', window.innerWidth);
    console.log('[MOBILE] mobile layout active:', true);
    console.log('[MOBILE] active players count:', activePlayers().length);
    console.log('[MOBILE] player positions calculated:', tableEl ? tableEl.querySelectorAll('.seat').length : 0);
    console.log('[MOBILE] controls fixed:', controlsFixed);
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
      mood: player.moodLevel || player.mood || (player.personality && player.personality.type) || 'calm'
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
      var activeCount = window.PerudoRules.getActivePlayers(state.players).length;
      var activeSeatIndex = 0;
      var html = state.players.map(function (player, index) {
        try {
          var seatHtml = renderSeat(player, index, activeSeatIndex, activeCount);
          if (player && !player.empty && !player.eliminated) activeSeatIndex += 1;
          return seatHtml;
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

  function renderSeat(p, index, activeSeatIndex, activeCount) {
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
    var palaficoFocus = state.palaficoPlayerId === p.id && state.palificoActive ? ' palafico-focus' : '';
    var eliminated = p.eliminated ? ' eliminated' : '';
    var mobileClass = ' player-count-' + safeText(activeCount || 0) + ' seat-pos-' + safeText(activeSeatIndex || 0);
    return '<article class="seat' + active + human + palaficoFocus + eliminated + mobileClass + '" data-player-id="' + safeText(p.id) + '" style="--turn-color:' + safeText(p.cupColour) + '"><div class="avatar-line"><span class="avatar">' + safeText(p.avatar) + '</span><div><div class="player-name">' + safeText(p.name) + '</div><span class="rank-badge">' + safeText(rank) + '</span></div></div><div class="cup" style="--cup:' + safeText(p.cupColour) + '"></div><p class="meta">Mood: ' + safeText(p.mood) + ' · Dice: ' + safeText(p.diceCount) + '</p><div class="dice-row">' + dice + '</div></article>';
  }

  function legalBidsForFace(face, player, roundState) {
    return window.getLegalBids(player, roundState).filter(function (bid) { return bid.face === Number(face); });
  }

  function getMinimumLegalQuantity(face, player, roundState) {
    var legal = legalBidsForFace(face, player, roundState);
    if (!legal.length) return null;
    return legal.reduce(function (lowest, bid) { return Math.min(lowest, bid.quantity); }, legal[0].quantity);
  }

  function getGlobalMinimumLegalQuantity(player, roundState) {
    var legal = window.getLegalBids(player, roundState);
    if (!legal.length) return null;
    return legal.reduce(function (lowest, bid) { return Math.min(lowest, bid.quantity); }, legal[0].quantity);
  }

  function bidInputContextKey(face, player) {
    var bid = state.currentBid ? state.currentBid.quantity + ':' + state.currentBid.face : 'none';
    return [
      player && player.id || 'none',
      bid,
      state.previousBidderId || 'none',
      state.roundNumber,
      face,
      state.palificoActive ? 'palafico' : 'normal',
      state.lockedFace || 'unlocked'
    ].join('|');
  }

  function ensureSelectedFaceHasLegalBid(player, roundState) {
    var faceEl = $('bidFace');
    if (!faceEl) return;
    var legal = window.getLegalBids(player, roundState);
    if (!legal.length) return;
    var selectedFace = Number(faceEl.value) || 2;
    var selectedFaceAllowed = legal.some(function (bid) { return bid.face === selectedFace; });
    if (!selectedFaceAllowed && !state.quantityInputTouched) faceEl.value = String(legal[0].face);
  }

  function applySuggestedQuantity(force) {
    var qtyEl = $('bidQuantity');
    var faceEl = $('bidFace');
    if (!qtyEl || !faceEl) return;
    var player = currentPlayer();
    var roundState = makeRoundState();
    ensureSelectedFaceHasLegalBid(player, roundState);
    var face = selectedBidFace();
    var key = bidInputContextKey(face, player);
    if (force || key !== state.bidInputContextKey) {
      state.quantityInputTouched = false;
      state.bidInputContextKey = key;
    }
    var minForFace = getMinimumLegalQuantity(face, player, roundState);
    var fallbackMin = getGlobalMinimumLegalQuantity(player, roundState);
    qtyEl.min = minForFace || fallbackMin || 1;
    if (!state.quantityInputTouched) {
      qtyEl.value = minForFace === null ? '' : String(minForFace);
    }
  }

  function getBidValidationMessage(bid, player, roundState) {
    if (!bid || !Number.isInteger(Number(bid.quantity)) || Number(bid.quantity) < 1) return 'Enter a whole-number bid quantity.';
    if (state.palificoActive && state.currentBid && state.lockedFace && bid.face !== state.lockedFace && !window.isLegalBid(bid, state.currentBid, roundState, player)) {
      return 'Palafico face is locked to ' + faceName(state.lockedFace) + '.';
    }
    if (!state.palificoActive && !state.currentBid && bid.face === 1) return 'Opening bid cannot be aces.';
    if (!state.palificoActive && state.currentBid && state.currentBid.face !== 1 && bid.face === 1) return 'Minimum aces bid is ' + (getMinimumLegalQuantity(1, player, roundState) || window.getMinimumAceBid(state.currentBid)) + '.';
    if (!state.palificoActive && state.currentBid && state.currentBid.face === 1 && bid.face !== 1) return 'Minimum normal bid is ' + window.getMinimumNormalBidFromAces(state.currentBid) + '.';
    var minForFace = getMinimumLegalQuantity(bid.face, player, roundState);
    if (minForFace !== null && Number(bid.quantity) < minForFace) return 'Minimum ' + faceName(bid.face) + ' bid is ' + minForFace + '.';
    return 'That bid is not legal yet.';
  }

  function getMinimumLegalBidText() {
    var player = currentPlayer();
    var roundState = makeRoundState();
    var legal = window.getLegalBids(player, roundState);
    if (!legal.length) return 'No legal raise available. You must challenge.';
    var selectedFace = selectedBidFace();
    var selectedMin = getMinimumLegalQuantity(selectedFace, player, roundState);
    var first = legal[0];
    if (state.palificoActive && state.currentBid) {
      if (selectedFace !== state.lockedFace && selectedMin === null) return 'Palafico: face locked to ' + faceName(state.lockedFace) + '. You may only raise quantity.';
      return 'Palafico: face locked to ' + faceName(state.lockedFace) + '. Minimum legal raise: ' + (selectedMin || first.quantity) + ' x ' + faceName(state.lockedFace) + '.';
    }
    if (state.palificoActive) {
      if (selectedFace === 1 && player && player.id !== state.palaficoPlayerId) return 'Only the Palafico player may open with aces. Aces are not wild.';
      return 'Palafico: opening bid locks the face. Aces are not wild.';
    }
    if (!state.currentBid) {
      if (selectedFace === 1) return 'Opening bid cannot be aces.';
      return 'Minimum legal bid: ' + (selectedMin || 1) + ' x ' + faceName(selectedFace) + '. Opening on aces is not allowed.';
    }
    if (selectedFace === 1 && state.currentBid.face !== 1) return 'Minimum aces bid: ' + (selectedMin || window.getMinimumAceBid(state.currentBid)) + '. You may bid higher.';
    if (selectedFace !== 1 && state.currentBid.face === 1) return 'Minimum normal bid: ' + window.getMinimumNormalBidFromAces(state.currentBid) + '.';
    if (selectedFace === 1) return 'Minimum aces bid: ' + (selectedMin || state.currentBid.quantity + 1) + '. You may bid higher.';
    return 'Minimum ' + faceName(selectedFace) + ' bid: ' + (selectedMin || first.quantity) + '. Or switch to aces if legal.';
  }

  function updateBidHint() {
    if (!$('bidHint')) return;
    var humanTurn = currentPlayer() && currentPlayer().human && !state.gameOver;
    var prefix = humanTurn ? 'Your turn: raise the bid' + (state.currentBid ? ' or challenge the last bid. ' : '. ') : '';
    $('bidHint').textContent = prefix + getMinimumLegalBidText();
  }

  function updateBidControls() {
    if (!$('bidQuantity') || !$('bidFace')) return;
    applySuggestedQuantity(false);
    var player = currentPlayer();
    var roundState = makeRoundState();
    var legal = window.getLegalBids(player, roundState);
    var legalFaces = legal.reduce(function (faces, bid) {
      faces[bid.face] = true;
      return faces;
    }, {});
    var options = Array.from($('bidFace').options);
    options.forEach(function (option) {
      option.disabled = !legalFaces[Number(option.value)];
    });
  }

  function handleQuantityInput() {
    state.quantityInputTouched = true;
    updateBidControls();
    updateBidHint();
  }

  function handleFaceChange() {
    state.quantityInputTouched = false;
    state.bidInputContextKey = '';
    applySuggestedQuantity(true);
    updateBidControls();
    updateBidHint();
  }

  function showBidInputError(message) {
    if ($('bidHint')) $('bidHint').textContent = message;
  }

  function submitHumanBid() {
    var raw = $('bidQuantity').value.trim();
    var quantity = raw === '' ? NaN : Number(raw);
    var bid = { quantity: quantity, face: selectedBidFace() };
    var player = playerById('human') || currentPlayer();
    var roundState = makeRoundState();
    if (!Number.isInteger(quantity) || quantity < 1 || !window.isLegalBid(bid, state.currentBid, roundState, player)) {
      showBidInputError(getBidValidationMessage(bid, player, roundState));
      return false;
    }
    state.quantityInputTouched = false;
    return placeBid('human', bid);
  }

  function updateCalzaControl() {
    var button = $('calzaButton');
    if (!button) return;
    var hint = $('calzaHint');
    var human = playerById('human');
    var status = getHumanCalzaUiStatus(human);
    console.log('Calza enabled:', state.calzaEnabled);
    console.log('canCallCalza:', status.allowed);
    console.log('Calza disabled reason:', status.reason);
    button.classList.toggle('calza-ready', status.allowed);
    button.classList.toggle('calza-disabled', !status.allowed);
    button.disabled = !status.allowed || state.gameOver;
    button.title = status.allowed ? 'Call exact' : status.reason;
    if (hint) hint.textContent = status.allowed ? 'Calza available: call exact.' : status.reason;
  }

  function getHumanCalzaUiStatus(human) {
    if (!state.calzaEnabled) return { allowed: false, reason: 'Calza disabled in settings' };
    var status = window.getCalzaStatus ? window.getCalzaStatus(human, makeRoundState()) : { allowed: false, reason: 'Calza unavailable' };
    var reasonMap = {
      'Calza disabled': 'Calza disabled in settings',
      'No bid to Calza': 'No bid to Calza',
      'Calza unavailable in Palafico': 'Unavailable in Palafico',
      'Calza unavailable with two players': 'Unavailable with 2 players',
      'Cannot Calza your own bid': 'Cannot Calza your own bid',
      'Next player cannot Calza': 'Next player cannot Calza'
    };
    if (!status.allowed) return { allowed: false, reason: reasonMap[status.reason] || status.reason || 'Calza unavailable' };
    if (!state.calzaWindowOpen) return { allowed: false, reason: 'Wait for the Calza window' };
    return { allowed: true, reason: '' };
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
    var move = window.PerudoAI.chooseAIMove(p, Object.assign(makeRoundState(), { streakTarget: false }));
    if (move.type === 'dudo' && state.currentBid) {
      state.turnBusy = false;
      return callDudo(p.id);
    }
    if (move.type === 'calza' && state.currentBid) {
      state.turnBusy = false;
      return callCalza(p.id);
    }
    await placeBid(p.id, move.bid);
  }

  async function placeBid(playerId, bid) {
    var p = playerById(playerId);
    if (!p || state.gameOver) return false;
    if (p.human && state.turnBusy) return false;
    state.turnBusy = true;
    var roundState = makeRoundState();
    var valid = window.isLegalBid(bid, state.currentBid, roundState, p);
    if (!valid) {
      state.turnBusy = false;
      if (p.human) {
        showBidInputError(getBidValidationMessage(bid, p, roundState));
        updateBidControls();
        return false;
      }
      renderGame();
      return false;
    }
    if (state.palificoActive) state.lockedFace = Number(bid.face);
    if (state.palificoActive) {
      $('palificoBanner').textContent = 'PALAFICO ROUND - ACES ARE NOT WILD - FACE LOCKED TO ' + faceName(state.lockedFace) + '.';
    }
    var previousBidForTalk = state.currentBid ? { quantity: state.currentBid.quantity, face: state.currentBid.face } : null;
    state.currentBid = { quantity: Number(bid.quantity), face: Number(bid.face) };
    window.recordAceBid(state, state.currentBid);
    state.previousBidderId = playerId;
    if (window.recordBidMemory) window.recordBidMemory(p, state.currentBid, makeRoundState(), state.aiMemory);
    setAction(p.name + ' bids ' + bidText(state.currentBid) + '.');
    log(p.name + ' bids ' + bidText(state.currentBid) + '.');
    window.playBidSound();
    if (window.getBanterLevel && window.getBanterLevel() > 0 && window.showSpeechBubble && window.getBanterLine) {
      window.showSpeechBubble(p.id, window.getBanterLine(p, 'bid', activePlayers().find(function (x) { return x.id !== p.id; }), speechBidContext(state.currentBid)));
    }
    renderGame();
    await runTableTalk(p.human ? 'afterHumanBid' : 'afterBid', makeTalkContext(p, state.currentBid, { previousBid: previousBidForTalk, nextPlayer: peekNextPlayer() }));
    await wait(PACE.bidResultPause);
    nextTurn();
    setAction(currentPlayer().name + ' is next. Calza window open.');
    state.calzaWindowOpen = true;
    state.turnBusy = false;
    renderGame();
    var aiCalledCalza = await maybeAiCalzaWindow();
    if (aiCalledCalza) return true;
    await wait(PACE.nextTurnPause);
    if (!state.calzaWindowOpen) return true;
    state.calzaWindowOpen = false;
    state.turnBusy = false;
    setAction(currentPlayer().name + ' must raise the bid or challenge.');
    renderGame();
    promptTurn();
    return true;
  }

  async function callDudo(challengerId) {
    if (!state.currentBid || !state.previousBidderId || state.gameOver || state.turnBusy) return;
    state.turnBusy = true;
    var challenger = playerById(challengerId);
    var bidder = playerById(state.previousBidderId);
    if (!window.canCallDudo(challenger, makeRoundState())) {
      state.turnBusy = false;
      renderGame();
      return;
    }
    setAction('DUDO CALLED - ' + challenger.name + ' challenges ' + bidder.name + "'s bid.");
    emphasizeLiarCalled(true);
    log('LIAR CALLED: ' + challenger.name + ' challenges ' + bidder.name + "'s bid: " + bidText(state.currentBid) + '.');
    window.playDudoSound();
    window.maybeSpeak(challenger, 'dudo', bidder, true, speechBidContext(state.currentBid));
    renderGame();
    await runTableTalk(challenger.human ? 'afterHumanDudo' : 'afterDudoCalled', makeTalkContext(challenger, state.currentBid, { caller: challenger, target: bidder, lastBidder: bidder.name, risk: 'high' }));
    await wait(PACE.challengeResultPause);
    setAction('Revealing dice...');
    state.revealMode = true;
    renderGame();
    window.playRevealSound();
    await Promise.all(activePlayers().map(function (p) { return window.animateDiceReveal(p.id); }));
    await wait(Math.min(PACE.diceRevealPause, 1000));
    var result = window.PerudoRules.resolveDudo(challenger, bidder, state.currentBid, makeRoundState());
    var actual = await window.animateChallengeCount(state.currentBid, state.players, state.palificoActive, {
      perDieMs: PACE.challengeCountPerDie,
      finalPauseMs: PACE.challengeCountFinalPause,
      onCount: function (count) { setAction('Counting ' + count + '...'); }
    });
    setAction('Actual count: ' + actual + '. Bid: ' + bidText(state.currentBid) + '.');
    log('Dice count complete: actual count is ' + actual + ' for ' + bidText(state.currentBid) + '.');
    await wait(PACE.challengeCountFinalPause);
    var bidSurvived = result.bidTrue;
    if (result.callerCorrect) {
      addDudoStat(challengerId, result.successfulDudoQuantity);
      window.recordPlayerEvent(challenger, 'successfulDudo');
      window.recordPlayerEvent(bidder, 'failedBid');
      if (window.applyAIMoodEvent) { window.applyAIMoodEvent(challenger, 'wonDudo'); window.applyAIMoodEvent(bidder, 'failedDudo'); }
    } else {
      window.recordPlayerEvent(challenger, 'failedDudo');
      if (window.applyAIMoodEvent) window.applyAIMoodEvent(challenger, 'failedDudo');
    }
    if (window.updateMemoryAfterDudo) window.updateMemoryAfterDudo(challenger, bidder, result, makeRoundState(), state.aiMemory);
    var loser = playerById(result.loserId);
    setAction((bidSurvived ? 'Bid was true' : 'Bid was false') + ' - ' + (bidSurvived ? 'challenger' : 'bidder') + ' loses 1 die. ' + loser.name + ' loses it.');
    log(loser.name + ' loses 1 die.');
    await runTableTalk(result.callerCorrect ? 'afterDudoSuccess' : 'afterDudoFail', makeTalkContext(challenger, state.currentBid, { caller: challenger, target: loser, lastBidder: bidder.name, risk: 'high' }));
    await wait(PACE.challengeResultDisplay);
    emphasizeLiarCalled(false);
    await loseDie(loser);
    await wait(PACE.diceLossWinnerPause);
    if (checkWinner()) return;
    var starter = window.determineNextRoundStarter(result, makeRoundState());
    state.turnBusy = false;
    beginRound(starter);
  }

  function addDudoStat(playerId, quantity) {
    state.dudoStats[playerId] = state.dudoStats[playerId] || { total: 0, largest: 0 };
    state.dudoStats[playerId].total += quantity;
    state.dudoStats[playerId].largest = Math.max(state.dudoStats[playerId].largest, quantity);
  }

  async function callCalza(callerId) {
    if (!state.currentBid || state.gameOver || (state.turnBusy && !state.calzaWindowOpen)) return;
    var caller = playerById(callerId);
    var status = window.getCalzaStatus(caller, makeRoundState());
    if (!status.allowed) {
      setAction(status.reason);
      renderGame();
      return;
    }
    state.calzaWindowOpen = false;
    state.turnBusy = true;
    setAction(caller.name + ' calls CALZA!');
    emphasizeLiarCalled(true);
    log('CALZA CALLED: ' + caller.name + ' calls exact on ' + bidText(state.currentBid) + '.');
    await runCalzaShout(caller);
    window.maybeSpeak(caller, 'challenge', playerById(state.previousBidderId), true, speechBidContext(state.currentBid));
    renderGame();
    await runTableTalk(caller.human ? 'afterHumanCalza' : 'afterCalzaCalled', makeTalkContext(caller, state.currentBid, { caller: caller, target: playerById(state.previousBidderId), risk: 'high' }));
    await wait(PACE.challengeResultPause);
    setAction('Revealing dice for Calza...');
    state.revealMode = true;
    renderGame();
    window.playRevealSound();
    await Promise.all(activePlayers().map(function (p) { return window.animateDiceReveal(p.id); }));
    await wait(Math.min(PACE.diceRevealPause, 1000));
    var result = window.resolveCalza(caller, state.currentBid, makeRoundState());
    var actual = await window.animateChallengeCount(state.currentBid, state.players, false, {
      perDieMs: PACE.challengeCountPerDie,
      finalPauseMs: PACE.challengeCountFinalPause,
      onCount: function (count) { setAction('Counting ' + count + '...'); }
    });
    setAction('Actual count: ' + actual + '. Bid: ' + bidText(state.currentBid) + '.');
    log('Calza count complete: actual count is ' + actual + ' for ' + bidText(state.currentBid) + '.');
    await wait(PACE.challengeCountFinalPause);
    if (result.exact) {
      var gain = window.applyDiceGain(caller);
      if (window.applyAIMoodEvent) window.applyAIMoodEvent(caller, 'successfulCalza');
      setAction('Calza exact - ' + caller.name + (gain.gainedDie ? ' gains 1 die.' : ' is already at 5 dice.'));
      log(caller.name + ' called Calza exactly and ' + (gain.gainedDie ? 'gains 1 die.' : 'stays at 5 dice.'));
      renderGame();
      await runTableTalk('afterCalzaSuccess', makeTalkContext(caller, state.currentBid, { caller: caller, target: caller, risk: 'high' }));
      await wait(PACE.challengeResultDisplay);
    } else {
      if (window.applyAIMoodEvent) window.applyAIMoodEvent(caller, 'failedCalza');
      setAction('Calza wrong - ' + caller.name + ' loses 1 die. Previous bidder is safe.');
      log(caller.name + ' called Calza wrong and loses 1 die. Previous bidder is safe.');
      await runTableTalk('afterCalzaFail', makeTalkContext(caller, state.currentBid, { caller: caller, target: caller, risk: 'high' }));
      await wait(PACE.challengeResultDisplay);
      await loseDie(caller);
      await wait(PACE.diceLossWinnerPause);
      if (checkWinner()) return;
    }
    if (window.updateMemoryAfterCalza) window.updateMemoryAfterCalza(caller, playerById(state.previousBidderId), result, state.aiMemory);
    emphasizeLiarCalled(false);
    var starter = window.determineNextRoundStarter(result, makeRoundState());
    state.turnBusy = false;
    beginRound(starter);
  }

  async function loseDie(player) {
    window.recordPlayerEvent(player, 'lostDie');
    window.playLoseDieSound();
    await window.animateDieLoss(player.id);
    var loss = window.applyDiceLoss(player, makeRoundState());
    if (window.applyAIMoodEvent) window.applyAIMoodEvent(player, 'lostDie');
    if (loss.startsPalafico && shouldTriggerPalaficoAnnouncement(player, makeRoundState())) {
      await runPalaficoAnticipationSequence(player);
      state.pendingPalificoPlayerId = player.id;
    }
    if (player.diceCount <= 0) {
      player.spectator = true;
      player.mood = 'eliminated';
      setAction(player.name + ' has been eliminated.');
      window.playEliminationSound();
      window.maybeSpeak(player, 'elim', null, true);
      await window.animateElimination(player.id);
      log(player.name + ' has been eliminated and moves to Spectators.');
      renderGame();
      await runTableTalk('afterElimination', makeTalkContext(player, state.currentBid, { target: player, risk: 'high' }));
    } else {
      window.maybeSpeak(player, 'loss', null);
      renderGame();
      await runTableTalk(loss.startsPalafico ? 'afterPalaficoStart' : 'afterDiceLoss', makeTalkContext(player, state.currentBid, { target: player, risk: loss.startsPalafico ? 'high' : 'medium' }));
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
    state.aiSkillLevel = window.getAiSkillLevel ? window.getAiSkillLevel() : 'hard';
    state.aiMemory = window.loadAiMemory ? window.loadAiMemory() : {};
    var savedCalza = localStorage.getItem('calzaEnabled');
    state.calzaEnabled = savedCalza === null ? true : savedCalza === 'true';
    console.log('Current Action layout loaded');
    console.log('Calza UI loaded');
    console.log('Calza enabled:', state.calzaEnabled);
    $('soundToggle').checked = soundSettings.enabled;
    $('volumeSlider').value = soundSettings.volume;
    if ($('aiSkillLevel')) $('aiSkillLevel').value = state.aiSkillLevel;
    if ($('calzaToggle')) $('calzaToggle').checked = state.calzaEnabled;
    $('banterLevel').value = String(window.getBanterLevel ? window.getBanterLevel() : 2);
    $('skipAnimationsToggle').checked = localStorage.getItem('perudoSkipAnimations') === 'true';
    $('profileForm').addEventListener('submit', function (e) {
      e.preventDefault();
      state.profile = window.saveProfile({ name: $('playerName').value.trim() || 'Player', avatar: $('avatarSelect').value, cupColour: $('cupColour').value });
      state.players = createPlayers();
      renderReveal();
      showScreen('revealScreen');
    });
    $('startGameButton').addEventListener('click', startGame);
    $('placeBidButton').addEventListener('click', submitHumanBid);
    $('dudoButton').addEventListener('click', function () { callDudo('human'); });
    $('calzaButton').addEventListener('click', function () { callCalza('human'); });
    $('bidQuantity').addEventListener('input', handleQuantityInput);
    $('bidFace').addEventListener('change', handleFaceChange);
    $('settingsButton').addEventListener('click', function () { $('settingsPanel').classList.toggle('hidden'); });
    $('banterLevel').addEventListener('change', function () { if (window.setBanterLevel) window.setBanterLevel($('banterLevel').value); else localStorage.setItem('perudoBanterLevel', $('banterLevel').value); });
    if ($('aiSkillLevel')) $('aiSkillLevel').addEventListener('change', function () { state.aiSkillLevel = $('aiSkillLevel').value; if (window.setAiSkillLevel) window.setAiSkillLevel(state.aiSkillLevel); });
    $('soundToggle').addEventListener('change', function () { window.PerudoSound.setSoundSettings({ enabled: $('soundToggle').checked }); });
    $('volumeSlider').addEventListener('input', function () { window.PerudoSound.setSoundSettings({ volume: Number($('volumeSlider').value) }); });
    $('skipAnimationsToggle').addEventListener('change', function () { localStorage.setItem('perudoSkipAnimations', $('skipAnimationsToggle').checked); });
    if ($('calzaToggle')) $('calzaToggle').addEventListener('change', function () { state.calzaEnabled = $('calzaToggle').checked; localStorage.setItem('calzaEnabled', state.calzaEnabled); renderGame(); });
    $('leaderboardButton').addEventListener('click', function () { window.renderLeaderboard('leaderboardDialogContent'); $('leaderboardDialog').showModal(); });
    $('closeLeaderboard').addEventListener('click', function () { $('leaderboardDialog').close(); });
    $('replayButton').addEventListener('click', function () { state.players = createPlayers(); renderReveal(); showScreen('revealScreen'); });
    state.profile = window.loadProfile();
    renderActionPanel();
  }

  function mobileNameCssAllowsWrapping() {
    try {
      var css = Array.from(document.styleSheets).map(function (sheet) {
        return Array.from(sheet.cssRules || []).map(function (rule) { return rule.cssText; }).join('\n');
      }).join('\n');
      return css.indexOf('.player-name') !== -1 &&
        css.indexOf('white-space: normal') !== -1 &&
        css.indexOf('text-overflow: unset') !== -1 &&
        css.indexOf('overflow: visible') !== -1;
    } catch (err) {
      console.warn('Could not inspect mobile name CSS:', err);
      return false;
    }
  }

  function runBidInputConsoleTests() {
    var qtyEl = $('bidQuantity');
    var faceEl = $('bidFace');
    if (!qtyEl || !faceEl) {
      return {
        canClearQuantity: false,
        canTypeHigherAceBid: false,
        sixAcesAccepted: false,
        sevenAcesAccepted: false,
        fiveAcesRejected: false,
        inputDoesNotAutoReset: false,
        mobileNamesNotEllipsised: mobileNameCssAllowsWrapping()
      };
    }

    var saved = {
      players: state.players,
      turnIndex: state.turnIndex,
      currentBid: state.currentBid,
      previousBidderId: state.previousBidderId,
      palificoActive: state.palificoActive,
      palaficoPlayerId: state.palaficoPlayerId,
      lockedFace: state.lockedFace,
      aceBidsThisRound: state.aceBidsThisRound,
      quantityInputTouched: state.quantityInputTouched,
      bidInputContextKey: state.bidInputContextKey,
      qtyValue: qtyEl.value,
      faceValue: faceEl.value
    };

    try {
      state.players = [
        { id: 'human', name: 'Test Human', human: true, empty: false, eliminated: false, diceCount: 5, dice: [2, 3, 4, 5, 6] },
        { id: 'ai-test', name: 'Test AI', ai: true, empty: false, eliminated: false, diceCount: 5, dice: [1, 1, 2, 3, 4] },
        { id: 'ai-two', name: 'Test Two', ai: true, empty: false, eliminated: false, diceCount: 5, dice: [2, 2, 5, 6, 6] }
      ];
      state.turnIndex = 0;
      state.currentBid = { quantity: 11, face: 2 };
      state.previousBidderId = 'ai-test';
      state.palificoActive = false;
      state.palaficoPlayerId = null;
      state.lockedFace = null;
      state.aceBidsThisRound = [];
      faceEl.value = '1';
      state.quantityInputTouched = false;
      state.bidInputContextKey = '';
      applySuggestedQuantity(true);

      var suggestedSix = qtyEl.value === '6';
      qtyEl.value = '';
      state.quantityInputTouched = true;
      updateBidControls();
      var canClearQuantity = qtyEl.value === '';

      qtyEl.value = '7';
      state.quantityInputTouched = true;
      updateBidControls();
      var canTypeHigherAceBid = qtyEl.value === '7';
      var inputDoesNotAutoReset = suggestedSix && canClearQuantity && canTypeHigherAceBid;
      var roundState = makeRoundState();
      var player = currentPlayer();

      return {
        canClearQuantity: canClearQuantity,
        canTypeHigherAceBid: canTypeHigherAceBid,
        sixAcesAccepted: window.isLegalBid({ quantity: 6, face: 1 }, state.currentBid, roundState, player),
        sevenAcesAccepted: window.isLegalBid({ quantity: 7, face: 1 }, state.currentBid, roundState, player),
        fiveAcesRejected: !window.isLegalBid({ quantity: 5, face: 1 }, state.currentBid, roundState, player),
        inputDoesNotAutoReset: inputDoesNotAutoReset,
        mobileNamesNotEllipsised: mobileNameCssAllowsWrapping()
      };
    } finally {
      state.players = saved.players;
      state.turnIndex = saved.turnIndex;
      state.currentBid = saved.currentBid;
      state.previousBidderId = saved.previousBidderId;
      state.palificoActive = saved.palificoActive;
      state.palaficoPlayerId = saved.palaficoPlayerId;
      state.lockedFace = saved.lockedFace;
      state.aceBidsThisRound = saved.aceBidsThisRound;
      state.quantityInputTouched = saved.quantityInputTouched;
      state.bidInputContextKey = saved.bidInputContextKey;
      qtyEl.value = saved.qtyValue;
      faceEl.value = saved.faceValue;
    }
  }

  function runConsoleTests() {
    var ruleFailures = window.runOfficialRulesTests ? window.runOfficialRulesTests() : ['Official rules test runner missing'];
    if (ruleFailures.length) {
      console.error('Perudo rules tests failed');
      ruleFailures.forEach(function (name) { console.error('- ' + name); });
    } else {
      console.log('Perudo rules tests passed');
    }

    console.group('Perudo integration smoke tests');
    var mock = [
      { id: 'a', empty:false, eliminated:false, diceCount: 5, dice:[1,4,4,6,2] },
      { id: 'b', empty:false, eliminated:false, diceCount: 5, dice:[2,1,3,5,6] },
      { id: 'c', empty:false, eliminated:false, diceCount: 5, dice:[4,2,6,3,5] }
    ];
    console.assert(window.validatePhraseBank(), 'AI speech categories contain 100 unique phrases each');
    var banterChecks = window.validateBanterSystem ? window.validateBanterSystem() : {};
    var aiChecks = window.validateAiIntelligence ? window.validateAiIntelligence() : {};
    console.assert(banterChecks.reactionsTriggerAfterBids, 'Reactions trigger after bids');
    console.assert(banterChecks.nextPlayerPressureIncludesName, 'Next player pressure includes nextPlayer name');
    console.assert(banterChecks.humanBidsCanTriggerAIReactions, 'Human bids can trigger AI reactions');
    console.assert(banterChecks.banterLevelChangesIntensity, 'Banter level changes intensity');
    console.assert(banterChecks.noPhraseRepeatsTooOften, 'No phrase repeats too often');
    console.assert(banterChecks.animalSpecificUsesAnimalType, 'Animal-specific phrases use correct animalType');
    console.assert(banterChecks.reactionSequenceDoesNotSkipPacing, 'Reaction sequence does not skip game pacing');
    console.assert(typeof runCalzaShout === 'function', 'Calza shout fires when Calza is called');
    var palTestPlayers = [{ id: 'p', name: 'Pal', diceCount: 1, dice: [3], palaficoUsed: false }, { id: 'a', diceCount: 3 }, { id: 'b', diceCount: 3 }];
    console.assert(shouldTriggerPalaficoAnnouncement(palTestPlayers[0], { players: palTestPlayers }), 'Palafico shout fires when player drops from 2 dice to 1');
    console.assert(!shouldTriggerPalaficoAnnouncement({ id: 'p', diceCount: 1, palaficoUsed: true }, { players: palTestPlayers }), 'Palafico shout does not fire if already used');
    console.assert(!shouldTriggerPalaficoAnnouncement({ id: 'p', diceCount: 1, palaficoUsed: false }, { players: [{ id: 'p', diceCount: 1 }, { id: 'x', diceCount: 2 }] }), 'Palafico shout does not fire with only 2 players left');
    console.assert(PACE.palaficoAnticipationMin >= 3500, 'Next round waits until shout sequence completes');
    console.assert(aiChecks.normalNonAceUsesTwoSixths, 'AI estimated count uses 2/6 for normal non-ace bids');
    console.assert(aiChecks.aceUsesOneSixth, 'AI estimated count uses 1/6 for ace bids');
    console.assert(aiChecks.palaficoUsesOneSixth, 'AI estimated count uses 1/6 in Palafico');
    console.assert(aiChecks.hardRejectsAbsurd, 'Hard AI rejects absurd bids more often');
    console.assert(aiChecks.expertChallengesBluffers, 'Expert AI challenges frequent bluffers more');
    console.assert(aiChecks.calmChoosesSaferBids, 'Calm AI chooses safer bids');
    console.assert(aiChecks.angryChallengesMore, 'Angry AI challenges more');
    console.assert(aiChecks.nervousHasHigherVariance, 'Nervous AI has higher variance');
    console.assert(aiChecks.cockyBluffsMore, 'Cocky AI bluffs more');
    console.assert(aiChecks.aiNeverIllegal, 'AI never makes illegal bids');
    console.assert(aiChecks.noIllegalPalaficoFaceChange, 'AI never changes face illegally in Palafico');
    console.assert(aiChecks.respectsAcesRules, 'AI respects aces rules');
    console.assert(aiChecks.aiCalzaLegalOnly, 'AI only calls Calza when legal');
    if (Object.values(banterChecks).every(Boolean) && Object.values(aiChecks).every(Boolean)) console.log('AI intelligence, mood, and banter validation passed');
    console.assert(!window.getBanterLine({ name: 'Test', id: 'test' }, 'bidding', null, { quantity: 6, face: 'threes', currentBid: '6 x threes' }).includes('['), 'Dynamic banter templates resolve variables');
    var countTargets = window.getChallengeCountTargets({ quantity: 1, face: 4 }, mock, false);
    console.assert(countTargets.length === 5 && countTargets[0].value === 4 && countTargets[1].value === 4 && countTargets[2].value === 4 && countTargets[3].value === 1, 'Challenge count animation orders face dice before wild aces');
    console.assert(window.getChallengeCountTargets({ quantity: 1, face: 4 }, mock, true).length === 3, 'Challenge count animation uses exact face only in Palafico');
    console.assert(PACE.bidResultPause >= 2500 && PACE.diceRevealPause >= 3000 && PACE.diceLossWinnerPause >= 4000, 'No AI turn starts before current animations/delays finish');
    var bidInputChecks = runBidInputConsoleTests();
    console.assert(bidInputChecks.canClearQuantity, 'User can clear quantity input');
    console.assert(bidInputChecks.canTypeHigherAceBid, 'User can type 7 after suggested 6 aces');
    console.assert(bidInputChecks.sixAcesAccepted, '6 aces is accepted after 11 twos');
    console.assert(bidInputChecks.sevenAcesAccepted, '7 aces is accepted after 11 twos');
    console.assert(bidInputChecks.fiveAcesRejected, '5 aces is rejected after 11 twos');
    console.assert(bidInputChecks.inputDoesNotAutoReset, 'Quantity input does not auto-reset while typing');
    console.assert(bidInputChecks.mobileNamesNotEllipsised, 'Mobile names are not ellipsised unnecessarily');
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

