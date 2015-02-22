(function() {
  var Suggestion, deprecate;

  deprecate = require('grim').deprecate;

  module.exports = Suggestion = (function() {
    function Suggestion(provider, options) {
      this.provider = provider;
      deprecate('`Suggestion` is no longer supported. Please switch to the new API: https://github.com/atom-community/autocomplete-plus/wiki/Provider-API');
      if (options.word != null) {
        this.word = options.word;
      }
      if (options.prefix != null) {
        this.prefix = options.prefix;
      }
      if (options.label != null) {
        this.label = options.label;
      }
      if (options.data != null) {
        this.data = options.data;
      }
      if (options.renderLabelAsHtml != null) {
        this.renderLabelAsHtml = options.renderLabelAsHtml;
      }
      if (options.className != null) {
        this.className = options.className;
      }
    }

    return Suggestion;

  })();

}).call(this);
