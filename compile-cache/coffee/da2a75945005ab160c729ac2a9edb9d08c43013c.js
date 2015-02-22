(function() {
  var PathExpander, fs, os, path, _;

  fs = require('fs-plus');

  path = require('path');

  os = require('os');

  _ = require('underscore-plus');

  module.exports = PathExpander = (function() {
    function PathExpander(env) {
      this.env = env;
    }

    PathExpander.prototype.expand = function(p, gopath) {
      var pathItem, paths, result, _i, _len;
      if (!((p != null) && p.trim() !== '')) {
        return '';
      }
      if (p.indexOf(path.delimiter) === -1) {
        return this.expandItem(p, gopath);
      }
      paths = p.split(path.delimiter);
      result = '';
      for (_i = 0, _len = paths.length; _i < _len; _i++) {
        pathItem = paths[_i];
        pathItem = this.expandItem(pathItem, gopath);
        result = result === '' ? pathItem : result + path.delimiter + pathItem;
      }
      return result;
    };

    PathExpander.prototype.expandItem = function(p, gopath) {
      var goroot, home;
      if (!((p != null) && p.trim() !== '')) {
        return '';
      }
      p = this.replaceGoPathToken(p, gopath);
      switch (os.platform()) {
        case 'darwin':
        case 'freebsd':
        case 'linux':
        case 'sunos':
          if (p.indexOf('~') !== -1) {
            home = this.env.HOME || this.env.HOMEPATH || this.env.USERPROFILE;
            p = p.replace(/~/i, home);
          }
          if (p.toUpperCase().indexOf('$HOME') !== -1) {
            home = this.env.HOME || this.env.HOMEPATH || this.env.USERPROFILE;
            p = p.replace(/\$HOME/i, home);
          }
          if (p.toUpperCase().indexOf('$GOROOT') !== -1) {
            goroot = this.env.GOROOT;
            if ((goroot != null) && goroot !== '') {
              p = p.replace(/\$GOROOT/i, goroot);
            }
          }
          break;
        case 'win32':
          if (p.indexOf('~') !== -1) {
            home = this.env.USERPROFILE;
            p = p.replace(/~/i, home);
          }
          if (p.toUpperCase().indexOf('%HOME%') !== -1) {
            home = this.env.HOME || this.env.HOMEPATH || this.env.USERPROFILE;
            p = p.replace(/%HOME%/i, home);
          }
          if (p.toUpperCase().indexOf('%USERPROFILE%') !== -1) {
            home = this.env.USERPROFILE || this.env.HOME || this.env.HOMEPATH;
            p = p.replace(/%USERPROFILE%/i, home);
          }
          if (p.toUpperCase().indexOf('%HOMEPATH%') !== -1) {
            home = this.env.HOMEPATH || this.env.HOME || this.env.USERPROFILE;
            p = p.replace(/%HOMEPATH%/i, home);
          }
          if (p.toUpperCase().indexOf('%GOROOT%') !== -1) {
            goroot = this.env.GOROOT;
            if ((goroot != null) && goroot !== '') {
              p = p.replace(/%GOROOT%/i, goroot);
            }
          }
      }
      return this.resolveAndNormalize(p);
    };

    PathExpander.prototype.replaceGoPathToken = function(p, gopath) {
      if (!((gopath != null) && gopath !== '')) {
        return p;
      }
      gopath = gopath.indexOf(path.delimiter) === -1 ? gopath.trim() : gopath.split(path.delimiter)[0].trim();
      p = p.replace(/^\$GOPATH/i, gopath.trim() + '/');
      p = p.replace(/^%GOPATH%/i, gopath.trim());
      if ((p == null) || p.trim() === '') {
        return '';
      }
      return p.trim();
    };

    PathExpander.prototype.resolveAndNormalize = function(p) {
      var result;
      if (!((p != null) && p.trim() !== '')) {
        return '';
      }
      result = path.resolve(path.normalize(p));
      return result;
    };

    return PathExpander;

  })();

}).call(this);
