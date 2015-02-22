(function() {
  var Environment, Executor, fs, os, _;

  _ = require('underscore-plus');

  os = require('os');

  fs = require('fs-plus');

  Executor = require('./executor');

  module.exports = Environment = (function() {
    function Environment(environment) {
      this.environment = environment;
    }

    Environment.prototype.Clone = function() {
      var env, executor, match, matcher, pathhelper, result;
      env = _.clone(this.environment);
      if (env.DYLD_INSERT_LIBRARIES != null) {
        env.DYLD_INSERT_LIBRARIES = void 0;
      }
      if (!(os.platform() === 'darwin' && env.PATH === '/usr/bin:/bin:/usr/sbin:/sbin')) {
        return env;
      }
      pathhelper = '/usr/libexec/path_helper';
      if (!fs.existsSync(pathhelper)) {
        return env;
      }
      executor = new Executor(env);
      result = executor.execSync(pathhelper);
      if (result.code !== 0) {
        return env;
      }
      if ((result.stderr != null) && result.stderr !== '') {
        return env;
      }
      matcher = /^PATH="(.*?)";/img;
      match = matcher.exec(result.stdout);
      if (match == null) {
        return env;
      }
      env.PATH = match[1];
      return env;
    };

    return Environment;

  })();

}).call(this);
