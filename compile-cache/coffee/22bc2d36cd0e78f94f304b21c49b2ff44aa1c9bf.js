(function() {
  var GrammarSync;

  module.exports = GrammarSync = {
    syncGrammars: function() {
      return this.editor.on('grammar-changed', (function(_this) {
        return function() {
          return _this.sendGrammar();
        };
      })(this));
    },
    sendGrammar: function() {
      var grammar;
      grammar = this.editor.getGrammar();
      return this.pairingChannel.trigger('client-grammar-sync', grammar.scopeName);
    }
  };

}).call(this);
