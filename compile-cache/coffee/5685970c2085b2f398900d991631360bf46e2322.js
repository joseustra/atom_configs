(function() {
  var Provider, Suggestion, TestProvider, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ref = require('../../lib/main'), Provider = _ref.Provider, Suggestion = _ref.Suggestion;

  module.exports = TestProvider = (function(_super) {
    __extends(TestProvider, _super);

    function TestProvider() {
      return TestProvider.__super__.constructor.apply(this, arguments);
    }

    TestProvider.prototype.buildSuggestions = function() {
      return [
        new Suggestion(this, {
          word: 'ohai',
          prefix: 'ohai',
          label: '<span style=\'color: red\'>ohai</span>',
          renderLabelAsHtml: true,
          className: 'ohai'
        })
      ];
    };

    TestProvider.prototype.dispose = function() {
      var foo;
      return foo = 'bar';
    };

    return TestProvider;

  })(Provider);

}).call(this);
