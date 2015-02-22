(function() {
  var Environment, Go, PathExpander, PathHelper, os, path, _;

  _ = require('underscore-plus');

  path = require('path');

  os = require('os');

  Go = require('./../lib/go');

  PathExpander = require('./../lib/util/pathexpander');

  PathHelper = require('./util/pathhelper');

  Environment = require('./../lib/environment');

  describe('go', function() {
    var env, environment, go, pathexpander, pathhelper, _ref;
    _ref = [], go = _ref[0], environment = _ref[1], pathexpander = _ref[2], pathhelper = _ref[3], env = _ref[4];
    beforeEach(function() {
      environment = new Environment(process.env);
      pathexpander = new PathExpander(environment.Clone());
      pathhelper = new PathHelper();
      return go = new Go('/usr/local/bin/go', pathexpander);
    });
    describe('when working with a single-item gopath', function() {
      beforeEach(function() {
        return go.gopath = pathhelper.home() + path.sep + 'go';
      });
      it('expands the path', function() {
        return runs(function() {
          var result;
          result = go.buildgopath();
          expect(result).toBeDefined;
          expect(result).toBeTruthy;
          return expect(result).toBe(path.join(pathhelper.home(), 'go'));
        });
      });
      return it('splits the path', function() {
        return runs(function() {
          var result;
          result = go.splitgopath();
          expect(result).toBeDefined;
          expect(result).toBeTruthy;
          expect(_.size(result)).toBe(1);
          expect(result[0]).toBeDefined;
          return expect(result[0]).toBe(path.join(pathhelper.home(), 'go'));
        });
      });
    });
    return describe('when working with a multi-item gopath', function() {
      beforeEach(function() {
        return go.gopath = pathhelper.home() + path.sep + 'go' + path.delimiter + pathhelper.home() + path.sep + 'go2' + path.delimiter + path.sep + 'usr' + path.sep + 'local' + path.sep + 'go';
      });
      it('expands the path', function() {
        return runs(function() {
          var expected, prefix, result;
          prefix = os.platform() === 'win32' ? 'c:' : '';
          result = go.buildgopath();
          expect(result).toBeDefined;
          expect(result).toBeTruthy;
          expected = path.join(pathhelper.home(), 'go') + path.delimiter + path.join(pathhelper.home(), 'go2') + path.delimiter + prefix + path.sep + 'usr' + path.sep + 'local' + path.sep + 'go';
          return expect(result.toLowerCase()).toBe(expected.toLowerCase());
        });
      });
      return it('splits the path', function() {
        return runs(function() {
          var expected, prefix, result;
          prefix = os.platform() === 'win32' ? 'c:' : '';
          result = go.splitgopath();
          expect(result).toBeDefined;
          expect(result).toBeTruthy;
          expect(_.size(result)).toBe(3);
          expect(result[0]).toBeDefined;
          expect(result[0]).toBe(path.join(pathhelper.home(), 'go'));
          expect(result[1]).toBeDefined;
          expect(result[1]).toBe(path.join(pathhelper.home(), 'go2'));
          expect(result[2]).toBeDefined;
          expected = prefix + path.sep + path.join('usr', 'local', 'go');
          return expect(result[2].toLowerCase()).toBe(expected.toLowerCase());
        });
      });
    });
  });

}).call(this);
