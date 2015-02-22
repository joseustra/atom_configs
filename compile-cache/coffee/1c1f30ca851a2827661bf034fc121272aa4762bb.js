(function() {
  var ProviderManager, TestProvider, _;

  ProviderManager = require('../lib/provider-manager');

  TestProvider = require('./lib/test-provider');

  _ = require('underscore-plus');

  describe('Provider Manager', function() {
    var legacyTestProvider, providerManager, registration, testProvider, _ref;
    _ref = [], providerManager = _ref[0], testProvider = _ref[1], legacyTestProvider = _ref[2], registration = _ref[3];
    beforeEach(function() {
      return runs(function() {
        atom.config.set('autocomplete-plus.enableBuiltinProvider', true);
        providerManager = new ProviderManager();
        testProvider = {
          requestHandler: function(options) {
            return [
              {
                word: 'ohai',
                prefix: 'ohai'
              }
            ];
          },
          selector: '.source.js',
          dispose: function() {}
        };
        return legacyTestProvider = new TestProvider();
      });
    });
    afterEach(function() {
      return runs(function() {
        if ((registration != null ? registration.dispose : void 0) != null) {
          if (registration != null) {
            registration.dispose();
          }
        }
        registration = null;
        if ((legacyTestProvider != null ? legacyTestProvider.dispose : void 0) != null) {
          if (legacyTestProvider != null) {
            legacyTestProvider.dispose();
          }
        }
        legacyTestProvider = null;
        if ((testProvider != null ? testProvider.dispose : void 0) != null) {
          if (testProvider != null) {
            testProvider.dispose();
          }
        }
        testProvider = null;
        if (providerManager != null) {
          providerManager.dispose();
        }
        return providerManager = null;
      });
    });
    describe('when no providers have been registered, and enableBuiltinProvider is true', function() {
      beforeEach(function() {
        return atom.config.set('autocomplete-plus.enableBuiltinProvider', true);
      });
      it('is constructed correctly', function() {
        expect(providerManager.providers).toBeDefined();
        expect(providerManager.subscriptions).toBeDefined();
        expect(providerManager.store).toBeDefined();
        return expect(providerManager.fuzzyProvider).toBeDefined();
      });
      it('disposes correctly', function() {
        providerManager.dispose();
        expect(providerManager.providers).toBeNull();
        expect(providerManager.subscriptions).toBeNull();
        expect(providerManager.store).toBeNull();
        return expect(providerManager.fuzzyProvider).toBeNull();
      });
      it('registers FuzzyProvider for all scopes', function() {
        expect(_.size(providerManager.providersForScopeChain('*'))).toBe(1);
        return expect(providerManager.providersForScopeChain('*')[0]).toBe(providerManager.fuzzyProvider);
      });
      it('adds providers', function() {
        var uuid, uuid2, _ref1, _ref2, _ref3;
        expect(providerManager.providers.has(testProvider)).toEqual(false);
        expect(_.contains((_ref1 = providerManager.subscriptions) != null ? _ref1.disposables : void 0, testProvider)).toEqual(false);
        providerManager.addProvider(testProvider);
        expect(providerManager.providers.has(testProvider)).toEqual(true);
        uuid = providerManager.providers.get(testProvider);
        expect(uuid).toBeDefined();
        expect(uuid).not.toEqual('');
        expect(_.contains((_ref2 = providerManager.subscriptions) != null ? _ref2.disposables : void 0, testProvider)).toEqual(true);
        providerManager.addProvider(testProvider);
        expect(providerManager.providers.has(testProvider)).toEqual(true);
        uuid2 = providerManager.providers.get(testProvider);
        expect(uuid2).toBeDefined();
        expect(uuid2).not.toEqual('');
        expect(uuid).toEqual(uuid2);
        expect(_.contains((_ref3 = providerManager.subscriptions) != null ? _ref3.disposables : void 0, testProvider)).toEqual(true);
        return providerManager.removeProvider(testProvider);
      });
      it('removes providers', function() {
        var _ref1, _ref2, _ref3;
        expect(providerManager.providers.has(testProvider)).toEqual(false);
        expect(_.contains((_ref1 = providerManager.subscriptions) != null ? _ref1.disposables : void 0, testProvider)).toEqual(false);
        providerManager.addProvider(testProvider);
        expect(providerManager.providers.has(testProvider)).toEqual(true);
        expect(providerManager.providers.get(testProvider)).toBeDefined();
        expect(providerManager.providers.get(testProvider)).not.toEqual('');
        expect(_.contains((_ref2 = providerManager.subscriptions) != null ? _ref2.disposables : void 0, testProvider)).toEqual(true);
        providerManager.removeProvider(testProvider);
        expect(providerManager.providers.has(testProvider)).toEqual(false);
        return expect(_.contains((_ref3 = providerManager.subscriptions) != null ? _ref3.disposables : void 0, testProvider)).toEqual(false);
      });
      it('can identify a legacy provider', function() {
        expect(providerManager.isLegacyProvider(testProvider)).toEqual(false);
        return expect(providerManager.isLegacyProvider(legacyTestProvider)).toEqual(true);
      });
      it('can identify a provider with a missing requestHandler', function() {
        var bogusProvider;
        bogusProvider = {
          badRequestHandler: function(options) {
            return [];
          },
          selector: '.source.js',
          dispose: function() {}
        };
        expect(providerManager.isValidProvider({})).toEqual(false);
        expect(providerManager.isValidProvider(bogusProvider)).toEqual(false);
        return expect(providerManager.isValidProvider(testProvider)).toEqual(true);
      });
      it('can identify a provider with an invalid requestHandler', function() {
        var bogusProvider;
        bogusProvider = {
          requestHandler: 'yo, this is a bad handler',
          selector: '.source.js',
          dispose: function() {}
        };
        expect(providerManager.isValidProvider({})).toEqual(false);
        expect(providerManager.isValidProvider(bogusProvider)).toEqual(false);
        return expect(providerManager.isValidProvider(testProvider)).toEqual(true);
      });
      it('can identify a provider with a missing selector', function() {
        var bogusProvider;
        bogusProvider = {
          requestHandler: function(options) {
            return [];
          },
          aSelector: '.source.js',
          dispose: function() {}
        };
        expect(providerManager.isValidProvider(bogusProvider)).toEqual(false);
        return expect(providerManager.isValidProvider(testProvider)).toEqual(true);
      });
      it('can identify a provider with an invalid selector', function() {
        var bogusProvider;
        bogusProvider = {
          requestHandler: function(options) {
            return [];
          },
          selector: '',
          dispose: function() {}
        };
        expect(providerManager.isValidProvider(bogusProvider)).toEqual(false);
        expect(providerManager.isValidProvider(testProvider)).toEqual(true);
        bogusProvider = {
          requestHandler: function(options) {
            return [];
          },
          selector: false,
          dispose: function() {}
        };
        return expect(providerManager.isValidProvider(bogusProvider)).toEqual(false);
      });
      it('registers a valid provider', function() {
        expect(_.size(providerManager.providersForScopeChain('.source.js'))).toEqual(1);
        expect(_.contains(providerManager.providersForScopeChain('.source.js'), testProvider)).toEqual(false);
        expect(providerManager.providers.has(testProvider)).toEqual(false);
        registration = providerManager.registerProvider(testProvider);
        expect(_.size(providerManager.providersForScopeChain('.source.js'))).toEqual(2);
        expect(_.contains(providerManager.providersForScopeChain('.source.js'), testProvider)).toEqual(true);
        return expect(providerManager.providers.has(testProvider)).toEqual(true);
      });
      it('removes a registration', function() {
        expect(_.size(providerManager.providersForScopeChain('.source.js'))).toEqual(1);
        expect(_.contains(providerManager.providersForScopeChain('.source.js'), testProvider)).toEqual(false);
        expect(providerManager.providers.has(testProvider)).toEqual(false);
        registration = providerManager.registerProvider(testProvider);
        expect(_.size(providerManager.providersForScopeChain('.source.js'))).toEqual(2);
        expect(_.contains(providerManager.providersForScopeChain('.source.js'), testProvider)).toEqual(true);
        expect(providerManager.providers.has(testProvider)).toEqual(true);
        registration.dispose();
        expect(_.size(providerManager.providersForScopeChain('.source.js'))).toEqual(1);
        expect(_.contains(providerManager.providersForScopeChain('.source.js'), testProvider)).toEqual(false);
        return expect(providerManager.providers.has(testProvider)).toEqual(false);
      });
      it('does not create duplicate registrations for the same scope', function() {
        expect(_.size(providerManager.providersForScopeChain('.source.js'))).toEqual(1);
        expect(_.contains(providerManager.providersForScopeChain('.source.js'), testProvider)).toEqual(false);
        expect(providerManager.providers.has(testProvider)).toEqual(false);
        registration = providerManager.registerProvider(testProvider);
        expect(_.size(providerManager.providersForScopeChain('.source.js'))).toEqual(2);
        expect(_.contains(providerManager.providersForScopeChain('.source.js'), testProvider)).toEqual(true);
        expect(providerManager.providers.has(testProvider)).toEqual(true);
        registration = providerManager.registerProvider(testProvider);
        expect(_.size(providerManager.providersForScopeChain('.source.js'))).toEqual(2);
        expect(_.contains(providerManager.providersForScopeChain('.source.js'), testProvider)).toEqual(true);
        expect(providerManager.providers.has(testProvider)).toEqual(true);
        registration = providerManager.registerProvider(testProvider);
        expect(_.size(providerManager.providersForScopeChain('.source.js'))).toEqual(2);
        expect(_.contains(providerManager.providersForScopeChain('.source.js'), testProvider)).toEqual(true);
        return expect(providerManager.providers.has(testProvider)).toEqual(true);
      });
      it('does not register an invalid provider', function() {
        var bogusProvider;
        bogusProvider = {
          requestHandler: 'yo, this is a bad handler',
          selector: '.source.js',
          dispose: function() {}
        };
        expect(_.size(providerManager.providersForScopeChain('.source.js'))).toEqual(1);
        expect(_.contains(providerManager.providersForScopeChain('.source.js'), bogusProvider)).toEqual(false);
        expect(providerManager.providers.has(bogusProvider)).toEqual(false);
        registration = providerManager.registerProvider(bogusProvider);
        expect(_.size(providerManager.providersForScopeChain('.source.js'))).toEqual(1);
        expect(_.contains(providerManager.providersForScopeChain('.source.js'), bogusProvider)).toEqual(false);
        return expect(providerManager.providers.has(bogusProvider)).toEqual(false);
      });
      it('shims a legacy provider during registration', function() {
        var legacyProviderRegistration;
        expect(_.size(providerManager.providersForScopeChain('.source.js'))).toEqual(1);
        expect(_.contains(providerManager.providersForScopeChain('.source.js'), providerManager.fuzzyProvider)).toEqual(true);
        expect(_.contains(providerManager.providersForScopeChain('.source.js'), legacyTestProvider)).toEqual(false);
        expect(providerManager.providers.has(legacyTestProvider)).toEqual(false);
        expect(providerManager.isLegacyProvider(legacyTestProvider)).toEqual(true);
        registration = providerManager.registerLegacyProvider(legacyTestProvider, '.source.js');
        expect(_.size(providerManager.providersForScopeChain('.source.js'))).toEqual(2);
        expect(providerManager.legacyProviderRegistrations.has(legacyTestProvider.constructor)).toEqual(true);
        legacyProviderRegistration = providerManager.legacyProviderRegistrations.get(legacyTestProvider.constructor);
        expect(_.contains(providerManager.providersForScopeChain('.source.js'), legacyTestProvider)).toEqual(false);
        return expect(_.contains(providerManager.providersForScopeChain('.source.js'), legacyProviderRegistration.shim)).toEqual(true);
      });
      return it('registers a provider with a blacklist', function() {
        testProvider = {
          requestHandler: function(options) {
            return [
              {
                word: 'ohai',
                prefix: 'ohai'
              }
            ];
          },
          selector: '.source.js',
          blacklist: '.source.js .comment',
          dispose: function() {}
        };
        expect(providerManager.isValidProvider(testProvider)).toEqual(true);
        expect(_.size(providerManager.providersForScopeChain('.source.js'))).toEqual(1);
        expect(_.contains(providerManager.providersForScopeChain('.source.js'), testProvider)).toEqual(false);
        expect(providerManager.providers.has(testProvider)).toEqual(false);
        registration = providerManager.registerProvider(testProvider);
        expect(_.size(providerManager.providersForScopeChain('.source.js'))).toEqual(2);
        expect(_.contains(providerManager.providersForScopeChain('.source.js'), testProvider)).toEqual(true);
        return expect(providerManager.providers.has(testProvider)).toEqual(true);
      });
    });
    describe('when no providers have been registered, and enableBuiltinProvider is false', function() {
      beforeEach(function() {
        return atom.config.set('autocomplete-plus.enableBuiltinProvider', false);
      });
      return it('does not register FuzzyProvider for all scopes', function() {
        expect(_.size(providerManager.providersForScopeChain('*'))).toBe(0);
        expect(providerManager.fuzzyProvider).toEqual(null);
        return expect(providerManager.fuzzyRegistration).toEqual(null);
      });
    });
    return describe('when providers have been registered', function() {
      var registration1, registration2, registration3, registration4, testProvider1, testProvider2, testProvider3, testProvider4, _ref1;
      _ref1 = [], testProvider1 = _ref1[0], testProvider2 = _ref1[1], testProvider3 = _ref1[2], testProvider4 = _ref1[3], registration1 = _ref1[4], registration2 = _ref1[5], registration3 = _ref1[6], registration4 = _ref1[7];
      beforeEach(function() {
        return runs(function() {
          atom.config.set('autocomplete-plus.enableBuiltinProvider', true);
          providerManager = new ProviderManager();
          testProvider1 = {
            requestHandler: function(options) {
              return [
                {
                  word: 'ohai2',
                  prefix: 'ohai2'
                }
              ];
            },
            selector: '.source.js',
            dispose: function() {}
          };
          testProvider2 = {
            requestHandler: function(options) {
              return [
                {
                  word: 'ohai2',
                  prefix: 'ohai2'
                }
              ];
            },
            selector: '.source.js .variable.js',
            blacklist: '.source.js .variable.js .comment2',
            providerblacklist: {
              'autocomplete-plus-fuzzyprovider': '.source.js .variable.js .comment3'
            },
            dispose: function() {}
          };
          testProvider3 = {
            requestHandler: function(options) {
              return [
                {
                  word: 'ohai3',
                  prefix: 'ohai3'
                }
              ];
            },
            selector: '*',
            dispose: function() {}
          };
          testProvider4 = {
            requestHandler: function(options) {
              return [
                {
                  word: 'ohai4',
                  prefix: 'ohai4'
                }
              ];
            },
            selector: '.source.js .comment',
            dispose: function() {}
          };
          registration1 = providerManager.registerProvider(testProvider1);
          registration2 = providerManager.registerProvider(testProvider2);
          registration3 = providerManager.registerProvider(testProvider3);
          return registration4 = providerManager.registerProvider(testProvider4);
        });
      });
      afterEach(function() {
        if (registration1 != null) {
          registration1.dispose();
        }
        if (registration2 != null) {
          registration2.dispose();
        }
        if (registration3 != null) {
          registration3.dispose();
        }
        if (registration4 != null) {
          registration4.dispose();
        }
        registration1 = null;
        registration2 = null;
        registration3 = null;
        registration4 = null;
        testProvider1 = null;
        testProvider2 = null;
        testProvider3 = null;
        return testProvider4 = null;
      });
      it('returns providers in the correct order for the given scope chain', function() {
        expect(_.size(providerManager.providersForScopeChain('.source.other'))).toEqual(2);
        expect(providerManager.providersForScopeChain('.source.other')[0]).toEqual(testProvider3);
        expect(providerManager.providersForScopeChain('.source.other')[1]).toEqual(providerManager.fuzzyProvider);
        expect(_.size(providerManager.providersForScopeChain('.source.js'))).toEqual(3);
        expect(providerManager.providersForScopeChain('.source.js')[0]).toEqual(testProvider1);
        expect(providerManager.providersForScopeChain('.source.js')[1]).toEqual(testProvider3);
        expect(providerManager.providersForScopeChain('.source.js')[2]).toEqual(providerManager.fuzzyProvider);
        expect(_.size(providerManager.providersForScopeChain('.source.js .comment'))).toEqual(4);
        expect(providerManager.providersForScopeChain('.source.js .comment')[0]).toEqual(testProvider4);
        expect(providerManager.providersForScopeChain('.source.js .comment')[1]).toEqual(testProvider1);
        expect(providerManager.providersForScopeChain('.source.js .comment')[2]).toEqual(testProvider3);
        expect(providerManager.providersForScopeChain('.source.js .comment')[3]).toEqual(providerManager.fuzzyProvider);
        expect(_.size(providerManager.providersForScopeChain('.source.js .variable.js'))).toEqual(4);
        expect(providerManager.providersForScopeChain('.source.js .variable.js')[0]).toEqual(testProvider2);
        expect(providerManager.providersForScopeChain('.source.js .variable.js')[1]).toEqual(testProvider1);
        expect(providerManager.providersForScopeChain('.source.js .variable.js')[2]).toEqual(testProvider3);
        expect(providerManager.providersForScopeChain('.source.js .variable.js')[3]).toEqual(providerManager.fuzzyProvider);
        expect(_.size(providerManager.providersForScopeChain('.source.js .other.js'))).toEqual(3);
        expect(providerManager.providersForScopeChain('.source.js .comment')[1]).toEqual(testProvider1);
        expect(providerManager.providersForScopeChain('.source.js .comment')[2]).toEqual(testProvider3);
        return expect(providerManager.providersForScopeChain('.source.js .comment')[3]).toEqual(providerManager.fuzzyProvider);
      });
      it('does not return providers if the scopeChain exactly matches a global blacklist item', function() {
        expect(_.size(providerManager.providersForScopeChain('.source.js .comment'))).toEqual(4);
        atom.config.set('autocomplete-plus.scopeBlacklist', ['.source.js .comment']);
        return expect(_.size(providerManager.providersForScopeChain('.source.js .comment'))).toEqual(0);
      });
      it('does not return providers if the scopeChain matches a global blacklist item with a wildcard', function() {
        expect(_.size(providerManager.providersForScopeChain('.source.js .comment'))).toEqual(4);
        atom.config.set('autocomplete-plus.scopeBlacklist', ['.source.js *']);
        return expect(_.size(providerManager.providersForScopeChain('.source.js .comment'))).toEqual(0);
      });
      it('does not return providers if the scopeChain matches a global blacklist item with a wildcard one level of depth below the current scope', function() {
        expect(_.size(providerManager.providersForScopeChain('.source.js .comment'))).toEqual(4);
        atom.config.set('autocomplete-plus.scopeBlacklist', ['.source.js *']);
        return expect(_.size(providerManager.providersForScopeChain('.source.js .comment .other'))).toEqual(0);
      });
      it('does return providers if the scopeChain does not match a global blacklist item with a wildcard', function() {
        expect(_.size(providerManager.providersForScopeChain('.source.js .comment'))).toEqual(4);
        atom.config.set('autocomplete-plus.scopeBlacklist', ['.source.coffee *']);
        return expect(_.size(providerManager.providersForScopeChain('.source.js .comment'))).toEqual(4);
      });
      it('filters a provider if the scopeChain matches a provider blacklist item', function() {
        expect(_.size(providerManager.providersForScopeChain('.source.js .variable.js .other.js'))).toEqual(4);
        expect(providerManager.providersForScopeChain('.source.js .variable.js .other.js')[0]).toEqual(testProvider2);
        expect(providerManager.providersForScopeChain('.source.js .variable.js .other.js')[1]).toEqual(testProvider1);
        expect(providerManager.providersForScopeChain('.source.js .variable.js .other.js')[2]).toEqual(testProvider3);
        expect(providerManager.providersForScopeChain('.source.js .variable.js .other.js')[3]).toEqual(providerManager.fuzzyProvider);
        expect(_.size(providerManager.providersForScopeChain('.source.js .variable.js .comment2.js'))).toEqual(3);
        expect(providerManager.providersForScopeChain('.source.js .variable.js .comment2.js')[0]).toEqual(testProvider1);
        expect(providerManager.providersForScopeChain('.source.js .variable.js .comment2.js')[1]).toEqual(testProvider3);
        return expect(providerManager.providersForScopeChain('.source.js .variable.js .comment2.js')[2]).toEqual(providerManager.fuzzyProvider);
      });
      return it('filters a provider if the scopeChain matches a provider providerblacklist item', function() {
        expect(_.size(providerManager.providersForScopeChain('.source.js .variable.js .other.js'))).toEqual(4);
        expect(providerManager.providersForScopeChain('.source.js .variable.js .other.js')[0]).toEqual(testProvider2);
        expect(providerManager.providersForScopeChain('.source.js .variable.js .other.js')[1]).toEqual(testProvider1);
        expect(providerManager.providersForScopeChain('.source.js .variable.js .other.js')[2]).toEqual(testProvider3);
        expect(providerManager.providersForScopeChain('.source.js .variable.js .other.js')[3]).toEqual(providerManager.fuzzyProvider);
        expect(_.size(providerManager.providersForScopeChain('.source.js .variable.js .comment3.js'))).toEqual(3);
        expect(providerManager.providersForScopeChain('.source.js .variable.js .comment3.js')[0]).toEqual(testProvider2);
        expect(providerManager.providersForScopeChain('.source.js .variable.js .comment3.js')[1]).toEqual(testProvider1);
        return expect(providerManager.providersForScopeChain('.source.js .variable.js .comment3.js')[2]).toEqual(testProvider3);
      });
    });
  });

}).call(this);
