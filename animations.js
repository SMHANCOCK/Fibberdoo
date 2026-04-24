(function () {
  function skip() { return localStorage.getItem('perudoSkipAnimations') === 'true'; }
  function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  function animateSelector(selector, className, ms) {
    if (skip()) return Promise.resolve();
    var nodes = Array.from(document.querySelectorAll(selector));
    nodes.forEach(function (node) { node.classList.add(className); });
    return new Promise(function (resolve) { setTimeout(function () { nodes.forEach(function (node) { node.classList.remove(className); }); resolve(); }, ms || 750); });
  }
  function animateDiceRoll(playerId) { return animateSelector(playerId ? '[data-player-id="' + playerId + '"] .die' : '.seat:not(.eliminated) .die', 'roll', 800); }
  function animateDiceReveal(playerId) { return animateSelector('[data-player-id="' + playerId + '"] .die', 'reveal', 720); }
  function animateDieLoss(playerId) { return animateSelector('[data-player-id="' + playerId + '"] .die:last-child', 'lose', 650); }
  function animateElimination(playerId) { return animateSelector('[data-player-id="' + playerId + '"]', 'vanish', 700); }
  function animateWinnerDice(playerId) { var seat = document.querySelector('[data-player-id="' + playerId + '"]'); if (seat) seat.classList.add('winner-pulse'); }
  function animateRankChange(change) { return window.PerudoLeaderboard ? window.PerudoLeaderboard.animateRankChange(change) : ''; }

  function getChallengeCountTargets(bid, players, isPalifico) {
    var faceMatches = [];
    var wildMatches = [];
    players.filter(function (p) { return !p.empty && !p.eliminated; }).forEach(function (player) {
      player.dice.forEach(function (value, index) {
        var target = { playerId: player.id, dieIndex: index, value: value };
        if (value === bid.face) faceMatches.push(target);
        else if (!isPalifico && bid.face !== 1 && value === 1) wildMatches.push(target);
      });
    });
    return faceMatches.concat(wildMatches);
  }

  async function animateChallengeCount(bid, players, isPalifico, options) {
    options = options || {};
    var perDieMs = options.perDieMs || 400;
    var finalPauseMs = options.finalPauseMs || 800;
    var onCount = options.onCount || function () {};
    var targets = getChallengeCountTargets(bid, players, isPalifico);
    document.querySelectorAll('.die.count-target, .die.counted').forEach(function (die) {
      die.classList.remove('count-target', 'counted');
    });
    for (var i = 0; i < targets.length; i += 1) {
      var target = targets[i];
      var die = document.querySelector('[data-player-id="' + target.playerId + '"] [data-die-index="' + target.dieIndex + '"]');
      onCount(i + 1, target, targets.length);
      if (die && !skip()) {
        die.classList.add('count-target');
        await wait(perDieMs);
        die.classList.remove('count-target');
        die.classList.add('counted');
      } else {
        await wait(skip() ? 0 : perDieMs);
      }
    }
    await wait(skip() ? 0 : finalPauseMs);
    return targets.length;
  }

  window.PerudoAnimations = { animateDiceRoll: animateDiceRoll, animateDiceReveal: animateDiceReveal, animateDieLoss: animateDieLoss, animateElimination: animateElimination, animateWinnerDice: animateWinnerDice, animateRankChange: animateRankChange, animateChallengeCount: animateChallengeCount, getChallengeCountTargets: getChallengeCountTargets };
  Object.assign(window, window.PerudoAnimations);
})();
