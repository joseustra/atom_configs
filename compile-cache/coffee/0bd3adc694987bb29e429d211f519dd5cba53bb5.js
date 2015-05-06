(function() {
  var AtomPairView, View, _,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  View = require('space-pen').View;

  _ = require('underscore');

  module.exports = AtomPairView = (function(_super) {
    __extends(AtomPairView, _super);

    function AtomPairView() {
      return AtomPairView.__super__.constructor.apply(this, arguments);
    }

    AtomPairView.prototype.initialize = function() {
      if (this.panel == null) {
        this.panel = atom.workspace.addModalPanel({
          item: this,
          visible: true
        });
      }
      this.focus();
      return this.on('core:cancel', (function(_this) {
        return function() {
          _this.panel.hide();
          return _this.focusout();
        };
      })(this));
    };

    return AtomPairView;

  })(View);

}).call(this);
