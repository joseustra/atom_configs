(function() {
  var AtomConfig,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  module.exports = AtomConfig = (function() {
    function AtomConfig() {
      this.allfunctionalitydisabled = __bind(this.allfunctionalitydisabled, this);
    }

    AtomConfig.prototype.defaults = function() {
      atom.config.set('go-plus.environmentOverridesConfiguration', true);
      atom.config.set('go-plus.formatArgs', '-w -e');
      atom.config.set('go-plus.vetArgs', '');
      atom.config.set('go-plus.formatTool', 'goimports');
      atom.config.set('go-plus.goPath', '');
      atom.config.set('go-plus.golintArgs', '');
      atom.config.set('go-plus.showPanel', true);
      return atom.config.set('go-plus.showPanelWhenNoIssuesExist', false);
    };

    AtomConfig.prototype.allfunctionalitydisabled = function() {
      this.defaults();
      atom.config.set('go-plus.syntaxCheckOnSave', false);
      atom.config.set('go-plus.formatOnSave', false);
      atom.config.set('go-plus.formatTool', 'gofmt');
      atom.config.set('go-plus.getMissingTools', false);
      atom.config.set('go-plus.vetOnSave', false);
      atom.config.set('go-plus.lintOnSave', false);
      atom.config.set('go-plus.runCoverageOnSave', false);
      return atom.config.set('autocomplete-plus.enableAutoActivation', false);
    };

    return AtomConfig;

  })();

}).call(this);
