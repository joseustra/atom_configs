(function() {
  var Go, fs, os, path, _;

  fs = require('fs-plus');

  path = require('path');

  os = require('os');

  _ = require('underscore-plus');

  module.exports = Go = (function() {
    Go.prototype.name = '';

    Go.prototype.os = '';

    Go.prototype.exe = '';

    Go.prototype.arch = '';

    Go.prototype.version = '';

    Go.prototype.gopath = '';

    Go.prototype.goroot = '';

    Go.prototype.gotooldir = '';

    Go.prototype.env = false;

    function Go(executable, pathexpander, options) {
      this.executable = executable;
      this.pathexpander = pathexpander;
      if ((options != null ? options.name : void 0) != null) {
        this.name = options.name;
      }
      if ((options != null ? options.os : void 0) != null) {
        this.os = options.os;
      }
      if ((options != null ? options.exe : void 0) != null) {
        this.exe = options.exe;
      }
      if ((options != null ? options.arch : void 0) != null) {
        this.arch = options.arch;
      }
      if ((options != null ? options.version : void 0) != null) {
        this.version = options.version;
      }
      if ((options != null ? options.gopath : void 0) != null) {
        this.gopath = options.gopath;
      }
      if ((options != null ? options.goroot : void 0) != null) {
        this.goroot = options.goroot;
      }
      if ((options != null ? options.gotooldir : void 0) != null) {
        this.gotooldir = options.gotooldir;
      }
    }

    Go.prototype.description = function() {
      return this.name + ' (@ ' + this.goroot + ')';
    };

    Go.prototype.go = function() {
      if (!((this.executable != null) && this.executable !== '')) {
        return false;
      }
      if (!fs.existsSync(this.executable)) {
        return false;
      }
      return fs.realpathSync(this.executable);
    };

    Go.prototype.buildgopath = function() {
      var environmentOverridesConfig, gopathConfig, result;
      result = '';
      gopathConfig = atom.config.get('go-plus.goPath');
      environmentOverridesConfig = (atom.config.get('go-plus.environmentOverridesConfiguration') != null) && atom.config.get('go-plus.environmentOverridesConfiguration');
      if ((this.env.GOPATH != null) && this.env.GOPATH !== '') {
        result = this.env.GOPATH;
      }
      if ((this.gopath != null) && this.gopath !== '') {
        result = this.gopath;
      }
      if (!environmentOverridesConfig && (gopathConfig != null) && gopathConfig.trim() !== '') {
        result = gopathConfig;
      }
      if (result === '' && (gopathConfig != null) && gopathConfig.trim() !== '') {
        result = gopathConfig;
      }
      result = result.replace('\n', '').replace('\r', '');
      return this.pathexpander.expand(result, '');
    };

    Go.prototype.splitgopath = function() {
      var result;
      result = this.buildgopath();
      if (!((result != null) && result !== '')) {
        return [];
      }
      return result.split(path.delimiter);
    };

    Go.prototype.gofmt = function() {
      return this.gorootBinOrPathItem('gofmt');
    };

    Go.prototype.format = function() {
      switch (atom.config.get('go-plus.formatTool')) {
        case 'goimports':
          return this.goimports();
        case 'goreturns':
          return this.goreturns();
        default:
          return this.gofmt();
      }
    };

    Go.prototype.vet = function() {
      return this.goTooldirOrGopathBinOrPathItem('vet');
    };

    Go.prototype.cover = function() {
      return this.goTooldirOrGopathBinOrPathItem('cover');
    };

    Go.prototype.goimports = function() {
      return this.gopathBinOrPathItem('goimports');
    };

    Go.prototype.goreturns = function() {
      return this.gopathBinOrPathItem('goreturns');
    };

    Go.prototype.golint = function() {
      return this.gopathBinOrPathItem('golint');
    };

    Go.prototype.gocode = function() {
      return this.gopathBinOrPathItem('gocode');
    };

    Go.prototype.oracle = function() {
      return this.gopathBinOrPathItem('oracle');
    };

    Go.prototype.git = function() {
      return this.pathItem('git');
    };

    Go.prototype.hg = function() {
      return this.pathItem('hg');
    };

    Go.prototype.goTooldirOrGopathBinOrPathItem = function(name) {
      var result;
      result = this.goTooldirItem(name);
      if (!((result != null) && result)) {
        result = this.gopathBinOrPathItem(name);
      }
      return result;
    };

    Go.prototype.gopathBinOrPathItem = function(name) {
      var result;
      result = this.gopathBinItem(name);
      if (!((result != null) && result)) {
        result = this.pathItem(name);
      }
      return result;
    };

    Go.prototype.gopathBinItem = function(name) {
      var gopaths, item, result, _i, _len;
      if (!((name != null) && name !== '')) {
        return false;
      }
      gopaths = this.splitgopath();
      for (_i = 0, _len = gopaths.length; _i < _len; _i++) {
        item = gopaths[_i];
        result = path.resolve(path.normalize(path.join(item, 'bin', name + this.exe)));
        if (fs.existsSync(result)) {
          return fs.realpathSync(result);
        }
      }
      return false;
    };

    Go.prototype.pathItem = function(name) {
      var element, elements, p, pathresult, target, _i, _len;
      if (!((name != null) && name !== '')) {
        return false;
      }
      pathresult = false;
      p = os.platform() === 'win32' ? this.env.Path : this.env.PATH;
      if (p != null) {
        elements = p.split(path.delimiter);
        for (_i = 0, _len = elements.length; _i < _len; _i++) {
          element = elements[_i];
          target = path.resolve(path.normalize(path.join(element, name + this.exe)));
          if (fs.existsSync(target)) {
            pathresult = fs.realpathSync(target);
          }
        }
      }
      return pathresult;
    };

    Go.prototype.gorootBinOrPathItem = function(name) {
      var result;
      if (!((name != null) && name !== '')) {
        return false;
      }
      result = this.gorootBinItem(name);
      if (!((result != null) && result)) {
        result = this.pathItem(name);
      }
      return result;
    };

    Go.prototype.gorootBinItem = function(name) {
      var result;
      if (!((name != null) && name !== '')) {
        return false;
      }
      if (!((this.goroot != null) && this.goroot !== '')) {
        return false;
      }
      result = path.join(this.goroot, 'bin', name + this.exe);
      if (!fs.existsSync(result)) {
        return false;
      }
      return fs.realpathSync(result);
    };

    Go.prototype.goTooldirItem = function(name) {
      var result;
      if (!((name != null) && name !== '')) {
        return false;
      }
      result = path.join(this.gotooldir, name + this.exe);
      if (fs.existsSync(result)) {
        return fs.realpathSync(result);
      }
      return false;
    };

    Go.prototype.toolsAreMissing = function() {
      if (this.format() === false) {
        return true;
      }
      if (this.golint() === false) {
        return true;
      }
      if (this.vet() === false) {
        return true;
      }
      if (this.cover() === false) {
        return true;
      }
      if (this.gocode() === false) {
        return true;
      }
      if (this.oracle() === false) {
        return true;
      }
      if (this.git() === false) {
        return true;
      }
      if (this.hg() === false) {
        return true;
      }
      return false;
    };

    return Go;

  })();

}).call(this);
