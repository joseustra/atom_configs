(function() {
  var ShowTodoView, fs, querystring, url;

  querystring = require('querystring');

  url = require('url');

  fs = require('fs-plus');

  ShowTodoView = require('./show-todo-view');

  module.exports = {
    showTodoView: null,
    configDefaults: {
      findTheseRegexes: ['FIXMEs', '/FIXME:?(.+$)/g', 'TODOs', '/TODO:?(.+$)/g', 'CHANGEDs', '/CHANGED:?(.+$)/g', 'XXXs', '/XXX:?(.+$)/g'],
      ignoreThesePaths: ['/node_modules/', '/vendor/']
    },
    activate: function(state) {
      atom.commands.add('atom-workspace', {
        'todo-show:find-in-project': (function(_this) {
          return function() {
            return _this.show();
          };
        })(this)
      });
      return atom.workspace.addOpener(function(uriToOpen) {
        var pathname, protocol, _ref;
        _ref = url.parse(uriToOpen), protocol = _ref.protocol, pathname = _ref.pathname;
        if (pathname) {
          pathname = querystring.unescape(pathname);
        }
        if (protocol !== 'todolist-preview:') {
          return;
        }
        return new ShowTodoView(pathname);
      });
    },
    deactivate: function() {
      return this.showTodoView.destroy();
    },
    serialize: function() {
      return {
        showTodoViewState: this.showTodoView.serialize()
      };
    },
    show: function(todoContent) {
      var previousActivePane, uri;
      previousActivePane = atom.workspace.getActivePane();
      uri = "todolist-preview://TODOs";
      return atom.workspace.open(uri, {
        split: 'right',
        searchAllPanes: true
      }).done(function(showTodoView) {
        arguments[0].innerHTML = "WE HAVE LIFTOFF";
        if (showTodoView instanceof ShowTodoView) {
          showTodoView.renderTodos();
        }
        return previousActivePane.activate();
      });
    }
  };

}).call(this);
