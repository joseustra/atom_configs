(function() {
  var AtomColorHighlight, AtomColorHighlightElement, AtomColorHighlightModel, Emitter, deprecate, _ref,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  Emitter = require('event-kit').Emitter;

  deprecate = require('grim').deprecate;

  _ref = [], AtomColorHighlightModel = _ref[0], AtomColorHighlightElement = _ref[1];

  AtomColorHighlight = (function() {
    function AtomColorHighlight() {}

    AtomColorHighlight.prototype.config = {
      markersAtEndOfLine: {
        type: 'boolean',
        "default": false
      },
      hideMarkersInComments: {
        type: 'boolean',
        "default": false
      },
      hideMarkersInStrings: {
        type: 'boolean',
        "default": false
      },
      dotMarkersSize: {
        type: 'number',
        "default": 16,
        min: 2
      },
      dotMarkersSpacing: {
        type: 'number',
        "default": 4,
        min: 0
      },
      excludedGrammars: {
        type: 'array',
        "default": [],
        description: "Prevents files matching the specified grammars scopes from having their colors highligted. Changing this setting may need a restart to take effect. This setting takes a list of scope strings separated with commas. Scope for a grammar can be found in the corresponding package description in the settings view.",
        items: {
          type: 'string'
        }
      }
    };

    AtomColorHighlight.prototype.models = {};

    AtomColorHighlight.prototype.activate = function(state) {
      AtomColorHighlightModel || (AtomColorHighlightModel = require('./atom-color-highlight-model'));
      AtomColorHighlightElement || (AtomColorHighlightElement = require('./atom-color-highlight-element'));
      this.Color || (this.Color = require('pigments'));
      AtomColorHighlightElement.registerViewProvider(AtomColorHighlightModel);
      AtomColorHighlightModel.Color = this.Color;
      if (!atom.inSpecMode()) {
        try {
          atom.packages.activatePackage('project-palette-finder').then((function(_this) {
            return function(pack) {
              var finder;
              finder = pack.mainModule;
              if (finder != null) {
                AtomColorHighlightModel.Color = _this.Color = finder.Color;
              }
              return _this.subscriptions.add(finder.onDidUpdatePalette(_this.update));
            };
          })(this));
        } catch (_error) {}
      }
      this.emitter = new Emitter;
      return atom.workspace.observeTextEditors((function(_this) {
        return function(editor) {
          var model, view, _ref1;
          if (_ref1 = editor.getGrammar().scopeName, __indexOf.call(atom.config.get('atom-color-highlight.excludedGrammars'), _ref1) >= 0) {
            return;
          }
          model = new AtomColorHighlightModel(editor);
          view = atom.views.getView(model);
          model.init();
          view.attach();
          model.onDidDestroy(function() {
            return delete _this.models[editor.id];
          });
          _this.models[editor.id] = model;
          return _this.emitter.emit('did-create-model', model);
        };
      })(this));
    };

    AtomColorHighlight.prototype.eachColorHighlightEditor = function(callback) {
      deprecate('Use ::observeColorHighlightModels instead');
      return this.observeColorHighlightModels(callback);
    };

    AtomColorHighlight.prototype.observeColorHighlightModels = function(callback) {
      var editor, id, _ref1;
      if (callback != null) {
        _ref1 = this.models;
        for (id in _ref1) {
          editor = _ref1[id];
          if (typeof callback === "function") {
            callback(editor);
          }
        }
      }
      return this.onDidCreateModel(callback);
    };

    AtomColorHighlight.prototype.onDidCreateModel = function(callback) {
      return this.emitter.on('did-create-model', callback);
    };

    AtomColorHighlight.prototype.modelForEditor = function(editor) {
      return this.models[editor.id];
    };

    AtomColorHighlight.prototype.deactivate = function() {
      var id, model, _ref1;
      _ref1 = this.models;
      for (id in _ref1) {
        model = _ref1[id];
        model.destroy();
      }
      return this.models = {};
    };

    return AtomColorHighlight;

  })();

  module.exports = new AtomColorHighlight;

}).call(this);
