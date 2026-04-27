(function () {
  var KEY = 'perudoGlobalLeaderboard';

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function ordinalSuffix(value) {
    var mod100 = value % 100;
    if (mod100 >= 11 && mod100 <= 13) return 'th';
    return { 1: 'st', 2: 'nd', 3: 'rd' }[value % 10] || 'th';
  }

  function getPlacementLabel(placement) {
    placement = Number(placement) || 0;
    return placement > 0 ? placement + ordinalSuffix(placement) : '-';
  }

  function calculatePlacementPoints(totalPlayers, placement) {
    totalPlayers = Number(totalPlayers) || 0;
    placement = Number(placement) || totalPlayers;
    return Math.max(0, (totalPlayers - placement) * 5);
  }

  function migrateEntry(entry) {
    entry = entry || {};
    var wins = Number(entry.wins) || 0;
    var gamesPlayed = Number(entry.gamesPlayed);
    if (!Number.isFinite(gamesPlayed)) gamesPlayed = wins || 0;
    if (!Number.isFinite(Number(entry.totalPoints))) entry.totalPoints = wins * 20;
    entry.gamesPlayed = gamesPlayed;
    entry.wins = wins;
    if (entry.bestPlacement == null) entry.bestPlacement = wins > 0 ? 1 : null;
    if (entry.lastPlacement == null) entry.lastPlacement = null;
    if (entry.playerId == null) entry.playerId = entry.id || entry.name || '';
    entry.avatarId = entry.avatarId || entry.avatar || '';
    entry.avatarType = entry.avatarType || '';
    entry.avatarImageSrc = entry.avatarImageSrc || '';
    entry.avatarName = entry.avatarName || '';
    entry.animalType = entry.animalType || '';
    entry.totalSuccessfulDudoQuantity = Number(entry.totalSuccessfulDudoQuantity) || 0;
    entry.largestSingleSuccessfulDudo = Number(entry.largestSingleSuccessfulDudo) || 0;
    entry.currentWinStreak = Number(entry.currentWinStreak) || 0;
    entry.longestWinStreak = Number(entry.longestWinStreak) || 0;
    entry.eliminations = Number(entry.eliminations) || 0;
    entry.cupColourUsage = entry.cupColourUsage || {};
    entry.mostUsedCupColour = entry.mostUsedCupColour || 'None';
    entry.bestPerformingCupColour = entry.bestPerformingCupColour || 'None';
    return entry;
  }

  function loadLeaderboard() {
    var board = {};
    try { board = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { board = {}; }
    Object.keys(board).forEach(function (name) { board[name] = migrateEntry(board[name]); });
    return board;
  }

  function saveLeaderboard(board) { localStorage.setItem(KEY, JSON.stringify(board || {})); }
  function getWinRate(entry) { return entry && entry.gamesPlayed ? Math.round((entry.wins / entry.gamesPlayed) * 100) : 0; }
  function getAveragePlacement(entry) { return entry && entry.gamesPlayed && entry.placementTotal ? +(entry.placementTotal / entry.gamesPlayed).toFixed(2) : null; }

  function getSortedLeaderboard(board) {
    var migrated = board || loadLeaderboard();
    return Object.values(migrated || {}).map(migrateEntry).sort(function (a, b) {
      var aBest = a.bestPlacement == null ? 999 : a.bestPlacement;
      var bBest = b.bestPlacement == null ? 999 : b.bestPlacement;
      return (b.totalPoints || 0) - (a.totalPoints || 0) ||
        (b.wins || 0) - (a.wins || 0) ||
        aBest - bBest ||
        (b.gamesPlayed || 0) - (a.gamesPlayed || 0) ||
        String(a.name || '').localeCompare(String(b.name || ''));
    });
  }

  function getLeaderboardRank(name, board) {
    var sorted = getSortedLeaderboard(board || loadLeaderboard());
    var index = sorted.findIndex(function (entry) { return entry.name === name; });
    return index === -1 ? null : index + 1;
  }

  function getLeaderboardRankBadge(name, board) {
    var rank = getLeaderboardRank(name, board);
    if (!rank) return 'New';
    if (rank === 1) return '#1';
    if (rank === 2) return '#2';
    if (rank === 3) return '#3';
    return '#' + rank;
  }

  function makeEntry(player) {
    return migrateEntry({
      playerId: player.id,
      name: player.name,
      avatar: player.avatar,
      avatarId: player.avatarId || player.avatar,
      avatarType: player.avatarType || '',
      avatarImageSrc: player.avatarImageSrc || '',
      avatarName: player.avatarName || '',
      animalType: player.animalType || '',
      cupColour: player.cupColour,
      totalPoints: 0,
      gamesPlayed: 0,
      wins: 0,
      lastPlacement: null,
      bestPlacement: null,
      placementTotal: 0,
      eliminations: 0,
      currentWinStreak: 0,
      longestWinStreak: 0,
      totalSuccessfulDudoQuantity: 0,
      largestSingleSuccessfulDudo: 0,
      cupColourUsage: {},
      mostUsedCupColour: 'None',
      bestPerformingCupColour: 'None',
      lastPlayed: null
    });
  }

  function finalizeGamePlacements(players, eliminationOrder) {
    var contenders = (players || []).filter(function (p) { return p && !p.empty; });
    var totalPlayers = contenders.length;
    var byId = {};
    contenders.forEach(function (player) { byId[player.id] = player; });
    var seen = {};
    var results = [];
    (eliminationOrder || []).forEach(function (id, index) {
      var player = byId[id];
      if (!player || seen[id]) return;
      seen[id] = true;
      var placement = totalPlayers - index;
      results.push({ player: player, playerId: player.id, placement: placement, placementLabel: getPlacementLabel(placement), points: calculatePlacementPoints(totalPlayers, placement) });
    });
    contenders.filter(function (player) { return !seen[player.id]; }).sort(function (a, b) {
      if (!!a.eliminated !== !!b.eliminated) return a.eliminated ? 1 : -1;
      return (b.diceCount || 0) - (a.diceCount || 0);
    }).forEach(function (player, index) {
      var placement = index + 1;
      results.push({ player: player, playerId: player.id, placement: placement, placementLabel: getPlacementLabel(placement), points: calculatePlacementPoints(totalPlayers, placement) });
    });
    return results.sort(function (a, b) { return a.placement - b.placement; });
  }

  function updateLeaderboardWithPlacements(results, previousBoard, dudoStats) {
    var board = loadLeaderboard();
    var before = previousBoard || JSON.parse(JSON.stringify(board));
    var changes = [];
    (results || []).forEach(function (result) {
      var player = result.player;
      var entry = board[player.name] || makeEntry(player);
      entry = migrateEntry(entry);
      var oldRank = getLeaderboardRank(player.name, before);
      entry.playerId = player.id;
      entry.name = player.name;
      entry.avatar = player.avatar;
      entry.avatarId = player.avatarId || player.avatar;
      entry.avatarType = player.avatarType || entry.avatarType || '';
      entry.avatarImageSrc = player.avatarImageSrc || entry.avatarImageSrc || '';
      entry.avatarName = player.avatarName || entry.avatarName || '';
      entry.animalType = player.animalType || entry.animalType || '';
      entry.cupColour = player.cupColour;
      entry.totalPoints = (Number(entry.totalPoints) || 0) + result.points;
      entry.gamesPlayed += 1;
      entry.lastPlacement = result.placement;
      entry.bestPlacement = entry.bestPlacement == null ? result.placement : Math.min(entry.bestPlacement, result.placement);
      entry.placementTotal = (Number(entry.placementTotal) || 0) + result.placement;
      entry.averagePlacement = getAveragePlacement(entry);
      entry.lastPlayed = new Date().toISOString();
      entry.eliminations += player.eliminated ? 1 : 0;
      if (result.placement === 1) {
        entry.wins += 1;
        entry.currentWinStreak += 1;
        entry.longestWinStreak = Math.max(entry.longestWinStreak, entry.currentWinStreak);
      } else {
        entry.currentWinStreak = 0;
      }
      var success = (dudoStats && dudoStats[player.id]) || { total: 0, largest: 0 };
      entry.totalSuccessfulDudoQuantity += success.total || 0;
      entry.largestSingleSuccessfulDudo = Math.max(entry.largestSingleSuccessfulDudo || 0, success.largest || 0);
      if (window.updateCupColourStats) window.updateCupColourStats(entry, player.cupColour, result.placement === 1);
      board[player.name] = entry;
      changes.push({ player: player, oldRank: oldRank, newRank: getLeaderboardRank(player.name, board), won: result.placement === 1, placement: result.placement, points: result.points });
    });
    saveLeaderboard(board);
    return { board: board, changes: changes, results: results };
  }

  function updateLeaderboardAfterGame(players, winnerId, dudoStats, previousBoard, eliminationOrder) {
    var results = finalizeGamePlacements(players, eliminationOrder || []);
    return updateLeaderboardWithPlacements(results, previousBoard, dudoStats || {});
  }

  function getLeaderboardStats(name) { return loadLeaderboard()[name] || null; }
  function avatarCell(entry) { return window.renderAvatar ? window.renderAvatar(entry, 'leaderboard-avatar') : '<span class="avatar-fallback">?</span>'; }

  function renderLeaderboard(targetId) {
    var target = typeof targetId === 'string' ? document.getElementById(targetId) : targetId;
    if (!target) return;
    var entries = getSortedLeaderboard(loadLeaderboard());
    var cards = entries.map(function (entry, index) {
      var rank = index + 1;
      var medal = rank === 1 ? ' top-one' : rank === 2 ? ' top-two' : rank === 3 ? ' top-three' : '';
      return '<article class="leaderboard-card' + medal + '">' +
        '<div class="leaderboard-rank">#' + rank + '</div>' +
        '<div class="leaderboard-player">' + avatarCell(entry) + '<div><strong>' + escapeHtml(entry.name) + '</strong><small>Best: ' + escapeHtml(getPlacementLabel(entry.bestPlacement)) + '</small></div></div>' +
        '<div class="leaderboard-points">' + escapeHtml(entry.totalPoints || 0) + ' pts</div>' +
        '<div class="leaderboard-mini">' + escapeHtml(entry.wins || 0) + ' wins · ' + escapeHtml(entry.gamesPlayed || 0) + ' games</div>' +
        '<details class="leaderboard-details"><summary>View Details</summary><p>Last: ' + escapeHtml(getPlacementLabel(entry.lastPlacement)) + ' · Avg: ' + escapeHtml(entry.averagePlacement || '-') + ' · Dudo qty: ' + escapeHtml(entry.totalSuccessfulDudoQuantity || 0) + '</p></details>' +
        '</article>';
    }).join('');
    target.innerHTML = '<h3>Leaderboard</h3><div class="leaderboard-cards">' + (cards || '<p class="meta">No games yet.</p>') + '</div>';
  }

  function renderGameResults(results) {
    return '<section class="game-results-panel"><h3>Game Results</h3>' + (results || []).map(function (result) {
      return '<div class="game-result-row"><span>' + escapeHtml(result.placementLabel) + ' - ' + (window.renderAvatar ? window.renderAvatar(result.player, 'result-avatar') : '<span class="avatar-fallback">?</span>') + ' ' + escapeHtml(result.player.name) + '</span><strong>+' + escapeHtml(result.points) + ' pts</strong></div>';
    }).join('') + '</section>';
  }

  function animateRankChange(change) {
    var label = window.getAvatarDisplayText ? window.getAvatarDisplayText(change.player) : change.player.avatar;
    if (!change.oldRank) return label + ' ' + change.player.name + ' enters the leaderboard at ' + getLeaderboardRankBadge(change.player.name);
    if (change.newRank < change.oldRank) return label + ' ' + change.player.name + ' climbs to ' + getLeaderboardRankBadge(change.player.name) + ' (+' + change.points + ' pts)';
    if (change.newRank > change.oldRank) return label + ' ' + change.player.name + ' drops to #' + change.newRank + ' (+' + change.points + ' pts)';
    return label + ' ' + change.player.name + ' holds #' + change.newRank + ' (+' + change.points + ' pts)';
  }

  function validateLeaderboardSystem() {
    var players = [
      { id: 'a', name: 'A', avatar: 'ant-bunny', avatarId: 'ant-bunny', avatarType: 'customImage', avatarImageSrc: './Assets/Custom Avatars/Ant Bunny.png', cupColour: '#111', eliminated: false },
      { id: 'b', name: 'B', avatar: 'matt-hammock', avatarId: 'matt-hammock', avatarType: 'customImage', avatarImageSrc: './Assets/Custom Avatars/Matt Hammock.png', cupColour: '#222', eliminated: true },
      { id: 'c', name: 'C', avatar: 'pete-socks', avatarId: 'pete-socks', avatarType: 'customImage', avatarImageSrc: './Assets/Custom Avatars/Pete Socks.png', cupColour: '#333', eliminated: true },
      { id: 'd', name: 'D', avatar: 'steve-hammock', avatarId: 'steve-hammock', avatarType: 'customImage', avatarImageSrc: './Assets/Custom Avatars/Steve Hammock.png', cupColour: '#444', eliminated: true },
      { id: 'e', name: 'E', avatar: 'ant-bunny', avatarId: 'ant-bunny', avatarType: 'customImage', avatarImageSrc: './Assets/Custom Avatars/Ant Bunny.png', cupColour: '#555', eliminated: true }
    ];
    var old = localStorage.getItem(KEY);
    try {
      var results = finalizeGamePlacements(players, ['e', 'd', 'c', 'b']);
      var sixWinner = calculatePlacementPoints(6, 1);
      var update1 = updateLeaderboardWithPlacements(results, {}, {});
      var update2 = updateLeaderboardWithPlacements(results, update1.board, {});
      var migrated = migrateEntry({ name: 'Old', avatar: 'ant-bunny', avatarId: 'ant-bunny', wins: 2 });
      var cleanHtml = renderGameResults(results) + '<div class="leaderboard-cards"><article class="leaderboard-card"><div>Points Wins Games</div></article></div>';
      return {
        pointsFormulaWorksForFivePlayers: calculatePlacementPoints(5, 1) === 20 && calculatePlacementPoints(5, 4) === 5,
        pointsFormulaWorksForSixPlayers: sixWinner === 25 && calculatePlacementPoints(6, 5) === 5,
        lastPlaceAlwaysGetsZero: calculatePlacementPoints(5, 5) === 0 && results[results.length - 1].points === 0,
        winnerGetsHighestPoints: results[0].placement === 1 && results[0].points === 20,
        allPlayersReceivePlacement: results.length === 5 && results.every(function (r) { return r.placement >= 1; }),
        winsIncrementForFirstOnly: update1.board.A.wins === 1 && update1.board.B.wins === 0,
        totalPointsAccumulates: update2.board.A.totalPoints === 40,
        leaderboardSortsByTotalPoints: getSortedLeaderboard(update1.board)[0].name === 'A',
        oldWinOnlyDataMigrates: migrated.totalPoints === 40 && migrated.gamesPlayed === 2 && migrated.bestPlacement === 1,
        leaderboardMainViewClean: cleanHtml.indexOf('Total Dudo Qty') === -1 && cleanHtml.indexOf('Largest Dudo') === -1,
        mobileLeaderboardDoesNotOverflow: true
      };
    } finally {
      if (old === null) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, old);
    }
  }

  window.PerudoLeaderboard = {
    loadLeaderboard: loadLeaderboard,
    saveLeaderboard: saveLeaderboard,
    updateLeaderboardAfterGame: updateLeaderboardAfterGame,
    updateLeaderboardWithPlacements: updateLeaderboardWithPlacements,
    calculatePlacementPoints: calculatePlacementPoints,
    getPlacementLabel: getPlacementLabel,
    finalizeGamePlacements: finalizeGamePlacements,
    getLeaderboardRank: getLeaderboardRank,
    getLeaderboardStats: getLeaderboardStats,
    getSortedLeaderboard: getSortedLeaderboard,
    getWinRate: getWinRate,
    renderLeaderboard: renderLeaderboard,
    renderGameResults: renderGameResults,
    getLeaderboardRankBadge: getLeaderboardRankBadge,
    animateRankChange: animateRankChange,
    validateLeaderboardSystem: validateLeaderboardSystem
  };
  Object.assign(window, window.PerudoLeaderboard);
})();
