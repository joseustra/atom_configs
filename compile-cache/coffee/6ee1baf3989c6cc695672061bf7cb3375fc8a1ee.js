(function() {
  var StatusView, git, gitCheckoutAllFiles;

  git = require('../git');

  StatusView = require('../views/status-view');

  gitCheckoutAllFiles = function() {
    return git.cmd({
      args: ['checkout', '-f'],
      stdout: function(data) {
        var _ref;
        new StatusView({
          type: 'success',
          message: data.toString()
        });
        return (_ref = atom.project.getRepo()) != null ? _ref.refreshStatus() : void 0;
      }
    });
  };

  module.exports = gitCheckoutAllFiles;

}).call(this);
