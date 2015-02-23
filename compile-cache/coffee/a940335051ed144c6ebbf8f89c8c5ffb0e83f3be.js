(function() {
  var $, InputView, StatusView, TextEditorView, View, git, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ref = require('atom-space-pen-views'), $ = _ref.$, TextEditorView = _ref.TextEditorView, View = _ref.View;

  git = require('../git');

  StatusView = require('../views/status-view');

  InputView = (function(_super) {
    __extends(InputView, _super);

    function InputView() {
      return InputView.__super__.constructor.apply(this, arguments);
    }

    InputView.content = function() {
      return this.div((function(_this) {
        return function() {
          return _this.subview('commandEditor', new TextEditorView({
            mini: true,
            placeHolderText: 'Git command and arguments'
          }));
        };
      })(this));
    };

    InputView.prototype.initialize = function() {
      this.currentPane = atom.workspace.getActivePane();
      if (this.panel == null) {
        this.panel = atom.workspace.addModalPanel({
          item: this
        });
      }
      this.panel.show();
      this.commandEditor.focus();
      this.on('core:cancel', (function(_this) {
        return function() {
          return _this.panel.destroy();
        };
      })(this));
      return this.commandEditor.on('core:confirm', (function(_this) {
        return function() {
          var args;
          _this.panel.destroy();
          args = _this.commandEditor.getText().split(' ');
          if (args[0] === 1) {
            args.shift();
          }
          return git.cmd({
            args: args,
            stdout: function(data) {
              var _ref1;
              new StatusView({
                type: 'success',
                message: data.toString()
              });
              if ((_ref1 = atom.project.getRepo()) != null) {
                _ref1.refreshStatus();
              }
              return _this.currentPane.activate();
            }
          });
        };
      })(this));
    };

    return InputView;

  })(View);

  module.exports = function() {
    return new InputView;
  };

}).call(this);
