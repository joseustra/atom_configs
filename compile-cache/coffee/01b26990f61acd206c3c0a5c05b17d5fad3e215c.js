(function() {
  var AlertView, AtomPairView,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  AtomPairView = require('./atom-pair-view');

  module.exports = AlertView = (function(_super) {
    __extends(AlertView, _super);

    function AlertView() {
      return AlertView.__super__.constructor.apply(this, arguments);
    }

    AlertView.content = function(message) {
      return this.div({
        tabindex: 1
      }, (function(_this) {
        return function() {
          return _this.div(message);
        };
      })(this));
    };

    return AlertView;

  })(AtomPairView);

}).call(this);
