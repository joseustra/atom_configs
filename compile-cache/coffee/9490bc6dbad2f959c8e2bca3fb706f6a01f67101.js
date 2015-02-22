(function() {
  var Provider, deprecate,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  deprecate = require('grim').deprecate;

  module.exports = Provider = (function() {
    Provider.prototype.wordRegex = /\b\w*[a-zA-Z_-]+\w*\b/g;

    function Provider() {
      this.buildSuggestionsShim = __bind(this.buildSuggestionsShim, this);
      deprecate('`Provider` is no longer supported. Please switch to the new API: https://github.com/atom-community/autocomplete-plus/wiki/Provider-API');
      this.initialize.apply(this, arguments);
    }

    Provider.prototype.initialize = function() {};

    Provider.prototype.exclusive = false;

    Provider.prototype.buildSuggestionsShim = function(options) {
      if ((options != null ? options.editor : void 0) == null) {
        return;
      }
      this.editor = options.editor;
      return this.buildSuggestions.apply(this, arguments);
    };

    Provider.prototype.buildSuggestions = function() {
      throw new Error('Subclass must implement a buildSuggestions(options) method');
    };

    Provider.prototype.confirm = function(suggestion) {
      return true;
    };

    Provider.prototype.prefixOfSelection = function(selection) {
      var lineRange, prefix, selectionRange;
      selectionRange = selection.getBufferRange();
      lineRange = [[selectionRange.start.row, 0], [selectionRange.end.row, this.editor.lineTextForBufferRow(selectionRange.end.row).length]];
      prefix = '';
      this.editor.getBuffer().scanInRange(this.wordRegex, lineRange, function(_arg) {
        var match, prefixOffset, range, stop;
        match = _arg.match, range = _arg.range, stop = _arg.stop;
        if (range.start.isGreaterThan(selectionRange.end)) {
          stop();
        }
        if (range.intersectsWith(selectionRange)) {
          prefixOffset = selectionRange.start.column - range.start.column;
          if (range.start.isLessThan(selectionRange.start)) {
            return prefix = match[0].slice(0, prefixOffset);
          }
        }
      });
      return prefix;
    };

    return Provider;

  })();

}).call(this);
