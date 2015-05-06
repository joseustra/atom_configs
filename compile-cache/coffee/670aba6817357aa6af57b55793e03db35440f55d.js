(function() {
  var CustomPaste, chunkString, _;

  chunkString = require('../helpers/chunk-string');

  _ = require('underscore');

  module.exports = CustomPaste = {
    customPaste: function() {
      var chunks, text;
      text = atom.clipboard.read();
      if (text.length > 800) {
        chunks = chunkString(text, 800);
        return _.each(chunks, (function(_this) {
          return function(chunk, index) {
            return setTimeout((function() {
              atom.clipboard.write(chunk);
              _this.editor.pasteText();
              if (index === (chunks.length - 1)) {
                return atom.clipboard.write(text);
              }
            }), 180 * index);
          };
        })(this));
      } else {
        return this.editor.pasteText();
      }
    }
  };

}).call(this);
