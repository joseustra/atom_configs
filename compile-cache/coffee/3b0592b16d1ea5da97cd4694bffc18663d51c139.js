(function() {
  var GocoverParser, Range, fs, _;

  Range = require('atom').Range;

  _ = require('underscore-plus');

  fs = require('fs-plus');

  module.exports = GocoverParser = (function() {
    function GocoverParser() {}

    GocoverParser.prototype.setDataFile = function(file) {
      return this.dataFile = file;
    };

    GocoverParser.prototype.rangesForFile = function(file) {
      var ranges;
      ranges = this.ranges(this.dataFile);
      return _.filter(ranges, function(r) {
        return _.endsWith(file, r.file);
      });
    };

    GocoverParser.prototype.ranges = function(dataFile) {
      var data, error, extract, match, pattern, ranges;
      try {
        data = fs.readFileSync(dataFile, {
          encoding: 'utf8'
        });
      } catch (_error) {
        error = _error;
        return [];
      }
      ranges = [];
      pattern = /^(.+):(\d+).(\d+),(\d+).(\d+) (\d+) (\d+)$/img;
      extract = function(match) {
        var count, filePath, range, statements;
        if (match == null) {
          return;
        }
        filePath = match[1];
        statements = match[6];
        count = match[7];
        range = new Range([parseInt(match[2]) - 1, parseInt(match[3]) - 1], [parseInt(match[4]) - 1, parseInt(match[5]) - 1]);
        return ranges.push({
          range: range,
          count: parseInt(count),
          file: filePath
        });
      };
      while (true) {
        match = pattern.exec(data);
        extract(match);
        if (match == null) {
          break;
        }
      }
      return ranges;
    };

    return GocoverParser;

  })();

}).call(this);
