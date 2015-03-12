(function() {
  var CompositeDisposable, Disposable, FuzzyProvider, ProviderManager, ScopedPropertyStore, SymbolProvider, Uuid, _, _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  _ref = require('atom'), CompositeDisposable = _ref.CompositeDisposable, Disposable = _ref.Disposable;

  ScopedPropertyStore = require('scoped-property-store');

  _ = require('underscore-plus');

  Uuid = require('node-uuid');

  SymbolProvider = null;

  FuzzyProvider = null;

  module.exports = ProviderManager = (function() {
    ProviderManager.prototype.fuzzyProvider = null;

    ProviderManager.prototype.fuzzyRegistration = null;

    ProviderManager.prototype.store = null;

    ProviderManager.prototype.subscriptions = null;

    ProviderManager.prototype.globalBlacklist = null;

    function ProviderManager() {
      this.registerProvider = __bind(this.registerProvider, this);
      this.removeProvider = __bind(this.removeProvider, this);
      this.providerUuid = __bind(this.providerUuid, this);
      this.addProvider = __bind(this.addProvider, this);
      this.setGlobalBlacklist = __bind(this.setGlobalBlacklist, this);
      this.toggleFuzzyProvider = __bind(this.toggleFuzzyProvider, this);
      this.providersForScopeChain = __bind(this.providersForScopeChain, this);
      this.subscriptions = new CompositeDisposable;
      this.globalBlacklist = new CompositeDisposable;
      this.providers = new Map;
      this.store = new ScopedPropertyStore;
      this.subscriptions.add(atom.config.observe('autocomplete-plus.enableBuiltinProvider', (function(_this) {
        return function(value) {
          return _this.toggleFuzzyProvider(value);
        };
      })(this)));
      this.subscriptions.add(atom.config.observe('autocomplete-plus.scopeBlacklist', (function(_this) {
        return function(value) {
          return _this.setGlobalBlacklist(value);
        };
      })(this)));
    }

    ProviderManager.prototype.dispose = function() {
      var _ref1, _ref2, _ref3, _ref4, _ref5;
      this.toggleFuzzyProvider(false);
      if ((_ref1 = this.globalBlacklist) != null) {
        _ref1.dispose();
      }
      this.globalBlacklist = null;
      this.blacklist = null;
      if ((_ref2 = this.subscriptions) != null) {
        _ref2.dispose();
      }
      this.subscriptions = null;
      if ((_ref3 = this.store) != null) {
        _ref3.cache = {};
      }
      if ((_ref4 = this.store) != null) {
        _ref4.propertySets = [];
      }
      this.store = null;
      if ((_ref5 = this.providers) != null) {
        _ref5.clear();
      }
      return this.providers = null;
    };

    ProviderManager.prototype.providersForScopeChain = function(scopeChain) {
      var blacklist, blacklistedProviders, fuzzyProviderBlacklisted, providers;
      if (scopeChain == null) {
        return [];
      }
      if (this.store == null) {
        return [];
      }
      providers = [];
      if (_.contains(this.blacklist, scopeChain)) {
        return [];
      }
      providers = this.store.getAll(scopeChain);
      blacklist = _.chain(providers).map(function(p) {
        return p.value.globalBlacklist;
      }).filter(function(p) {
        return (p != null) && p === true;
      }).value();
      if ((blacklist != null) && blacklist.length) {
        return [];
      }
      blacklistedProviders = _.chain(providers).filter(function(p) {
        return (p.value.blacklisted != null) && p.value.blacklisted === true;
      }).map(function(p) {
        return p.value.provider;
      }).value();
      if (this.fuzzyProvider != null) {
        fuzzyProviderBlacklisted = _.chain(providers).filter(function(p) {
          return (p.value.providerblacklisted != null) && p.value.providerblacklisted === 'autocomplete-plus-fuzzyprovider';
        }).map(function(p) {
          return p.value.provider;
        }).value();
      }
      providers = _.chain(providers).filter(function(p) {
        return p.value.blacklisted == null;
      }).sortBy(function(p) {
        return -p.scopeSelector.length;
      }).map(function(p) {
        return p.value.provider;
      }).uniq().difference(blacklistedProviders).value();
      if ((fuzzyProviderBlacklisted != null) && fuzzyProviderBlacklisted.length && (this.fuzzyProvider != null)) {
        providers = _.without(providers, this.fuzzyProvider);
      }
      return providers;
    };

    ProviderManager.prototype.toggleFuzzyProvider = function(enabled) {
      if (enabled == null) {
        return;
      }
      if (enabled) {
        if ((this.fuzzyProvider != null) || (this.fuzzyRegistration != null)) {
          return;
        }
        if (atom.config.get('autocomplete-plus.defaultProvider') === 'Symbol') {
          if (SymbolProvider == null) {
            SymbolProvider = require('./symbol-provider');
          }
          this.fuzzyProvider = new SymbolProvider();
        } else {
          if (FuzzyProvider == null) {
            FuzzyProvider = require('./fuzzy-provider');
          }
          this.fuzzyProvider = new FuzzyProvider();
        }
        return this.fuzzyRegistration = this.registerProvider(this.fuzzyProvider);
      } else {
        if (this.fuzzyRegistration != null) {
          this.fuzzyRegistration.dispose();
        }
        if (this.fuzzyProvider != null) {
          this.fuzzyProvider.dispose();
        }
        this.fuzzyRegistration = null;
        return this.fuzzyProvider = null;
      }
    };

    ProviderManager.prototype.setGlobalBlacklist = function(blacklist) {
      var properties, registration;
      this.blacklist = blacklist;
      if (this.globalBlacklist != null) {
        this.globalBlacklist.dispose();
      }
      this.globalBlacklist = new CompositeDisposable;
      if (this.blacklist == null) {
        this.blacklist = [];
      }
      if (!this.blacklist.length) {
        return;
      }
      properties = {};
      properties[blacklist.join(',')] = {
        globalBlacklist: true
      };
      registration = this.store.addProperties('globalblacklist', properties);
      return this.globalBlacklist.add(registration);
    };

    ProviderManager.prototype.addProvider = function(provider) {
      var _ref1;
      if (!this.isValidProvider(provider)) {
        return;
      }
      if (!this.providers.has(provider)) {
        this.providers.set(provider, Uuid.v4());
      }
      if ((provider.dispose != null) && !_.contains((_ref1 = this.subscriptions) != null ? _ref1.disposables : void 0, provider)) {
        return this.subscriptions.add(provider);
      }
    };

    ProviderManager.prototype.isValidProvider = function(provider) {
      return (provider != null) && (provider.requestHandler != null) && typeof provider.requestHandler === 'function' && (provider.selector != null) && provider.selector !== '' && provider.selector !== false;
    };

    ProviderManager.prototype.providerUuid = function(provider) {
      if (provider == null) {
        return false;
      }
      if (!this.providers.has(provider)) {
        return false;
      }
      return this.providers.get(provider);
    };

    ProviderManager.prototype.removeProvider = function(provider) {
      var _ref1, _ref2;
      if (!this.isValidProvider(provider)) {
        return;
      }
      if ((_ref1 = this.providers) != null ? _ref1.has(provider) : void 0) {
        this.providers["delete"](provider);
      }
      if ((provider.dispose != null) && _.contains((_ref2 = this.subscriptions) != null ? _ref2.disposables : void 0, provider)) {
        return this.subscriptions.remove(provider);
      }
    };

    ProviderManager.prototype.registerProvider = function(provider) {
      var blacklist, blacklistRegistration, blacklistid, blacklistproperties, id, properties, providerblacklist, providerblacklistRegistration, providerblacklistid, providerblacklistproperties, registration, selectors, _ref1, _ref2, _ref3;
      if (!this.isValidProvider(provider)) {
        return;
      }
      this.addProvider(provider);
      id = this.providerUuid(provider);
      if (id == null) {
        this.removeProvider(provider);
      }
      if (id == null) {
        return;
      }
      selectors = provider.selector.split(',');
      selectors = _.reject(selectors, (function(_this) {
        return function(s) {
          var p;
          p = _this.store.propertiesForSourceAndSelector(id, s);
          return (p != null) && (p.provider != null);
        };
      })(this));
      if (!selectors.length) {
        return;
      }
      properties = {};
      properties[selectors.join(',')] = {
        provider: provider
      };
      registration = this.store.addProperties(id, properties);
      blacklistRegistration = null;
      if ((_ref1 = provider.blacklist) != null ? _ref1.length : void 0) {
        blacklistid = id + '-blacklist';
        blacklist = provider.blacklist.split(',');
        blacklist = _.reject(blacklist, (function(_this) {
          return function(s) {
            var p;
            p = _this.store.propertiesForSourceAndSelector(blacklistid, s);
            return (p != null) && (p.provider != null) && (p.blacklisted != null) && p.blacklisted;
          };
        })(this));
        if (blacklist.length) {
          blacklistproperties = {};
          blacklistproperties[blacklist.join(',')] = {
            provider: provider,
            blacklisted: true
          };
          blacklistRegistration = this.store.addProperties(blacklistid, blacklistproperties);
        }
      }
      if ((_ref2 = provider.providerblacklist) != null ? (_ref3 = _ref2['autocomplete-plus-fuzzyprovider']) != null ? _ref3.length : void 0 : void 0) {
        providerblacklistid = id + '-providerblacklist';
        providerblacklist = provider.providerblacklist['autocomplete-plus-fuzzyprovider'].split(',');
        providerblacklist = _.reject(providerblacklist, (function(_this) {
          return function(s) {
            var p;
            p = _this.store.propertiesForSourceAndSelector(providerblacklistid, s);
            return (p != null) && (p.provider != null) && (p.providerblacklisted != null) && p.providerblacklisted === 'autocomplete-plus-fuzzyprovider';
          };
        })(this));
        if (providerblacklist.length) {
          providerblacklistproperties = {};
          providerblacklistproperties[providerblacklist.join(',')] = {
            provider: provider,
            providerblacklisted: 'autocomplete-plus-fuzzyprovider'
          };
          providerblacklistRegistration = this.store.addProperties(providerblacklistid, providerblacklistproperties);
        }
      }
      if (provider.dispose != null) {
        provider.dispose = _.wrap(provider.dispose, (function(_this) {
          return function(f) {
            if (typeof f === "function") {
              f();
            }
            if (registration != null) {
              registration.dispose();
            }
            if (blacklistRegistration != null) {
              blacklistRegistration.dispose();
            }
            if (typeof providerblacklistRegistation !== "undefined" && providerblacklistRegistation !== null) {
              providerblacklistRegistation.dispose();
            }
            return _this.removeProvider(provider);
          };
        })(this));
      }
      return new Disposable((function(_this) {
        return function() {
          if (registration != null) {
            registration.dispose();
          }
          if (blacklistRegistration != null) {
            blacklistRegistration.dispose();
          }
          if (typeof providerblacklistRegistation !== "undefined" && providerblacklistRegistation !== null) {
            providerblacklistRegistation.dispose();
          }
          return _this.removeProvider(provider);
        };
      })(this));
    };

    return ProviderManager;

  })();

}).call(this);
