(function() {
  var PathHelper, os;

  os = require('os');

  module.exports = PathHelper = (function() {
    function PathHelper() {}

    PathHelper.prototype.home = function() {
      switch (os.platform()) {
        case 'darwin':
        case 'freebsd':
        case 'linux':
        case 'sunos':
          return process.env.HOME;
        case 'win32':
          return process.env.USERPROFILE;
      }
    };

    return PathHelper;

  })();

}).call(this);
