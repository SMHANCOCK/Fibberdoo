(function () {
  var ACE_FACE = 1;
  var NORMAL_FACES = [2, 3, 4, 5, 6];

  function getActivePlayers(players) {
    return (players || []).filter(function (p) { return p && !p.empty && !p.eliminated && p.diceCount > 0; });
  }

  function getNextActivePlayerIndex(players, currentIndex) {
    if (!players || !players.length) return -1;
    for (var offset = 1; offset <= players.length; offset += 1) {
      var index = (currentIndex + offset + players.length) % players.length;
      var player = players[index];
      if (player && !player.empty && !player.eliminated && player.diceCount > 0) return index;
    }
    return -1;
  }

  function getPlayerIndex(players, playerOrId) {
    var id = typeof playerOrId === 'string' ? playerOrId : playerOrId && playerOrId.id;
    return (players || []).findIndex(function (p) { return p && p.id === id; });
  }

  function isTwoPlayerEndgame(roundState) {
    return getActivePlayers(roundState && roundState.players).length <= 2;
  }

  function isPalaficoRound(roundState) {
    return !!(roundState && (roundState.palaficoActive || roundState.palificoActive)) && !isTwoPlayerEndgame(roundState);
  }

  function shouldStartPalafico(player, roundState) {
    return !!(player && player.diceCount === 1 && !player.palaficoUsed && !isTwoPlayerEndgame(roundState || {}));
  }

  function markPalaficoUsed(player) {
    if (player) player.palaficoUsed = true;
    return player;
  }

  function isAceBid(bid) {
    return !!bid && Number(bid.face) === ACE_FACE;
  }

  function normalizeBid(bid) {
    return bid ? { quantity: Number(bid.quantity), face: Number(bid.face) } : null;
  }

  function getMinimumAceBid(previousBid) {
    previousBid = normalizeBid(previousBid);
    return previousBid ? Math.ceil(previousBid.quantity / 2) : 1;
  }

  function getMinimumNormalBidFromAces(previousBid) {
    previousBid = normalizeBid(previousBid);
    return previousBid ? previousBid.quantity * 2 + 1 : 1;
  }

  function hasAceQuantityBeenBid(quantity, roundState) {
    return (roundState && roundState.aceBidsThisRound || []).indexOf(Number(quantity)) !== -1;
  }

  function canPalaficoPlayerChangeFace(player, roundState) {
    return !!(player && player.diceCount === 1 && player.palaficoUsed && roundState && player.id !== roundState.palaficoPlayerId);
  }

  function isLegalBid(newBid, previousBid, roundState, player) {
    newBid = normalizeBid(newBid);
    previousBid = normalizeBid(previousBid || roundState && roundState.currentBid);
    roundState = roundState || {};
    if (!newBid || newBid.quantity < 1 || newBid.face < 1 || newBid.face > 6) return false;

    if (isPalaficoRound(roundState)) {
      if (!previousBid) {
        // In Palafico, the first bid locks the face. Only the Palafico player may open on aces.
        return !isAceBid(newBid) || (player && player.id === roundState.palaficoPlayerId);
      }
      if (newBid.quantity <= previousBid.quantity) return false;
      if (newBid.face === roundState.lockedFace) return true;
      return canPalaficoPlayerChangeFace(player, roundState);
    }

    if (!previousBid) {
      // Normal rounds cannot open on aces because aces are wild for non-ace bids.
      return !isAceBid(newBid);
    }

    if (isAceBid(newBid)) {
      if (hasAceQuantityBeenBid(newBid.quantity, roundState)) return false;
      if (isAceBid(previousBid)) return newBid.quantity > previousBid.quantity;
      return newBid.quantity >= getMinimumAceBid(previousBid);
    }

    if (isAceBid(previousBid)) {
      return newBid.quantity >= getMinimumNormalBidFromAces(previousBid);
    }

    // Normal face bids rise by either quantity, or by face when quantity is unchanged.
    return newBid.quantity > previousBid.quantity || (newBid.quantity === previousBid.quantity && newBid.face > previousBid.face);
  }

  function getLegalBids(player, roundState) {
    roundState = roundState || {};
    var activeDice = getActivePlayers(roundState.players).reduce(function (sum, p) { return sum + p.diceCount; }, 0);
    var previousBid = roundState.currentBid || null;
    var maxQuantity = Math.max(activeDice + 5, previousBid ? previousBid.quantity + 8 : 8);
    var legal = [];
    for (var quantity = 1; quantity <= maxQuantity; quantity += 1) {
      for (var face = 1; face <= 6; face += 1) {
        var bid = { quantity: quantity, face: face };
        if (isLegalBid(bid, previousBid, roundState, player)) legal.push(bid);
      }
    }
    return legal;
  }

  function canCallDudo(player, roundState) {
    if (!player || !roundState || !roundState.currentBid) return false;
    return player.id !== roundState.previousBidderId;
  }

  function getCalzaStatus(player, roundState) {
    if (!roundState || !roundState.calzaEnabled) return { allowed: false, reason: 'Calza disabled' };
    if (!roundState.currentBid) return { allowed: false, reason: 'No bid to Calza' };
    if (isPalaficoRound(roundState)) return { allowed: false, reason: 'Calza unavailable in Palafico' };
    if (isTwoPlayerEndgame(roundState)) return { allowed: false, reason: 'Calza unavailable with two players' };
    if (!player) return { allowed: false, reason: 'No player' };
    if (player.id === roundState.previousBidderId) return { allowed: false, reason: 'Cannot Calza your own bid' };
    var next = roundState.players && roundState.players[roundState.turnIndex];
    if (next && player.id === next.id) return { allowed: false, reason: 'Next player cannot Calza' };
    return { allowed: true, reason: '' };
  }

  function canCallCalza(player, roundState) {
    return getCalzaStatus(player, roundState).allowed;
  }

  function flattenDice(diceOrPlayers) {
    if (!Array.isArray(diceOrPlayers)) return [];
    if (!diceOrPlayers.length) return [];
    if (typeof diceOrPlayers[0] === 'number') return diceOrPlayers.slice();
    return diceOrPlayers.reduce(function (dice, player) {
      if (player && !player.empty && !player.eliminated && Array.isArray(player.dice)) return dice.concat(player.dice);
      return dice;
    }, []);
  }

  function countBidMatches(bid, diceOrPlayers, roundState) {
    bid = normalizeBid(bid);
    var dice = flattenDice(diceOrPlayers);
    if (!bid) return 0;
    return dice.filter(function (value) {
      if (isPalaficoRound(roundState) || isAceBid(bid)) return value === bid.face;
      return value === bid.face || value === ACE_FACE;
    }).length;
  }

  function resolveDudo(caller, previousBidder, bid, roundState) {
    roundState = roundState || {};
    var actual = countBidMatches(bid, roundState.players || [], roundState);
    var bidTrue = actual >= Number(bid.quantity);
    var callerId = typeof caller === 'string' ? caller : caller && caller.id;
    var previousBidderId = typeof previousBidder === 'string' ? previousBidder : previousBidder && previousBidder.id;
    return {
      type: 'dudo',
      actual: actual,
      bidTrue: bidTrue,
      callerCorrect: !bidTrue,
      loserId: bidTrue ? callerId : previousBidderId,
      successfulDudoQuantity: bidTrue ? 0 : Number(bid.quantity),
      previousBidderLoses: !bidTrue,
      callerLoses: bidTrue
    };
  }

  function resolveCalza(caller, bid, roundState) {
    roundState = roundState || {};
    var actual = countBidMatches(bid, roundState.players || [], roundState);
    var callerId = typeof caller === 'string' ? caller : caller && caller.id;
    return {
      type: 'calza',
      actual: actual,
      exact: actual === Number(bid.quantity),
      callerId: callerId,
      loserId: actual === Number(bid.quantity) ? null : callerId,
      gainPlayerId: actual === Number(bid.quantity) ? callerId : null
    };
  }

  function applyDiceLoss(player, roundState) {
    if (!player || player.eliminated) return { lostDie: false, eliminated: false, startsPalafico: false };
    player.diceCount = Math.max(0, (Number(player.diceCount) || 0) - 1);
    if (Array.isArray(player.dice)) player.dice = player.dice.slice(0, player.diceCount);
    if (player.diceCount <= 0) player.eliminated = true;
    return {
      lostDie: true,
      eliminated: !!player.eliminated,
      startsPalafico: shouldStartPalafico(player, roundState)
    };
  }

  function applyDiceGain(player) {
    if (!player || player.eliminated) return { gainedDie: false };
    var before = Number(player.diceCount) || 0;
    player.diceCount = Math.min(5, before + 1);
    return { gainedDie: player.diceCount > before, capped: player.diceCount === 5 };
  }

  function determineNextRoundStarter(result, roundState) {
    var players = roundState && roundState.players || [];
    var starterId = result && (result.type === 'calza' ? result.callerId : result.loserId);
    var index = getPlayerIndex(players, starterId);
    var player = players[index];
    if (player && !player.empty && !player.eliminated && player.diceCount > 0) return player.id;
    var nextIndex = getNextActivePlayerIndex(players, index === -1 ? 0 : index);
    return nextIndex === -1 ? null : players[nextIndex].id;
  }

  function getFirstRoundStarterId(players) {
    var active = getActivePlayers(players);
    var best = active[0];
    var bestValue = -1;
    active.forEach(function (player) {
      var highest = Math.max.apply(null, player.dice || [0]);
      if (highest > bestValue) {
        bestValue = highest;
        best = player;
      }
    });
    return best && best.id;
  }

  function recordAceBid(roundState, bid) {
    if (!roundState || !isAceBid(bid)) return;
    roundState.aceBidsThisRound = roundState.aceBidsThisRound || [];
    if (roundState.aceBidsThisRound.indexOf(Number(bid.quantity)) === -1) roundState.aceBidsThisRound.push(Number(bid.quantity));
  }

  function makeTestPlayers() {
    return [
      { id: 'a', diceCount: 5, dice: [1, 4, 4, 6, 2] },
      { id: 'b', diceCount: 5, dice: [1, 3, 5, 6, 2] },
      { id: 'c', diceCount: 5, dice: [4, 2, 6, 6, 3] }
    ];
  }

  function runOfficialRulesTests() {
    var failed = [];
    function test(name, condition) { if (!condition) failed.push(name); }
    var players = makeTestPlayers();
    var state = { players: players, currentBid: null, previousBidderId: null, turnIndex: 0, aceBidsThisRound: [], calzaEnabled: true };
    test('normal bid progression', isLegalBid({ quantity: 1, face: 2 }, null, state, players[0]));
    test('illegal lower bid blocked', !isLegalBid({ quantity: 6, face: 6 }, { quantity: 7, face: 2 }, state, players[0]));
    test('same quantity higher face allowed', isLegalBid({ quantity: 7, face: 5 }, { quantity: 7, face: 4 }, state, players[0]));
    test('higher quantity lower face allowed', isLegalBid({ quantity: 8, face: 2 }, { quantity: 7, face: 6 }, state, players[0]));
    test('first bid cannot be aces in normal round', !isLegalBid({ quantity: 1, face: 1 }, null, state, players[0]));
    test('normal-to-aces minimum uses ceil(quantity / 2)', isLegalBid({ quantity: 6, face: 1 }, { quantity: 11, face: 3 }, state, players[0]) && !isLegalBid({ quantity: 5, face: 1 }, { quantity: 11, face: 3 }, state, players[0]));
    test('aces-to-normal minimum uses quantity * 2 + 1', isLegalBid({ quantity: 9, face: 2 }, { quantity: 4, face: 1 }, state, players[0]) && !isLegalBid({ quantity: 8, face: 6 }, { quantity: 4, face: 1 }, state, players[0]));
    state.aceBidsThisRound = [4];
    test('same ace quantity cannot be bid twice in same round', !isLegalBid({ quantity: 4, face: 1 }, { quantity: 8, face: 6 }, state, players[0]));
    var dudoState = { players: players, aceBidsThisRound: [], calzaEnabled: true };
    test('Dudo succeeds when actual count is lower than bid', resolveDudo('a', 'b', { quantity: 6, face: 4 }, dudoState).loserId === 'b');
    test('Dudo fails when actual count equals bid', resolveDudo('a', 'b', { quantity: 5, face: 4 }, dudoState).loserId === 'a');
    test('Dudo fails when actual count is higher than bid', resolveDudo('a', 'b', { quantity: 3, face: 4 }, dudoState).loserId === 'a');
    test('normal non-ace bid counts wild aces', countBidMatches({ quantity: 1, face: 4 }, players, dudoState) === 5);
    test('ace bid counts only aces', countBidMatches({ quantity: 1, face: 1 }, players, dudoState) === 2);
    var palPlayer = { id: 'p', diceCount: 2, dice: [3, 4], palaficoUsed: false };
    applyDiceLoss(palPlayer, { players: [palPlayer, players[0], players[1]] });
    test('Palafico starts after fourth die loss', palPlayer.diceCount === 1 && shouldStartPalafico(palPlayer, { players: [palPlayer, players[0], players[1]] }));
    markPalaficoUsed(palPlayer);
    test('Palafico only happens once per player', !shouldStartPalafico(palPlayer, { players: [palPlayer, players[0], players[1]] }));
    test('Palafico does not apply with two players remaining', !shouldStartPalafico({ id: 'x', diceCount: 1 }, { players: [{ id: 'x', diceCount: 1 }, { id: 'y', diceCount: 2 }] }));
    var palState = { players: players, palaficoActive: true, palaficoPlayerId: 'a', lockedFace: 4, currentBid: { quantity: 2, face: 4 } };
    test('Palafico disables wild aces', countBidMatches({ quantity: 1, face: 4 }, players, palState) === 3);
    test('Palafico locks face after opening bid', isLegalBid({ quantity: 3, face: 4 }, { quantity: 2, face: 4 }, palState, players[1]) && !isLegalBid({ quantity: 3, face: 5 }, { quantity: 2, face: 4 }, palState, players[1]));
    test('only Palafico player can open Palafico with aces', isLegalBid({ quantity: 1, face: 1 }, null, { players: players, palaficoActive: true, palaficoPlayerId: 'a' }, players[0]) && !isLegalBid({ quantity: 1, face: 1 }, null, { players: players, palaficoActive: true, palaficoPlayerId: 'a' }, players[1]));
    var usedOneDie = { id: 'u', diceCount: 1, palaficoUsed: true };
    test('player already Palafico can change face in a later Palafico round', isLegalBid({ quantity: 3, face: 5 }, { quantity: 2, face: 4 }, { players: [players[0], usedOneDie, players[1]], palaficoActive: true, palaficoPlayerId: 'a', lockedFace: 4 }, usedOneDie));
    test('Calza unavailable in Palafico', !canCallCalza(players[2], { players: players, currentBid: { quantity: 2, face: 4 }, previousBidderId: 'a', turnIndex: 1, palaficoActive: true, calzaEnabled: true }));
    test('Calza unavailable with two players', !canCallCalza({ id: 'x', diceCount: 1 }, { players: [{ id: 'x', diceCount: 1 }, { id: 'y', diceCount: 2 }], currentBid: { quantity: 2, face: 4 }, previousBidderId: 'y', turnIndex: 1, calzaEnabled: true }));
    test('Calza unavailable to current bidder', !canCallCalza(players[0], { players: players, currentBid: { quantity: 2, face: 4 }, previousBidderId: 'a', turnIndex: 1, calzaEnabled: true }));
    test('Calza unavailable to next player', !canCallCalza(players[1], { players: players, currentBid: { quantity: 2, face: 4 }, previousBidderId: 'a', turnIndex: 1, calzaEnabled: true }));
    var calzaCaller = { id: 'z', diceCount: 4, dice: [2, 2, 3, 5] };
    var calzaPlayers = [players[0], players[1], calzaCaller];
    var exact = resolveCalza(calzaCaller, { quantity: 5, face: 4 }, { players: players, calzaEnabled: true });
    applyDiceGain(calzaCaller);
    test('Calza exact match gives caller one die, max 5', exact.exact && calzaCaller.diceCount === 5 && applyDiceGain(calzaCaller).capped && calzaCaller.diceCount === 5);
    var wrongCaller = { id: 'w', diceCount: 2, dice: [2, 3] };
    var wrong = resolveCalza(wrongCaller, { quantity: 6, face: 4 }, { players: players, calzaEnabled: true });
    applyDiceLoss(wrongCaller, { players: [wrongCaller, players[0], players[1]] });
    test('Calza wrong loses caller one die', !wrong.exact && wrongCaller.diceCount === 1);
    test('previous bidder does not lose die on Calza', players[0].diceCount === 5);
    test('Calza caller starts next round if still active', determineNextRoundStarter({ type: 'calza', callerId: 'z' }, { players: calzaPlayers }) === 'z');
    var eliminatedCaller = { id: 'q', diceCount: 0, eliminated: true };
    test('eliminated Calza caller passes start to player on left', determineNextRoundStarter({ type: 'calza', callerId: 'q' }, { players: [players[0], eliminatedCaller, players[1]] }) === 'b');
    test('eliminated player is skipped', getNextActivePlayerIndex([{ id: 'x', diceCount: 1 }, { id: 'y', diceCount: 0, eliminated: true }, { id: 'z', diceCount: 1 }], 0) === 2);
    test('final player wins', getActivePlayers([{ id: 'x', diceCount: 0, eliminated: true }, { id: 'z', diceCount: 1 }]).length === 1);
    return failed;
  }

  var api = {
    ACE_FACE: ACE_FACE,
    NORMAL_FACES: NORMAL_FACES,
    getActivePlayers: getActivePlayers,
    getNextActivePlayerIndex: getNextActivePlayerIndex,
    isTwoPlayerEndgame: isTwoPlayerEndgame,
    isPalaficoRound: isPalaficoRound,
    isPalificoRound: isPalaficoRound,
    shouldStartPalafico: shouldStartPalafico,
    markPalaficoUsed: markPalaficoUsed,
    isAceBid: isAceBid,
    getMinimumAceBid: getMinimumAceBid,
    getMinimumOnesBid: function (quantityOrBid) { return getMinimumAceBid(typeof quantityOrBid === 'object' ? quantityOrBid : { quantity: quantityOrBid, face: 2 }); },
    getMinimumNormalBidFromAces: getMinimumNormalBidFromAces,
    getMinimumNormalBidFromOnes: function (quantityOrBid) { return getMinimumNormalBidFromAces(typeof quantityOrBid === 'object' ? quantityOrBid : { quantity: quantityOrBid, face: 1 }); },
    isLegalBid: isLegalBid,
    isValidBid: function (previousBid, nextBid, roundState, player) { return isLegalBid(nextBid, previousBid, roundState || {}, player || null); },
    isValidPalificoBid: function (previousBid, nextBid, lockedFace, player) {
      var palPlayer = player || { id: 'palafico-test-player', diceCount: 1, palaficoUsed: false };
      return isLegalBid(nextBid, previousBid, { players: [palPlayer, { id: 'x', diceCount: 2 }, { id: 'y', diceCount: 2 }], palaficoActive: true, lockedFace: lockedFace, palaficoPlayerId: palPlayer.id }, palPlayer);
    },
    getLegalBids: getLegalBids,
    canCallDudo: canCallDudo,
    canCallCalza: canCallCalza,
    getCalzaStatus: getCalzaStatus,
    countBidMatches: countBidMatches,
    countBidDice: function (players, bid, palaficoActive) {
      if (!palaficoActive) return countBidMatches(bid, players, { players: players, palaficoActive: false });
      bid = normalizeBid(bid);
      return flattenDice(players).filter(function (value) { return bid && value === bid.face; }).length;
    },
    resolveDudo: resolveDudo,
    resolveCalza: resolveCalza,
    applyDiceLoss: applyDiceLoss,
    applyDiceGain: applyDiceGain,
    determineNextRoundStarter: determineNextRoundStarter,
    getFirstRoundStarterId: getFirstRoundStarterId,
    recordAceBid: recordAceBid,
    runOfficialRulesTests: runOfficialRulesTests
  };

  window.PerudoRules = api;
  Object.assign(window, api);
})();
