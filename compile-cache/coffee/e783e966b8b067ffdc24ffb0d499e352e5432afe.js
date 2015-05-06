(function() {
  var GitCommit, git, gitAddAllCommitAndPush;

  git = require('../git');

  GitCommit = require('./git-commit');

  gitAddAllCommitAndPush = function() {
    return git.add({
      exit: function() {
        return new GitCommit('', true);
      }
    });
  };

  module.exports = gitAddAllCommitAndPush;

}).call(this);
