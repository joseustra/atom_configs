(function() {
  var AtomPairView, StartView,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  AtomPairView = require('./atom-pair-view');

  module.exports = StartView = (function(_super) {
    __extends(StartView, _super);

    function StartView() {
      return StartView.__super__.constructor.apply(this, arguments);
    }

    StartView.content = function(sessionId) {
      return this.div({
        "class": 'session-id',
        tabindex: 1
      }, (function(_this) {
        return function() {
          return _this.div("Your session ID is " + sessionId + ". Press cmd-c to copy to your clipboard.");
        };
      })(this));
    };

    return StartView;

  })(AtomPairView);

}).call(this);
