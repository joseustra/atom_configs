(function() {
  var $$, BufferedProcess, ListView, OutputView, PullBranchListView, SelectListView, git, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  BufferedProcess = require('atom').BufferedProcess;

  _ref = require('atom-space-pen-views'), $$ = _ref.$$, SelectListView = _ref.SelectListView;

  git = require('../git');

  OutputView = require('./output-view');

  PullBranchListView = require('./pull-branch-list-view');

  module.exports = ListView = (function(_super) {
    __extends(ListView, _super);

    function ListView() {
      return ListView.__super__.constructor.apply(this, arguments);
    }

    ListView.prototype.initialize = function(data, mode, setUpstream, tag) {
      this.data = data;
      this.mode = mode;
      this.setUpstream = setUpstream != null ? setUpstream : false;
      this.tag = tag != null ? tag : '';
      ListView.__super__.initialize.apply(this, arguments);
      this.show();
      return this.parseData();
    };

    ListView.prototype.parseData = function() {
      var item, items, remotes, _i, _len;
      items = this.data.split("\n");
      remotes = [];
      for (_i = 0, _len = items.length; _i < _len; _i++) {
        item = items[_i];
        if (item !== '') {
          remotes.push({
            name: item
          });
        }
      }
      if (remotes.length === 1) {
        return this.confirmed(remotes[0]);
      } else {
        this.setItems(remotes);
        return this.focusFilterEditor();
      }
    };

    ListView.prototype.getFilterKey = function() {
      return 'name';
    };

    ListView.prototype.show = function() {
      if (this.panel == null) {
        this.panel = atom.workspace.addModalPanel({
          item: this
        });
      }
      this.panel.show();
      return this.storeFocusedElement();
    };

    ListView.prototype.cancelled = function() {
      return this.hide();
    };

    ListView.prototype.hide = function() {
      var _ref1;
      return (_ref1 = this.panel) != null ? _ref1.hide() : void 0;
    };

    ListView.prototype.viewForItem = function(_arg) {
      var name;
      name = _arg.name;
      return $$(function() {
        return this.li(name);
      });
    };

    ListView.prototype.confirmed = function(_arg) {
      var name;
      name = _arg.name;
      if (this.mode === 'pull') {
        new PullBranchListView(name);
      } else {
        this.execute(name);
      }
      return this.cancel();
    };

    ListView.prototype.execute = function(remote) {
      var view;
      view = new OutputView();
      return git.cmd({
        args: [this.mode, remote, this.tag],
        stdout: function(data) {
          return view.addLine(data.toString());
        },
        stderr: function(data) {
          return view.addLine(data.toString());
        },
        exit: (function(_this) {
          return function(code) {
            if (code === 128) {
              view.reset();
              return git.cmd({
                args: [_this.mode, '-u', remote, 'HEAD'],
                stdout: function(data) {
                  return view.addLine(data.toString());
                },
                stderr: function(data) {
                  return view.addLine(data.toString());
                },
                exit: function(code) {
                  return view.finish();
                }
              });
            } else {
              return view.finish();
            }
          };
        })(this)
      });
    };

    return ListView;

  })(SelectListView);

}).call(this);
