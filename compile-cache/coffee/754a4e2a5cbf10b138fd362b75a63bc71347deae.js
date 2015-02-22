(function() {
  describe("AtomColorHighlight", function() {
    var atomColorHighlight, buffer, charWidth, editor, editorElement, markers, model, workspaceElement, _ref;
    _ref = [], workspaceElement = _ref[0], editor = _ref[1], editorElement = _ref[2], buffer = _ref[3], markers = _ref[4], atomColorHighlight = _ref[5], model = _ref[6], charWidth = _ref[7];
    beforeEach(function() {
      atom.config.set('editor.fontSize', 10);
      atom.config.set('editor.lineHeight', 1);
      waitsForPromise(function() {
        return atom.packages.activatePackage('language-sass');
      });
      waitsForPromise(function() {
        return atom.workspace.open('sample.sass');
      });
      waitsForPromise(function() {
        return atom.packages.activatePackage('atom-color-highlight').then(function(pkg) {
          return atomColorHighlight = pkg.mainModule;
        });
      });
      runs(function() {
        var styleNode;
        workspaceElement = atom.views.getView(atom.workspace);
        jasmine.attachToDOM(workspaceElement);
        styleNode = document.createElement('style');
        styleNode.textContent = "atom-text-editor atom-color-highlight .region,\natom-text-editor::shadow atom-color-highlight .region {\n  margin-left: 0 !important;\n}\n\natom-text-editor atom-color-highlight dot-color-marker,\natom-text-editor::shadow atom-color-highlight dot-color-marker {\n  margin-top: 0 !important;\n}";
        jasmine.attachToDOM(styleNode);
        editor = atom.workspace.getActiveTextEditor();
        editorElement = atom.views.getView(editor);
        buffer = editor.getBuffer();
        model = atomColorHighlight.modelForEditor(editor);
        charWidth = editor.getDefaultCharWidth();
        editor.setText("$color: #f0f\n$other_color: '#ff0'\n\n// $light_color: lighten($color, 50%)\n\n$transparent_color: $color - rgba(0,0,0,0.5)\n\n$color_red: #D11A0A\n$color_red_light: lighten($color_red, 30%)\n$color_red_dark: darken($color_red, 10%)\n$color_red_darker: darken($color_red, 20%)");
        return editor.getBuffer().emitter.emit('did-stop-changing');
      });
      waitsFor(function() {
        return !model.dirty;
      });
      return runs(function() {
        return markers = editorElement.shadowRoot.querySelectorAll('.region');
      });
    });
    it('retrieves the editor content', function() {
      return expect(markers.length).toEqual(9);
    });
    it('positions the regions properly', function() {
      expect(markers[0].offsetTop).toEqual(0);
      expect(markers[0].offsetLeft).toEqual(8 * charWidth);
      expect(markers[1].offsetTop).toEqual(10);
      expect(markers[1].offsetLeft).toEqual(15 * charWidth);
      expect(markers[2].offsetTop).toEqual(30);
      expect(markers[2].offsetLeft).toEqual(17 * charWidth);
      expect(markers[3].offsetTop).toEqual(50);
      expect(markers[3].offsetLeft).toEqual(20 * charWidth);
      expect(markers[4].offsetTop).toEqual(50);
      expect(markers[4].offsetLeft).toEqual(29 * charWidth);
      expect(markers[5].offsetTop).toEqual(70);
      return expect(markers[5].offsetLeft).toEqual(12 * charWidth);
    });
    describe('when content is added to the editor', function() {
      beforeEach(function() {
        editor.moveToBottom();
        editor.insertText(' red');
        editor.getBuffer().emitter.emit('did-stop-changing');
        return waitsFor(function() {
          return !model.dirty;
        });
      });
      return it('updates the markers in the view', function() {
        markers = editorElement.shadowRoot.querySelectorAll('.region');
        return expect(markers.length).toEqual(10);
      });
    });
    describe('when core:backspace is triggered', function() {
      beforeEach(function() {
        editor.setCursorBufferPosition([5, 0]);
        atom.commands.dispatch(editorElement, 'core:backspace');
        editor.getBuffer().emitter.emit('did-stop-changing');
        return waitsFor(function() {
          return !model.dirty;
        });
      });
      return it('adjusts the position of the markers in the view', function() {
        markers = editorElement.shadowRoot.querySelectorAll('.region');
        expect(markers[4].offsetTop).toEqual(40);
        expect(markers[4].offsetLeft).toEqual(29 * charWidth);
        expect(markers[5].offsetTop).toEqual(60);
        return expect(markers[5].offsetLeft).toEqual(12 * charWidth);
      });
    });
    describe('when content is removed from the editor', function() {
      beforeEach(function() {
        editor.setText('');
        editor.getBuffer().emitter.emit('did-stop-changing');
        return waitsFor(function() {
          return !model.dirty;
        });
      });
      return it('removes all the markers in the view', function() {
        markers = editorElement.shadowRoot.querySelectorAll('.region');
        return expect(markers.length).toEqual(0);
      });
    });
    describe('when the markers at end of line setting is enabled', function() {
      beforeEach(function() {
        atom.config.set('atom-color-highlight.markersAtEndOfLine', true);
        return markers = editorElement.shadowRoot.querySelectorAll('dot-color-marker');
      });
      it('replaces the markers with dot markers', function() {
        return expect(markers.length).toEqual(9);
      });
      return it('positions the dot markers at the end of line', function() {
        var size, spacing;
        spacing = atom.config.get('atom-color-highlight.dotMarkersSpacing');
        size = atom.config.get('atom-color-highlight.dotMarkersSize');
        expect(markers[0].offsetLeft).toEqual(12 * charWidth + spacing);
        expect(markers[0].offsetTop).toEqual(0);
        expect(markers[1].offsetLeft).toEqual(20 * charWidth + spacing);
        expect(markers[1].offsetTop).toEqual(10);
        expect(markers[2].offsetLeft).toEqual(37 * charWidth + spacing);
        expect(markers[2].offsetTop).toEqual(30);
        expect(markers[3].offsetLeft).toEqual(44 * charWidth + spacing);
        expect(markers[3].offsetTop).toEqual(50);
        expect(markers[4].offsetLeft).toEqual(44 * charWidth + spacing * 2 + size);
        expect(markers[4].offsetTop).toEqual(50);
        expect(markers[5].offsetLeft).toEqual(19 * charWidth + spacing);
        return expect(markers[5].offsetTop).toEqual(70);
      });
    });
    describe('when hide markers in comments is enabled', function() {
      beforeEach(function() {
        return atom.config.set('atom-color-highlight.hideMarkersInComments', true);
      });
      return it('hides the corresponding markers', function() {
        markers = editorElement.shadowRoot.querySelectorAll('color-marker:not([style*="display: none"])');
        return expect(markers.length).toEqual(8);
      });
    });
    describe('when hide markers in strings is enabled', function() {
      beforeEach(function() {
        return atom.config.set('atom-color-highlight.hideMarkersInStrings', true);
      });
      return it('hides the corresponding markers', function() {
        markers = editorElement.shadowRoot.querySelectorAll('color-marker:not([style*="display: none"])');
        return expect(markers.length).toEqual(8);
      });
    });
    describe('when an exclusion scope is defined in settings', function() {
      beforeEach(function() {
        atom.config.set('atom-color-highlight.excludedGrammars', ['source.css']);
        waitsForPromise(function() {
          return atom.packages.activatePackage('language-css');
        });
        waitsForPromise(function() {
          return atom.workspace.open('source.css');
        });
        return runs(function() {
          editor = atom.workspace.getActiveTextEditor();
          editorElement = atom.views.getView(editor);
          return model = atomColorHighlight.modelForEditor(editor);
        });
      });
      it('does not create a model for the editor', function() {
        return expect(model).toBeUndefined();
      });
      return it('does not render markers in the editor', function() {
        return expect(editorElement.shadowRoot.querySelectorAll('color-marker').length).toEqual(0);
      });
    });
    return describe('when the package is deactivated', function() {
      beforeEach(function() {
        return atom.packages.deactivatePackage('atom-color-highlight');
      });
      return it('removes the view from the text editor', function() {
        return expect(editorElement.shadowRoot.querySelector('atom-color-highlight')).not.toExist();
      });
    });
  });

}).call(this);
