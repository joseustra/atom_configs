(function() {
  var Environment, PathExpander, PathHelper, path, _;

  _ = require('underscore-plus');

  path = require('path');

  PathExpander = require('./../../lib/util/pathexpander');

  PathHelper = require('./pathhelper.coffee');

  Environment = require('./../../lib/environment');

  describe('pathexpander', function() {
    var environment, gopath, pathexpander, pathhelper, _ref;
    _ref = [], environment = _ref[0], pathexpander = _ref[1], pathhelper = _ref[2], gopath = _ref[3];
    beforeEach(function() {
      environment = new Environment(process.env);
      pathexpander = new PathExpander(environment.Clone());
      return pathhelper = new PathHelper();
    });
    describe('when working with a single-item path', function() {
      return it('expands the path', function() {
        return runs(function() {
          var result;
          result = pathexpander.expand(path.join('~', 'go', 'go', '..', 'bin', 'goimports'), '~/go');
          expect(result).toBeDefined();
          expect(result).toBeTruthy();
          expect(result).toBe(path.join(pathhelper.home(), 'go', 'bin', 'goimports'));
          result = pathexpander.expand(path.join('$GOPATH', 'go', '..', 'bin', 'goimports'), '~/go');
          expect(result).toBeDefined();
          expect(result).toBeTruthy();
          return expect(result).toBe(path.join(pathhelper.home(), 'go', 'bin', 'goimports'));
        });
      });
    });
    return describe('when working with a multi-item path', function() {
      return it('expands the path', function() {
        return runs(function() {
          var result;
          result = pathexpander.expand(path.join('~', 'go', 'go', '..', 'bin', 'goimports'), '~/go' + path.delimiter + '~/othergo');
          expect(result).toBeDefined();
          expect(result).toBeTruthy();
          expect(result).toBe(path.join(pathhelper.home(), 'go', 'bin', 'goimports'));
          result = pathexpander.expand(path.join('$GOPATH', 'go', '..', 'bin', 'goimports'), '~/go' + path.delimiter + '~/othergo');
          expect(result).toBeDefined();
          expect(result).toBeTruthy();
          return expect(result).toBe(path.join(pathhelper.home(), 'go', 'bin', 'goimports'));
        });
      });
    });
  });

}).call(this);
