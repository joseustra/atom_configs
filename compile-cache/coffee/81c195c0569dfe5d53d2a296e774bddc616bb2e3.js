(function() {
  var TestProvider, waitForAutocomplete, _;

  waitForAutocomplete = require('./spec-helper').waitForAutocomplete;

  TestProvider = require('./lib/test-provider');

  _ = require('underscore-plus');

  describe('Provider API', function() {
    var autocompleteManager, completionDelay, editor, mainModule, registration, testProvider, _ref;
    _ref = [], completionDelay = _ref[0], editor = _ref[1], mainModule = _ref[2], autocompleteManager = _ref[3], registration = _ref[4], testProvider = _ref[5];
    beforeEach(function() {
      runs(function() {
        var workspaceElement;
        atom.config.set('autocomplete-plus.enableAutoActivation', true);
        atom.config.set('editor.fontSize', '16');
        completionDelay = 100;
        atom.config.set('autocomplete-plus.autoActivationDelay', completionDelay);
        completionDelay += 100;
        workspaceElement = atom.views.getView(atom.workspace);
        return jasmine.attachToDOM(workspaceElement);
      });
      waitsForPromise(function() {
        return atom.workspace.open('sample.js').then(function(e) {
          return editor = e;
        });
      });
      waitsForPromise(function() {
        return atom.packages.activatePackage('autocomplete-plus').then(function(a) {
          return mainModule = a.mainModule;
        });
      });
      waitsFor(function() {
        var _ref1;
        return (_ref1 = mainModule.autocompleteManager) != null ? _ref1.ready : void 0;
      });
      return runs(function() {
        return autocompleteManager = mainModule.autocompleteManager;
      });
    });
    afterEach(function() {
      if ((registration != null ? registration.dispose : void 0) != null) {
        if (registration != null) {
          registration.dispose();
        }
      }
      registration = null;
      if ((testProvider != null ? testProvider.dispose : void 0) != null) {
        if (testProvider != null) {
          testProvider.dispose();
        }
      }
      return testProvider = null;
    });
    return describe('When the Editor has a grammar', function() {
      beforeEach(function() {
        return waitsForPromise(function() {
          return atom.packages.activatePackage('language-javascript');
        });
      });
      describe('Legacy Provider API', function() {
        it('registers the given provider for the given editor', function() {
          return runs(function() {
            var providerRegistration;
            expect(autocompleteManager.providerManager.store).toBeDefined();
            expect(_.size(autocompleteManager.providerManager.providersForScopeChain('.source.js'))).toEqual(1);
            testProvider = new TestProvider();
            expect(autocompleteManager.providerManager.isLegacyProvider(testProvider)).toEqual(true);
            registration = mainModule.registerProviderForEditor(testProvider, editor);
            expect(_.size(autocompleteManager.providerManager.providersForScopeChain('.source.js'))).toEqual(2);
            expect(autocompleteManager.providerManager.legacyProviderRegistrations.has(testProvider.constructor)).toEqual(true);
            providerRegistration = autocompleteManager.providerManager.legacyProviderRegistrations.get(testProvider.constructor);
            expect(providerRegistration.selectors).toEqual(['.source.js']);
            expect(_.contains(autocompleteManager.providerManager.providersForScopeChain('.source.js'), testProvider)).toEqual(false);
            return expect(_.contains(autocompleteManager.providerManager.providersForScopeChain('.source.js'), providerRegistration.shim)).toEqual(true);
          });
        });
        it('registers the given provider once when called multiple times for the given editor', function() {
          return runs(function() {
            var providerRegistration;
            expect(autocompleteManager.providerManager.store).toBeDefined();
            expect(_.size(autocompleteManager.providerManager.providersForScopeChain('.source.js'))).toEqual(1);
            testProvider = new TestProvider();
            expect(autocompleteManager.providerManager.isLegacyProvider(testProvider)).toEqual(true);
            registration = mainModule.registerProviderForEditor(testProvider, editor);
            expect(_.size(autocompleteManager.providerManager.providersForScopeChain('.source.js'))).toEqual(2);
            expect(autocompleteManager.providerManager.legacyProviderRegistrations.has(testProvider.constructor)).toEqual(true);
            providerRegistration = autocompleteManager.providerManager.legacyProviderRegistrations.get(testProvider.constructor);
            expect(providerRegistration.selectors).toEqual(['.source.js']);
            expect(_.contains(autocompleteManager.providerManager.providersForScopeChain('.source.js'), testProvider)).toEqual(false);
            expect(_.contains(autocompleteManager.providerManager.providersForScopeChain('.source.js'), providerRegistration.shim)).toEqual(true);
            registration = mainModule.registerProviderForEditor(testProvider, editor);
            expect(_.size(autocompleteManager.providerManager.providersForScopeChain('.source.js'))).toEqual(2);
            expect(autocompleteManager.providerManager.legacyProviderRegistrations.has(testProvider.constructor)).toEqual(true);
            providerRegistration = autocompleteManager.providerManager.legacyProviderRegistrations.get(testProvider.constructor);
            expect(providerRegistration.selectors).toEqual(['.source.js']);
            expect(_.contains(autocompleteManager.providerManager.providersForScopeChain('.source.js'), testProvider)).toEqual(false);
            expect(_.contains(autocompleteManager.providerManager.providersForScopeChain('.source.js'), providerRegistration.shim)).toEqual(true);
            registration = mainModule.registerProviderForEditor(testProvider, editor);
            expect(_.size(autocompleteManager.providerManager.providersForScopeChain('.source.js'))).toEqual(2);
            expect(autocompleteManager.providerManager.legacyProviderRegistrations.has(testProvider.constructor)).toEqual(true);
            providerRegistration = autocompleteManager.providerManager.legacyProviderRegistrations.get(testProvider.constructor);
            expect(providerRegistration.selectors).toEqual(['.source.js']);
            expect(_.contains(autocompleteManager.providerManager.providersForScopeChain('.source.js'), testProvider)).toEqual(false);
            return expect(_.contains(autocompleteManager.providerManager.providersForScopeChain('.source.js'), providerRegistration.shim)).toEqual(true);
          });
        });
        it('unregisters the provider from all editors', function() {
          return runs(function() {
            var providerRegistration;
            expect(autocompleteManager.providerManager.store).toBeDefined();
            testProvider = new TestProvider();
            expect(autocompleteManager.providerManager.isLegacyProvider(testProvider)).toEqual(true);
            registration = mainModule.registerProviderForEditor(testProvider, editor);
            expect(_.size(autocompleteManager.providerManager.providersForScopeChain('.source.js'))).toEqual(2);
            expect(autocompleteManager.providerManager.legacyProviderRegistrations.has(testProvider.constructor)).toEqual(true);
            providerRegistration = autocompleteManager.providerManager.legacyProviderRegistrations.get(testProvider.constructor);
            expect(providerRegistration.selectors).toEqual(['.source.js']);
            expect(_.contains(autocompleteManager.providerManager.providersForScopeChain('.source.js'), testProvider)).toEqual(false);
            expect(_.contains(autocompleteManager.providerManager.providersForScopeChain('.source.js'), providerRegistration.shim)).toEqual(true);
            mainModule.unregisterProvider(testProvider);
            expect(autocompleteManager.providerManager.store).toBeDefined();
            expect(_.size(autocompleteManager.providerManager.providersForScopeChain('.source.js'))).toEqual(1);
            return expect(autocompleteManager.providerManager.legacyProviderRegistrations.has(testProvider.constructor)).toEqual(false);
          });
        });
        return it('buildSuggestions is called for a registered provider', function() {
          return runs(function() {
            testProvider = new TestProvider();
            mainModule.registerProviderForEditor(testProvider, editor);
            spyOn(testProvider, 'buildSuggestions').andCallThrough();
            editor.moveToBottom();
            editor.moveToBeginningOfLine();
            editor.insertText('f');
            advanceClock(completionDelay);
            return expect(testProvider.buildSuggestions).toHaveBeenCalled();
          });
        });
      });
      return describe('Provider API v1.0.0', function() {
        var registration1, registration2, registration3, _ref1;
        _ref1 = [], registration1 = _ref1[0], registration2 = _ref1[1], registration3 = _ref1[2];
        afterEach(function() {
          if (registration1 != null) {
            registration1.dispose();
          }
          if (registration2 != null) {
            registration2.dispose();
          }
          return registration3 != null ? registration3.dispose() : void 0;
        });
        it('should allow registration of a provider', function() {
          return runs(function() {
            expect(autocompleteManager.providerManager.store).toBeDefined();
            expect(_.size(autocompleteManager.providerManager.providersForScopeChain('.source.js'))).toEqual(1);
            expect(_.size(autocompleteManager.providerManager.providersForScopeChain('.source.coffee'))).toEqual(1);
            expect(autocompleteManager.providerManager.providersForScopeChain('.source.js')[0]).toEqual(autocompleteManager.providerManager.fuzzyProvider);
            expect(autocompleteManager.providerManager.providersForScopeChain('.source.coffee')[0]).toEqual(autocompleteManager.providerManager.fuzzyProvider);
            testProvider = {
              requestHandler: function(options) {
                return [
                  {
                    word: 'ohai',
                    prefix: 'ohai',
                    label: '<span style="color: red">ohai</span>',
                    renderLabelAsHtml: true,
                    className: 'ohai'
                  }
                ];
              },
              selector: '.source.js,.source.coffee'
            };
            registration = atom.packages.serviceHub.provide('autocomplete.provider', '1.0.0', {
              provider: testProvider
            });
            expect(autocompleteManager.providerManager.store).toBeDefined();
            expect(_.size(autocompleteManager.providerManager.providersForScopeChain('.source.js'))).toEqual(2);
            expect(_.size(autocompleteManager.providerManager.providersForScopeChain('.source.coffee'))).toEqual(2);
            expect(autocompleteManager.providerManager.providersForScopeChain('.source.js')[0]).toEqual(testProvider);
            expect(autocompleteManager.providerManager.providersForScopeChain('.source.js')[1]).toEqual(autocompleteManager.providerManager.fuzzyProvider);
            expect(autocompleteManager.providerManager.providersForScopeChain('.source.coffee')[0]).toEqual(testProvider);
            expect(autocompleteManager.providerManager.providersForScopeChain('.source.coffee')[1]).toEqual(autocompleteManager.providerManager.fuzzyProvider);
            expect(autocompleteManager.providerManager.providersForScopeChain('.source.go')[0]).toEqual(autocompleteManager.providerManager.fuzzyProvider);
            editor.moveToBottom();
            editor.insertText('o');
            waitForAutocomplete();
            return runs(function() {
              var suggestionListView;
              suggestionListView = atom.views.getView(autocompleteManager.suggestionList);
              expect(suggestionListView.querySelector('li .completion-label')).toHaveHtml('<span style="color: red">ohai</span>');
              return expect(suggestionListView.querySelector('li')).toHaveClass('ohai');
            });
          });
        });
        it('should dispose a provider registration correctly', function() {
          return runs(function() {
            expect(autocompleteManager.providerManager.store).toBeDefined();
            expect(_.size(autocompleteManager.providerManager.providersForScopeChain('.source.js'))).toEqual(1);
            expect(_.size(autocompleteManager.providerManager.providersForScopeChain('.source.coffee'))).toEqual(1);
            expect(autocompleteManager.providerManager.providersForScopeChain('.source.js')[0]).toEqual(autocompleteManager.providerManager.fuzzyProvider);
            expect(autocompleteManager.providerManager.providersForScopeChain('.source.coffee')[0]).toEqual(autocompleteManager.providerManager.fuzzyProvider);
            testProvider = {
              requestHandler: function(options) {
                return [
                  {
                    word: 'ohai',
                    prefix: 'ohai'
                  }
                ];
              },
              selector: '.source.js,.source.coffee'
            };
            registration = atom.packages.serviceHub.provide('autocomplete.provider', '1.0.0', {
              provider: testProvider
            });
            expect(autocompleteManager.providerManager.store).toBeDefined();
            expect(_.size(autocompleteManager.providerManager.providersForScopeChain('.source.js'))).toEqual(2);
            expect(_.size(autocompleteManager.providerManager.providersForScopeChain('.source.coffee'))).toEqual(2);
            expect(autocompleteManager.providerManager.providersForScopeChain('.source.js')[0]).toEqual(testProvider);
            expect(autocompleteManager.providerManager.providersForScopeChain('.source.js')[1]).toEqual(autocompleteManager.providerManager.fuzzyProvider);
            expect(autocompleteManager.providerManager.providersForScopeChain('.source.coffee')[0]).toEqual(testProvider);
            expect(autocompleteManager.providerManager.providersForScopeChain('.source.coffee')[1]).toEqual(autocompleteManager.providerManager.fuzzyProvider);
            expect(autocompleteManager.providerManager.providersForScopeChain('.source.go')[0]).toEqual(autocompleteManager.providerManager.fuzzyProvider);
            registration.dispose();
            expect(autocompleteManager.providerManager.store).toBeDefined();
            expect(_.size(autocompleteManager.providerManager.providersForScopeChain('.source.js'))).toEqual(1);
            expect(_.size(autocompleteManager.providerManager.providersForScopeChain('.source.coffee'))).toEqual(1);
            expect(autocompleteManager.providerManager.providersForScopeChain('.source.js')[0]).toEqual(autocompleteManager.providerManager.fuzzyProvider);
            expect(autocompleteManager.providerManager.providersForScopeChain('.source.coffee')[0]).toEqual(autocompleteManager.providerManager.fuzzyProvider);
            registration.dispose();
            expect(autocompleteManager.providerManager.store).toBeDefined();
            expect(_.size(autocompleteManager.providerManager.providersForScopeChain('.source.js'))).toEqual(1);
            expect(_.size(autocompleteManager.providerManager.providersForScopeChain('.source.coffee'))).toEqual(1);
            expect(autocompleteManager.providerManager.providersForScopeChain('.source.js')[0]).toEqual(autocompleteManager.providerManager.fuzzyProvider);
            return expect(autocompleteManager.providerManager.providersForScopeChain('.source.coffee')[0]).toEqual(autocompleteManager.providerManager.fuzzyProvider);
          });
        });
        return it('should remove a providers registration if the provider is disposed', function() {
          return runs(function() {
            expect(autocompleteManager.providerManager.store).toBeDefined();
            expect(_.size(autocompleteManager.providerManager.providersForScopeChain('.source.js'))).toEqual(1);
            expect(_.size(autocompleteManager.providerManager.providersForScopeChain('.source.coffee'))).toEqual(1);
            expect(autocompleteManager.providerManager.providersForScopeChain('.source.js')[0]).toEqual(autocompleteManager.providerManager.fuzzyProvider);
            expect(autocompleteManager.providerManager.providersForScopeChain('.source.coffee')[0]).toEqual(autocompleteManager.providerManager.fuzzyProvider);
            testProvider = {
              requestHandler: function(options) {
                return [
                  {
                    word: 'ohai',
                    prefix: 'ohai'
                  }
                ];
              },
              selector: '.source.js,.source.coffee',
              dispose: function() {}
            };
            registration = atom.packages.serviceHub.provide('autocomplete.provider', '1.0.0', {
              provider: testProvider
            });
            expect(autocompleteManager.providerManager.store).toBeDefined();
            expect(_.size(autocompleteManager.providerManager.providersForScopeChain('.source.js'))).toEqual(2);
            expect(_.size(autocompleteManager.providerManager.providersForScopeChain('.source.coffee'))).toEqual(2);
            expect(autocompleteManager.providerManager.providersForScopeChain('.source.js')[0]).toEqual(testProvider);
            expect(autocompleteManager.providerManager.providersForScopeChain('.source.js')[1]).toEqual(autocompleteManager.providerManager.fuzzyProvider);
            expect(autocompleteManager.providerManager.providersForScopeChain('.source.coffee')[0]).toEqual(testProvider);
            expect(autocompleteManager.providerManager.providersForScopeChain('.source.coffee')[1]).toEqual(autocompleteManager.providerManager.fuzzyProvider);
            expect(autocompleteManager.providerManager.providersForScopeChain('.source.go')[0]).toEqual(autocompleteManager.providerManager.fuzzyProvider);
            testProvider.dispose();
            expect(autocompleteManager.providerManager.store).toBeDefined();
            expect(_.size(autocompleteManager.providerManager.providersForScopeChain('.source.js'))).toEqual(1);
            expect(_.size(autocompleteManager.providerManager.providersForScopeChain('.source.coffee'))).toEqual(1);
            expect(autocompleteManager.providerManager.providersForScopeChain('.source.js')[0]).toEqual(autocompleteManager.providerManager.fuzzyProvider);
            return expect(autocompleteManager.providerManager.providersForScopeChain('.source.coffee')[0]).toEqual(autocompleteManager.providerManager.fuzzyProvider);
          });
        });
      });
    });
  });

}).call(this);
