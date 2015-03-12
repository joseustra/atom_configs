(function() {
  var $, Marker, _;

  $ = require('jquery');

  _ = require('underscore');

  module.exports = Marker = {
    markRows: function(rows, colour) {
      return _.each(rows, (function(_this) {
        return function(row) {
          return _this.addMarker(row, colour);
        };
      })(this));
    },
    clearMarkers: function(colour) {
      return $("atom-text-editor#AtomPair::shadow .line-number").each((function(_this) {
        return function(index, line) {
          return $(line).removeClass(colour);
        };
      })(this));
    },
    addMarker: function(line, colour) {
      var element;
      element = $("atom-text-editor#AtomPair::shadow .line-number-" + line);
      if (element.length === 0) {
        return this.timeouts.push(setTimeout(((function(_this) {
          return function() {
            return _this.addMarker(line, colour);
          };
        })(this)), 50));
      } else {
        _.each(this.timeouts, function(timeout) {
          return clearTimeout(timeout);
        });
        return element.addClass(colour);
      }
    },
    updateCollaboratorMarker: function(data) {
      this.clearMarkers(data.colour);
      return this.markRows(data.rows, data.colour);
    }
  };

}).call(this);
