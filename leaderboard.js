(function () {
  var KEY = 'perudoGlobalLeaderboard';
  function loadLeaderboard() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function saveLeaderboard(board) { localStorage.setItem(KEY, JSON.stringify(board)); }
  function getWinRate(entry) { return entry && entry.gamesPlayed ? Math.round((entry.wins / entry.gamesPlayed) * 100) : 0; }
  function getSortedLeaderboard(board) {
    return Object.values(board || {}).sort(function (a, b) {
      return b.wins - a.wins || getWinRate(b) - getWinRate(a) || b.longestWinStreak - a.longestWinStreak || a.name.localeCompare(b.name);
    });
  }
  function getLeaderboardRank(name, board) {
    var sorted = getSortedLeaderboard(board || loadLeaderboard());
    var index = sorted.findIndex(function (entry) { return entry.name === name; });
    return index === -1 ? null : index + 1;
  }
  function getLeaderboardRankBadge(name, board) {
    var rank = getLeaderboardRank(name, board);
    if (!rank) return '🆕 New';
    if (rank === 1) return '🥇 #1';
    if (rank === 2) return '🥈 #2';
    if (rank === 3) return '🥉 #3';
    return '#' + rank;
  }
  function makeEntry(player) {
    return { name: player.name, avatar: player.avatar, cupColour: player.cupColour, wins: 0, gamesPlayed: 0, eliminations: 0, currentWinStreak: 0, longestWinStreak: 0, totalSuccessfulDudoQuantity: 0, largestSingleSuccessfulDudo: 0, cupColourUsage: {}, mostUsedCupColour: 'None', bestPerformingCupColour: 'None', lastPlayed: null };
  }
  function updateLeaderboardAfterGame(players, winnerId, dudoStats, previousBoard) {
    var board = loadLeaderboard();
    var before = previousBoard || JSON.parse(JSON.stringify(board));
    var changes = [];
    players.filter(function (p) { return !p.empty; }).forEach(function (player) {
      var entry = board[player.name] || makeEntry(player);
      var oldRank = getLeaderboardRank(player.name, before);
      var won = player.id === winnerId;
      entry.avatar = player.avatar;
      entry.cupColour = player.cupColour;
      entry.gamesPlayed += 1;
      entry.lastPlayed = new Date().toISOString();
      entry.eliminations += player.eliminated ? 1 : 0;
      if (won) {
        entry.wins += 1;
        entry.currentWinStreak += 1;
        entry.longestWinStreak = Math.max(entry.longestWinStreak, entry.currentWinStreak);
      } else {
        entry.currentWinStreak = 0;
      }
      var success = dudoStats[player.id] || { total: 0, largest: 0 };
      entry.totalSuccessfulDudoQuantity += success.total;
      entry.largestSingleSuccessfulDudo = Math.max(entry.largestSingleSuccessfulDudo, success.largest);
      window.updateCupColourStats(entry, player.cupColour, won);
      board[player.name] = entry;
      var afterPreview = Object.assign({}, board);
      var newRank = getLeaderboardRank(player.name, afterPreview);
      changes.push({ player: player, oldRank: oldRank, newRank: newRank, won: won });
    });
    saveLeaderboard(board);
    return { board: board, changes: changes };
  }
  function getLeaderboardStats(name) { return loadLeaderboard()[name] || null; }
  function colourSwatch(hex) { return '<span class="die" style="--die-bg:' + hex + ';--die-fg:' + window.PerudoCups.getContrastColour(hex) + '">•</span>'; }
  function renderLeaderboard(targetId) {
    var target = typeof targetId === 'string' ? document.getElementById(targetId) : targetId;
    if (!target) return;
    var rows = getSortedLeaderboard(loadLeaderboard()).map(function (entry, index) {
      return '<tr><td>' + getLeaderboardRankBadge(entry.name) + '</td><td>' + entry.avatar + '</td><td>' + colourSwatch(entry.cupColour) + '</td><td>' + entry.name + '</td><td>' + entry.wins + '</td><td>' + getWinRate(entry) + '%</td><td>' + entry.longestWinStreak + '</td><td>' + entry.totalSuccessfulDudoQuantity + '</td><td>' + entry.largestSingleSuccessfulDudo + '</td><td>' + entry.mostUsedCupColour + '</td><td>' + entry.bestPerformingCupColour + '</td><td>' + entry.eliminations + '</td><td>' + entry.gamesPlayed + '</td></tr>';
    }).join('');
    target.innerHTML = '<h3>Leaderboard</h3><table><thead><tr><th>Rank</th><th>Avatar</th><th>Cup</th><th>Name</th><th>Wins</th><th>Win Rate</th><th>Longest Streak</th><th>Total Dudo Qty</th><th>Largest Dudo</th><th>Most Used Cup</th><th>Best Cup</th><th>Elims</th><th>Games</th></tr></thead><tbody>' + (rows || '<tr><td colspan="13">No games yet.</td></tr>') + '</tbody></table>';
  }
  function animateRankChange(change) {
    if (!change.oldRank) return change.player.avatar + ' ' + change.player.name + ' enters the leaderboard at #' + change.newRank;
    if (change.newRank < change.oldRank) return change.player.avatar + ' ' + change.player.name + ' climbs to ' + getLeaderboardRankBadge(change.player.name);
    if (change.newRank > change.oldRank) return change.player.avatar + ' ' + change.player.name + ' drops to #' + change.newRank;
    return change.player.avatar + ' ' + change.player.name + ' holds #' + change.newRank;
  }
  window.PerudoLeaderboard = { loadLeaderboard: loadLeaderboard, saveLeaderboard: saveLeaderboard, updateLeaderboardAfterGame: updateLeaderboardAfterGame, getLeaderboardRank: getLeaderboardRank, getLeaderboardStats: getLeaderboardStats, getSortedLeaderboard: getSortedLeaderboard, getWinRate: getWinRate, renderLeaderboard: renderLeaderboard, getLeaderboardRankBadge: getLeaderboardRankBadge, animateRankChange: animateRankChange };
  Object.assign(window, window.PerudoLeaderboard);
})();
