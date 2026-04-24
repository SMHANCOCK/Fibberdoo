(function () {
  function getMinimumOnesBid(previousQuantity) {
    // Switching from a normal face to Pacos/ones halves the quantity, rounded up.
    return Math.ceil(previousQuantity / 2);
  }

  function getMinimumNormalBidFromOnes(onesQuantity) {
    // Switching away from Pacos/ones must more than double the ones bid.
    return onesQuantity * 2 + 1;
  }

  function isValidBid(previousBid, nextBid) {
    if (!nextBid || nextBid.quantity < 1 || nextBid.face < 1 || nextBid.face > 6) return false;
    // Normal rounds cannot open on ones because ones are wild for bids on 2-6.
    if (!previousBid) return nextBid.face !== 1;
    if (previousBid.face === 1 && nextBid.face !== 1) {
      return nextBid.quantity >= getMinimumNormalBidFromOnes(previousBid.quantity);
    }
    if (previousBid.face !== 1 && nextBid.face === 1) {
      return nextBid.quantity >= getMinimumOnesBid(previousBid.quantity);
    }
    // Same face must increase quantity; higher face can keep quantity.
    if (nextBid.face === previousBid.face) return nextBid.quantity > previousBid.quantity;
    return nextBid.quantity >= previousBid.quantity && nextBid.face > previousBid.face;
  }

  function isValidPalificoBid(previousBid, nextBid, lockedFace) {
    if (!nextBid || nextBid.quantity < 1 || nextBid.face < 1 || nextBid.face > 6) return false;
    // The opening Palifico bid locks the face. After that, only quantity can rise.
    if (!previousBid) return true;
    return nextBid.face === lockedFace && nextBid.quantity > previousBid.quantity;
  }

  function countBidDice(players, bid, palificoActive) {
    // Dudo reveals every active player's dice. In normal rounds, ones are wild for faces 2-6.
    // If the bid is on ones, or during Palifico, only exact matching dice count.
    return players.filter(function (p) { return !p.empty && !p.eliminated; }).reduce(function (total, player) {
      return total + player.dice.filter(function (value) {
        if (bid.face === 1 || palificoActive) return value === bid.face;
        return value === bid.face || value === 1;
      }).length;
    }, 0);
  }

  function determineNextRoundStarter(players, loserId) {
    // The challenge loser usually starts the next round. If they hit 0 dice, the next
    // active player clockwise takes the first bid instead.
    var active = players.filter(function (p) { return !p.empty && !p.eliminated; });
    if (!active.length) return null;
    var loser = players.find(function (p) { return p.id === loserId; });
    if (loser && !loser.eliminated) return loser.id;
    var startIndex = Math.max(0, players.findIndex(function (p) { return p.id === loserId; }));
    for (var offset = 1; offset <= players.length; offset += 1) {
      var candidate = players[(startIndex + offset) % players.length];
      if (candidate && !candidate.empty && !candidate.eliminated) return candidate.id;
    }
    return active[0].id;
  }

  function resolveDudo(players, bid, challengerId, bidderId, palificoActive) {
    // If actual dice are greater than or equal to the bid, the bid survives and the
    // challenger loses a die. If actual is lower, the previous bidder loses one.
    var actual = countBidDice(players, bid, palificoActive);
    var callerCorrect = actual < bid.quantity;
    return {
      actual: actual,
      callerCorrect: callerCorrect,
      loserId: callerCorrect ? bidderId : challengerId,
      successfulDudoQuantity: callerCorrect ? bid.quantity : 0
    };
  }

  window.PerudoRules = {
    isValidBid: isValidBid,
    isValidPalificoBid: isValidPalificoBid,
    countBidDice: countBidDice,
    getMinimumOnesBid: getMinimumOnesBid,
    getMinimumNormalBidFromOnes: getMinimumNormalBidFromOnes,
    determineNextRoundStarter: determineNextRoundStarter,
    resolveDudo: resolveDudo
  };
  window.isValidBid = isValidBid;
  window.isValidPalificoBid = isValidPalificoBid;
  window.countBidDice = countBidDice;
  window.getMinimumOnesBid = getMinimumOnesBid;
  window.getMinimumNormalBidFromOnes = getMinimumNormalBidFromOnes;
  window.determineNextRoundStarter = determineNextRoundStarter;
})();
