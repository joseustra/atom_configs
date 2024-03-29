(function() {
  var $$, BufferedProcess, CherryPickSelectBranch, CherryPickSelectCommits, SelectListView, StatusView, git, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  BufferedProcess = require('atom').BufferedProcess;

  _ref = require('atom-space-pen-views'), $$ = _ref.$$, SelectListView = _ref.SelectListView;

  git = require('../git');

  StatusView = require('./status-view');

  CherryPickSelectCommits = require('./cherry-pick-select-commits-view');

  module.exports = CherryPickSelectBranch = (function(_super) {
    __extends(CherryPickSelectBranch, _super);

    function CherryPickSelectBranch() {
      return CherryPickSelectBranch.__super__.constructor.apply(this, arguments);
    }

    CherryPickSelectBranch.prototype.initialize = function(items, currentHead) {
      this.currentHead = currentHead;
      CherryPickSelectBranch.__super__.initialize.apply(this, arguments);
      this.show();
      this.setItems(items);
      return this.focusFilterEditor();
    };

    CherryPickSelectBranch.prototype.show = function() {
      if (this.panel == null) {
        this.panel = atom.workspace.addModalPanel({
          item: this
        });
      }
      this.panel.show();
      return this.storeFocusedElement();
    };

    CherryPickSelectBranch.prototype.cancelled = function() {
      return this.hide();
    };

    CherryPickSelectBranch.prototype.hide = function() {
      var _ref1;
      return (_ref1 = this.panel) != null ? _ref1.hide() : void 0;
    };

    CherryPickSelectBranch.prototype.viewForItem = function(item) {
      return $$(function() {
        return this.li(item);
      });
    };

    CherryPickSelectBranch.prototype.confirmed = function(item) {
      var args;
      this.cancel();
      args = ['log', '--cherry-pick', '-z', '--format=%H%n%an%n%ar%n%s', "" + this.currentHead + "..." + item];
      return git.cmd({
        args: args,
        stdout: function(data) {
          if (this.save == null) {
            this.save = '';
          }
          return this.save += data;
        },
        exit: function(exit) {
          if (exit === 0 && (this.save != null)) {
            new CherryPickSelectCommits(this.save.split('\0').slice(0, -1));
            return this.save = null;
          } else {
            return new StatusView({
              type: 'warning',
              message: "No commits available to cherry-pick."
            });
          }
        }
      });
    };

    return CherryPickSelectBranch;

  })(SelectListView);

}).call(this);
