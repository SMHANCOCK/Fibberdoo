(function () {
  function normalizeColour(colour) { return colour || '#777777'; }
  function hexToRgb(hex) {
    var clean = normalizeColour(hex).replace('#', '');
    if (clean.length === 3) clean = clean.split('').map(function (x) { return x + x; }).join('');
    var num = parseInt(clean, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }
  function getContrastColour(hex) {
    var rgb = hexToRgb(hex);
    var luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.58 ? '#1c1712' : '#fff8e7';
  }
  function ensureCupStats(stats, colour) {
    var key = normalizeColour(colour);
    stats[key] = stats[key] || { gamesPlayed: 0, wins: 0, losses: 0 };
    return stats[key];
  }
  function updateCupColourStats(entry, colour, won) {
    entry.cupColourUsage = entry.cupColourUsage || {};
    var stat = ensureCupStats(entry.cupColourUsage, colour);
    stat.gamesPlayed += 1;
    if (won) stat.wins += 1; else stat.losses += 1;
    entry.mostUsedCupColour = getMostUsedCupColour(entry.cupColourUsage);
    entry.bestPerformingCupColour = getBestPerformingCupColour(entry.cupColourUsage);
    return entry;
  }
  function getCupColourWinRate(stat) {
    if (!stat || !stat.gamesPlayed) return 0;
    return Math.round((stat.wins / stat.gamesPlayed) * 100);
  }
  function getMostUsedCupColour(stats) {
    var entries = Object.entries(stats || {});
    if (!entries.length) return 'None';
    return entries.sort(function (a, b) { return b[1].gamesPlayed - a[1].gamesPlayed; })[0][0];
  }
  function getBestPerformingCupColour(stats) {
    var entries = Object.entries(stats || {}).filter(function (item) { return item[1].gamesPlayed > 0; });
    if (!entries.length) return 'None';
    return entries.sort(function (a, b) {
      return getCupColourWinRate(b[1]) - getCupColourWinRate(a[1]) || b[1].wins - a[1].wins;
    })[0][0];
  }
  window.PerudoCups = { getContrastColour: getContrastColour, updateCupColourStats: updateCupColourStats, getMostUsedCupColour: getMostUsedCupColour, getBestPerformingCupColour: getBestPerformingCupColour, getCupColourWinRate: getCupColourWinRate };
  window.updateCupColourStats = updateCupColourStats;
  window.getMostUsedCupColour = getMostUsedCupColour;
  window.getBestPerformingCupColour = getBestPerformingCupColour;
  window.getCupColourWinRate = getCupColourWinRate;
})();
