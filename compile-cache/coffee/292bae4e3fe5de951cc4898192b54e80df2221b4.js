(function() {
  var Environment, os, path, _;

  _ = require('underscore-plus');

  path = require('path');

  os = require('os');

  Environment = require('./../lib/environment');

  describe('executor', function() {
    var environment;
    environment = [][0];
    describe('when the DYLD_INSERT_LIBRARIES variable is not set', function() {
      beforeEach(function() {
        var env;
        env = _.clone(process.env);
        env.PATH = '/usr/bin:/bin:/usr/sbin:/sbin';
        return environment = new Environment(env);
      });
      describe('when cloning the environment on OS X', function() {
        return it('uses /usr/libexec/path_helper to build the PATH', function() {
          var env;
          if (os.platform() === 'darwin') {
            env = environment.Clone();
            expect(env).toBeDefined;
            expect(env.PATH).toBeDefined;
            expect(env.PATH).not.toBe('');
            return expect(env.PATH).not.toBe('/usr/bin:/bin:/usr/sbin:/sbin');
          }
        });
      });
      return it('the DYLD_INSERT_LIBRARIES variable is undefined', function() {
        var env;
        env = environment.Clone();
        expect(env).toBeDefined;
        expect(env.SOME_RANDOM_NONEXISTENT_VARIABLE).toBe(void 0);
        return expect(env.DYLD_INSERT_LIBRARIES).toBe(void 0);
      });
    });
    return describe('when the DYLD_INSERT_LIBRARIES variable is set', function() {
      beforeEach(function() {
        var env;
        env = _.clone(process.env);
        env.PATH = '/usr/bin:/bin:/usr/sbin:/sbin';
        env.DYLD_INSERT_LIBRARIES = '/path/to/some/library';
        return environment = new Environment(env);
      });
      return it('unsets the DYLD_INSERT_LIBRARIES variable', function() {
        var env;
        env = environment.Clone();
        expect(env).toBeDefined;
        expect(env.SOME_RANDOM_NONEXISTENT_VARIABLE).toBe(void 0);
        return expect(env.DYLD_INSERT_LIBRARIES).toBe(void 0);
      });
    });
  });

}).call(this);
