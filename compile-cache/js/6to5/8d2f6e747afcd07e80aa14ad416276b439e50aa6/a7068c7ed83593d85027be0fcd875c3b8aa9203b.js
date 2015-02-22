/**
 * Definition of interactive functions: the function
 * that require additional dialog prompt and update
 * editor content when user types data in prompt
 */
var utils = require("emmet/lib/utils/common");
var editorUtils = require("emmet/lib/utils/editor");
var actionUtils = require("emmet/lib/utils/action");

var range = require("emmet/lib/assets/range");
var htmlMatcher = require("emmet/lib/assets/htmlMatcher");
var parser = require("emmet/lib/parser/abbreviation");
var updateTag = require("emmet/lib/action/updateTag");

var atom = require("atom");
var PromptView = require("./prompt");
var Point = atom.Point;
var Range = atom.Range;
var prompt = new PromptView();

/**
 * Caches wrapping context for current selection in editor
 * @param  {IEmmetEditor} editor 
 * @param  {Object} info Current editor info (content, syntax, etc.) 
 * @return {Object}
 */
function selectionContext(editor, info) {
	info = info || editorUtils.outputInfo(editor);
	return editor.selectionList().map(function (sel, i) {
		var r = range(sel);
		var tag = htmlMatcher.tag(info.content, r.start);
		if (!r.length() && tag) {
			// no selection, use tag pair
			r = utils.narrowToNonSpace(info.content, tag.range);
		}

		var out = {
			selection: r,
			tag: tag,
			caret: r.start,
			syntax: info.syntax,
			profile: info.profile || null,
			counter: i + 1,
			contextNode: actionUtils.captureContext(editor, r.start)
		};

		if (r.length()) {
			var pasted = utils.escapeText(r.substring(info.content));
			out.pastedContent = editorUtils.unindent(editor, pasted);
		}

		return out;
	});
}

function updateFinalCarets(selCtx, fromIndex, delta) {
	if (!delta) {
		return;
	}

	var offset = new Point(delta, 0);
	for (var i = fromIndex + 1, il = selCtx.length; i < il; i++) {
		selCtx[i].finalCaret = selCtx[i].finalCaret.translate(offset);
	}
}

/**
 * Returns current caret position for given editor
 * @param  {Editor} editor Atom editor instance
 * @return {Number}        Character index in editor
 */
function getCaret(editor) {
	// we can’t use default `getCursor()` method because it returns
	// the most recent (e.g. the latest) caret, but we need the first one
	return editor.getSelectedBufferRanges()[0].start;
}

function lineDelta(prev, cur) {
	return utils.splitByLines(cur).length - utils.splitByLines(prev).length;
}

function setFinalCarets(selCtx, editor) {
	if (selCtx && selCtx.length > 1) {
		editor.setSelectedBufferRanges(selCtx.map(function (ctx) {
			return new Range(ctx.finalCaret, ctx.finalCaret);
		}));
	}
}

module.exports = {
	run: function (cmd, editor) {
		if (cmd === "wrap_with_abbreviation") {
			return this.wrapWithAbbreviation(editor);
		}

		if (cmd === "update_tag") {
			return this.updateTag(editor);
		}

		if (cmd === "interactive_expand_abbreviation") {
			return this.expandAbbreviation(editor);
		}
	},

	expandAbbreviation: function (editor) {
		var info = editorUtils.outputInfo(editor);
		var selCtx = editor.selectionList().map(function (sel, i) {
			editor._selection.index = i;
			var r = range(sel);
			return {
				selection: r,
				selectedText: r.substring(info.content),
				caret: r.start,
				syntax: info.syntax,
				profile: info.profile || null,
				counter: i + 1,
				contextNode: actionUtils.captureContext(editor, r.start)
			};
		});

		return this.wrapWithAbbreviation(editor, selCtx);
	},

	wrapWithAbbreviation: function (editor, selCtx) {
		selCtx = selCtx || selectionContext(editor);

		// show prompt dialog that will wrap each selection
		// on user typing
		prompt.show({
			label: "Enter Abbreviation",
			editor: editor.editor,
			editorView: editor.editorView,
			update: function (abbr) {
				var result, replaced;
				for (var i = selCtx.length - 1, ctx; i >= 0; i--) {
					ctx = selCtx[i];
					result = "";
					try {
						if (abbr) {
							result = parser.expand(abbr, ctx);
						} else {
							result = ctx.pastedContent;
						}
					} catch (e) {
						console.error(e);
						result = ctx.pastedContent;
					}

					editor._selection.index = i;
					replaced = editor.replaceContent(result, ctx.selection.start, ctx.selection.end);
					ctx.finalCaret = getCaret(editor.editor);
					updateFinalCarets(selCtx, i, lineDelta(ctx.selectedText, replaced));
				}
			},
			confirm: function () {
				setFinalCarets(selCtx, editor.editor);
			}
		});
	},

	updateTag: function (editor) {
		var info = editorUtils.outputInfo(editor);
		var selCtx = selectionContext(editor, info);

		// show prompt dialog that will update each
		// tag from selection
		prompt.show({
			label: "Enter Abbreviation",
			editor: editor.editor,
			editorView: editor.editorView,
			update: function (abbr) {
				var tag, replaced, delta;
				for (var i = selCtx.length - 1, ctx; i >= 0; i--) {
					ctx = selCtx[i];
					tag = null;

					try {
						tag = updateTag.getUpdatedTag(abbr, { match: ctx.tag }, info.content, {
							counter: ctx.counter
						});
					} catch (e) {
						console.error(e);
					}

					if (!tag) {
						continue;
					}

					replaced = [{
						start: ctx.tag.open.range.start,
						end: ctx.tag.open.range.end,
						content: tag.source
					}];

					if (tag.name() != ctx.tag.name && ctx.tag.close) {
						replaced.unshift({
							start: ctx.tag.close.range.start,
							end: ctx.tag.close.range.end,
							content: "</" + tag.name() + ">"
						});
					}

					replaced.forEach(function (data) {
						editor.replaceContent(data.content, data.start, data.end);
						ctx.finalCaret = editor.editor.getBuffer().positionForCharacterIndex(data.start);
					});
				}
			},
			confirm: function () {
				setFinalCarets(selCtx, editor.editor);
			}
		});
	}
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy91c3RyYWp1bmlvci8uYXRvbS9wYWNrYWdlcy9lbW1ldC9saWIvaW50ZXJhY3RpdmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFLQSxJQUFJLEtBQUssR0FBUyxPQUFPLENBQUMsd0JBQXdCLENBQUMsQ0FBQztBQUNwRCxJQUFJLFdBQVcsR0FBRyxPQUFPLENBQUMsd0JBQXdCLENBQUMsQ0FBQztBQUNwRCxJQUFJLFdBQVcsR0FBRyxPQUFPLENBQUMsd0JBQXdCLENBQUMsQ0FBQzs7QUFFcEQsSUFBSSxLQUFLLEdBQVMsT0FBTyxDQUFDLHdCQUF3QixDQUFDLENBQUM7QUFDcEQsSUFBSSxXQUFXLEdBQUcsT0FBTyxDQUFDLDhCQUE4QixDQUFDLENBQUM7QUFDMUQsSUFBSSxNQUFNLEdBQVEsT0FBTyxDQUFDLCtCQUErQixDQUFDLENBQUM7QUFDM0QsSUFBSSxTQUFTLEdBQUssT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUM7O0FBRXhELElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUMzQixJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDckMsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUN2QixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO0FBQ3ZCLElBQUksTUFBTSxHQUFHLElBQUksVUFBVSxFQUFFLENBQUM7Ozs7Ozs7O0FBUTlCLFNBQVMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRTtBQUN2QyxLQUFJLEdBQUcsSUFBSSxJQUFJLFdBQVcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDOUMsUUFBTyxNQUFNLENBQUMsYUFBYSxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQVMsR0FBRyxFQUFFLENBQUMsRUFBRTtBQUNsRCxNQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDbkIsTUFBSSxHQUFHLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNqRCxNQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxJQUFJLEdBQUcsRUFBRTs7QUFFdkIsSUFBQyxHQUFHLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztHQUNwRDs7QUFFRCxNQUFJLEdBQUcsR0FBRztBQUNULFlBQVMsRUFBRSxDQUFDO0FBQ1osTUFBRyxFQUFFLEdBQUc7QUFDUixRQUFLLEVBQUUsQ0FBQyxDQUFDLEtBQUs7QUFDZCxTQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07QUFDbkIsVUFBTyxFQUFFLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSTtBQUM3QixVQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUM7QUFDZCxjQUFXLEVBQUUsV0FBVyxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQztHQUN4RCxDQUFDOztBQUVGLE1BQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO0FBQ2YsT0FBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ3pELE1BQUcsQ0FBQyxhQUFhLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7R0FDekQ7O0FBRUQsU0FBTyxHQUFHLENBQUM7RUFDWCxDQUFDLENBQUM7Q0FDSDs7QUFFRCxTQUFTLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFO0FBQ3BELEtBQUksQ0FBQyxLQUFLLEVBQUU7QUFDWCxTQUFPO0VBQ1A7O0FBRUQsS0FBSSxNQUFNLEdBQUcsSUFBSSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ2pDLE1BQUssSUFBSSxDQUFDLEdBQUcsU0FBUyxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQzVELFFBQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7RUFDOUQ7Q0FDRDs7Ozs7OztBQU9ELFNBQVMsUUFBUSxDQUFDLE1BQU0sRUFBRTs7O0FBR3pCLFFBQU8sTUFBTSxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0NBQ2pEOztBQUVELFNBQVMsU0FBUyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUU7QUFDN0IsUUFBTyxLQUFLLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQztDQUN4RTs7QUFFRCxTQUFTLGNBQWMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFO0FBQ3ZDLEtBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO0FBQ2hDLFFBQU0sQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVMsR0FBRyxFQUFFO0FBQ3ZELFVBQU8sSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7R0FDakQsQ0FBQyxDQUFDLENBQUM7RUFDSjtDQUNEOztBQUVELE1BQU0sQ0FBQyxPQUFPLEdBQUc7QUFDaEIsSUFBRyxFQUFFLFVBQVMsR0FBRyxFQUFFLE1BQU0sRUFBRTtBQUMxQixNQUFJLEdBQUcsS0FBSyx3QkFBd0IsRUFBRTtBQUNyQyxVQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztHQUN6Qzs7QUFFRCxNQUFJLEdBQUcsS0FBSyxZQUFZLEVBQUU7QUFDekIsVUFBTyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0dBQzlCOztBQUVELE1BQUksR0FBRyxLQUFLLGlDQUFpQyxFQUFFO0FBQzlDLFVBQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0dBQ3ZDO0VBQ0Q7O0FBRUQsbUJBQWtCLEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDcEMsTUFBSSxJQUFJLEdBQUcsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUMxQyxNQUFJLE1BQU0sR0FBRyxNQUFNLENBQUMsYUFBYSxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQVMsR0FBRyxFQUFFLENBQUMsRUFBRTtBQUN4RCxTQUFNLENBQUMsVUFBVSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7QUFDNUIsT0FBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ25CLFVBQU87QUFDTixhQUFTLEVBQUUsQ0FBQztBQUNaLGdCQUFZLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO0FBQ3ZDLFNBQUssRUFBRSxDQUFDLENBQUMsS0FBSztBQUNkLFVBQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtBQUNuQixXQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJO0FBQzdCLFdBQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQztBQUNkLGVBQVcsRUFBRSxXQUFXLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQ3hELENBQUM7R0FDRixDQUFDLENBQUM7O0FBRUgsU0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0VBQ2pEOztBQUVELHFCQUFvQixFQUFFLFVBQVMsTUFBTSxFQUFFLE1BQU0sRUFBRTtBQUM5QyxRQUFNLEdBQUcsTUFBTSxJQUFJLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDOzs7O0FBSTVDLFFBQU0sQ0FBQyxJQUFJLENBQUM7QUFDWCxRQUFLLEVBQUUsb0JBQW9CO0FBQzNCLFNBQU0sRUFBRSxNQUFNLENBQUMsTUFBTTtBQUNyQixhQUFVLEVBQUUsTUFBTSxDQUFDLFVBQVU7QUFDN0IsU0FBTSxFQUFFLFVBQVMsSUFBSSxFQUFFO0FBQ3RCLFFBQUksTUFBTSxFQUFFLFFBQVEsQ0FBQztBQUNyQixTQUFLLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ2pELFFBQUcsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEIsV0FBTSxHQUFHLEVBQUUsQ0FBQztBQUNaLFNBQUk7QUFDSCxVQUFJLElBQUksRUFBRTtBQUNULGFBQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztPQUNsQyxNQUFNO0FBQ04sYUFBTSxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUM7T0FDM0I7TUFDRCxDQUFDLE9BQU8sQ0FBQyxFQUFFO0FBQ1gsYUFBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqQixZQUFNLEdBQUcsR0FBRyxDQUFDLGFBQWEsQ0FBQztNQUMzQjs7QUFFRCxXQUFNLENBQUMsVUFBVSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7QUFDNUIsYUFBUSxHQUFHLE1BQU0sQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDakYsUUFBRyxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3pDLHNCQUFpQixDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztLQUNwRTtJQUNEO0FBQ0QsVUFBTyxFQUFFLFlBQVc7QUFDbkIsa0JBQWMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3RDO0dBQ0QsQ0FBQyxDQUFDO0VBQ0g7O0FBRUQsVUFBUyxFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQzNCLE1BQUksSUFBSSxHQUFHLFdBQVcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDMUMsTUFBSSxNQUFNLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDOzs7O0FBSTVDLFFBQU0sQ0FBQyxJQUFJLENBQUM7QUFDWCxRQUFLLEVBQUUsb0JBQW9CO0FBQzNCLFNBQU0sRUFBRSxNQUFNLENBQUMsTUFBTTtBQUNyQixhQUFVLEVBQUUsTUFBTSxDQUFDLFVBQVU7QUFDN0IsU0FBTSxFQUFFLFVBQVMsSUFBSSxFQUFFO0FBQ3RCLFFBQUksR0FBRyxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUM7QUFDekIsU0FBSyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUNqRCxRQUFHLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hCLFFBQUcsR0FBRyxJQUFJLENBQUM7O0FBRVgsU0FBSTtBQUNILFNBQUcsR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxFQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRTtBQUNuRSxjQUFPLEVBQUUsR0FBRyxDQUFDLE9BQU87T0FDcEIsQ0FBQyxDQUFDO01BQ0gsQ0FBQyxPQUFPLENBQUMsRUFBRTtBQUNYLGFBQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7TUFDakI7O0FBRUQsU0FBSSxDQUFDLEdBQUcsRUFBRTtBQUNULGVBQVM7TUFDVDs7QUFFRCxhQUFRLEdBQUcsQ0FBQztBQUNYLFdBQUssRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSztBQUMvQixTQUFHLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUc7QUFDM0IsYUFBTyxFQUFFLEdBQUcsQ0FBQyxNQUFNO01BQ25CLENBQUMsQ0FBQzs7QUFFSCxTQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRTtBQUNoRCxjQUFRLENBQUMsT0FBTyxDQUFDO0FBQ2hCLFlBQUssRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSztBQUNoQyxVQUFHLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUc7QUFDNUIsY0FBTyxFQUFFLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsR0FBRztPQUNoQyxDQUFDLENBQUM7TUFDSDs7QUFFRCxhQUFRLENBQUMsT0FBTyxDQUFDLFVBQVMsSUFBSSxFQUFFO0FBQy9CLFlBQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUMxRCxTQUFHLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO01BQ2pGLENBQUMsQ0FBQztLQUNIO0lBRUQ7QUFDRCxVQUFPLEVBQUUsWUFBVztBQUNuQixrQkFBYyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdEM7R0FDRCxDQUFDLENBQUM7RUFDSDtDQUNELENBQUMiLCJmaWxlIjoiL1VzZXJzL3VzdHJhanVuaW9yLy5hdG9tL3BhY2thZ2VzL2VtbWV0L2xpYi9pbnRlcmFjdGl2ZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogRGVmaW5pdGlvbiBvZiBpbnRlcmFjdGl2ZSBmdW5jdGlvbnM6IHRoZSBmdW5jdGlvblxuICogdGhhdCByZXF1aXJlIGFkZGl0aW9uYWwgZGlhbG9nIHByb21wdCBhbmQgdXBkYXRlXG4gKiBlZGl0b3IgY29udGVudCB3aGVuIHVzZXIgdHlwZXMgZGF0YSBpbiBwcm9tcHRcbiAqL1xudmFyIHV0aWxzICAgICAgID0gcmVxdWlyZSgnZW1tZXQvbGliL3V0aWxzL2NvbW1vbicpO1xudmFyIGVkaXRvclV0aWxzID0gcmVxdWlyZSgnZW1tZXQvbGliL3V0aWxzL2VkaXRvcicpO1xudmFyIGFjdGlvblV0aWxzID0gcmVxdWlyZSgnZW1tZXQvbGliL3V0aWxzL2FjdGlvbicpO1xuXG52YXIgcmFuZ2UgICAgICAgPSByZXF1aXJlKCdlbW1ldC9saWIvYXNzZXRzL3JhbmdlJyk7XG52YXIgaHRtbE1hdGNoZXIgPSByZXF1aXJlKCdlbW1ldC9saWIvYXNzZXRzL2h0bWxNYXRjaGVyJyk7XG52YXIgcGFyc2VyICAgICAgPSByZXF1aXJlKCdlbW1ldC9saWIvcGFyc2VyL2FiYnJldmlhdGlvbicpO1xudmFyIHVwZGF0ZVRhZyAgID0gcmVxdWlyZSgnZW1tZXQvbGliL2FjdGlvbi91cGRhdGVUYWcnKTtcblxudmFyIGF0b20gPSByZXF1aXJlKCdhdG9tJyk7XG52YXIgUHJvbXB0VmlldyA9IHJlcXVpcmUoJy4vcHJvbXB0Jyk7XG52YXIgUG9pbnQgPSBhdG9tLlBvaW50O1xudmFyIFJhbmdlID0gYXRvbS5SYW5nZTtcbnZhciBwcm9tcHQgPSBuZXcgUHJvbXB0VmlldygpO1xuXG4vKipcbiAqIENhY2hlcyB3cmFwcGluZyBjb250ZXh0IGZvciBjdXJyZW50IHNlbGVjdGlvbiBpbiBlZGl0b3JcbiAqIEBwYXJhbSAge0lFbW1ldEVkaXRvcn0gZWRpdG9yIFxuICogQHBhcmFtICB7T2JqZWN0fSBpbmZvIEN1cnJlbnQgZWRpdG9yIGluZm8gKGNvbnRlbnQsIHN5bnRheCwgZXRjLikgXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbmZ1bmN0aW9uIHNlbGVjdGlvbkNvbnRleHQoZWRpdG9yLCBpbmZvKSB7XG5cdGluZm8gPSBpbmZvIHx8IGVkaXRvclV0aWxzLm91dHB1dEluZm8oZWRpdG9yKTtcblx0cmV0dXJuIGVkaXRvci5zZWxlY3Rpb25MaXN0KCkubWFwKGZ1bmN0aW9uKHNlbCwgaSkge1xuXHRcdHZhciByID0gcmFuZ2Uoc2VsKTtcblx0XHR2YXIgdGFnID0gaHRtbE1hdGNoZXIudGFnKGluZm8uY29udGVudCwgci5zdGFydCk7XG5cdFx0aWYgKCFyLmxlbmd0aCgpICYmIHRhZykge1xuXHRcdFx0Ly8gbm8gc2VsZWN0aW9uLCB1c2UgdGFnIHBhaXJcblx0XHRcdHIgPSB1dGlscy5uYXJyb3dUb05vblNwYWNlKGluZm8uY29udGVudCwgdGFnLnJhbmdlKTtcblx0XHR9XG5cblx0XHR2YXIgb3V0ID0ge1xuXHRcdFx0c2VsZWN0aW9uOiByLFxuXHRcdFx0dGFnOiB0YWcsXG5cdFx0XHRjYXJldDogci5zdGFydCxcblx0XHRcdHN5bnRheDogaW5mby5zeW50YXgsXG5cdFx0XHRwcm9maWxlOiBpbmZvLnByb2ZpbGUgfHwgbnVsbCxcblx0XHRcdGNvdW50ZXI6IGkgKyAxLFxuXHRcdFx0Y29udGV4dE5vZGU6IGFjdGlvblV0aWxzLmNhcHR1cmVDb250ZXh0KGVkaXRvciwgci5zdGFydClcblx0XHR9O1xuXG5cdFx0aWYgKHIubGVuZ3RoKCkpIHtcblx0XHRcdHZhciBwYXN0ZWQgPSB1dGlscy5lc2NhcGVUZXh0KHIuc3Vic3RyaW5nKGluZm8uY29udGVudCkpO1xuXHRcdFx0b3V0LnBhc3RlZENvbnRlbnQgPSBlZGl0b3JVdGlscy51bmluZGVudChlZGl0b3IsIHBhc3RlZCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG91dDtcblx0fSk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUZpbmFsQ2FyZXRzKHNlbEN0eCwgZnJvbUluZGV4LCBkZWx0YSkge1xuXHRpZiAoIWRlbHRhKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0dmFyIG9mZnNldCA9IG5ldyBQb2ludChkZWx0YSwgMCk7XG5cdGZvciAodmFyIGkgPSBmcm9tSW5kZXggKyAxLCBpbCA9IHNlbEN0eC5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG5cdFx0c2VsQ3R4W2ldLmZpbmFsQ2FyZXQgPSBzZWxDdHhbaV0uZmluYWxDYXJldC50cmFuc2xhdGUob2Zmc2V0KTtcblx0fVxufVxuXG4vKipcbiAqIFJldHVybnMgY3VycmVudCBjYXJldCBwb3NpdGlvbiBmb3IgZ2l2ZW4gZWRpdG9yXG4gKiBAcGFyYW0gIHtFZGl0b3J9IGVkaXRvciBBdG9tIGVkaXRvciBpbnN0YW5jZVxuICogQHJldHVybiB7TnVtYmVyfSAgICAgICAgQ2hhcmFjdGVyIGluZGV4IGluIGVkaXRvclxuICovXG5mdW5jdGlvbiBnZXRDYXJldChlZGl0b3IpIHtcblx0Ly8gd2UgY2Fu4oCZdCB1c2UgZGVmYXVsdCBgZ2V0Q3Vyc29yKClgIG1ldGhvZCBiZWNhdXNlIGl0IHJldHVybnNcblx0Ly8gdGhlIG1vc3QgcmVjZW50IChlLmcuIHRoZSBsYXRlc3QpIGNhcmV0LCBidXQgd2UgbmVlZCB0aGUgZmlyc3Qgb25lXG5cdHJldHVybiBlZGl0b3IuZ2V0U2VsZWN0ZWRCdWZmZXJSYW5nZXMoKVswXS5zdGFydDtcbn1cblxuZnVuY3Rpb24gbGluZURlbHRhKHByZXYsIGN1cikge1xuXHRyZXR1cm4gdXRpbHMuc3BsaXRCeUxpbmVzKGN1cikubGVuZ3RoIC0gdXRpbHMuc3BsaXRCeUxpbmVzKHByZXYpLmxlbmd0aDtcbn1cblxuZnVuY3Rpb24gc2V0RmluYWxDYXJldHMoc2VsQ3R4LCBlZGl0b3IpIHtcblx0aWYgKHNlbEN0eCAmJiBzZWxDdHgubGVuZ3RoID4gMSkge1xuXHRcdGVkaXRvci5zZXRTZWxlY3RlZEJ1ZmZlclJhbmdlcyhzZWxDdHgubWFwKGZ1bmN0aW9uKGN0eCkge1xuXHRcdFx0cmV0dXJuIG5ldyBSYW5nZShjdHguZmluYWxDYXJldCwgY3R4LmZpbmFsQ2FyZXQpO1xuXHRcdH0pKTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0cnVuOiBmdW5jdGlvbihjbWQsIGVkaXRvcikge1xuXHRcdGlmIChjbWQgPT09ICd3cmFwX3dpdGhfYWJicmV2aWF0aW9uJykge1xuXHRcdFx0cmV0dXJuIHRoaXMud3JhcFdpdGhBYmJyZXZpYXRpb24oZWRpdG9yKTtcblx0XHR9XG5cblx0XHRpZiAoY21kID09PSAndXBkYXRlX3RhZycpIHtcblx0XHRcdHJldHVybiB0aGlzLnVwZGF0ZVRhZyhlZGl0b3IpO1xuXHRcdH1cblxuXHRcdGlmIChjbWQgPT09ICdpbnRlcmFjdGl2ZV9leHBhbmRfYWJicmV2aWF0aW9uJykge1xuXHRcdFx0cmV0dXJuIHRoaXMuZXhwYW5kQWJicmV2aWF0aW9uKGVkaXRvcik7XG5cdFx0fVxuXHR9LFxuXG5cdGV4cGFuZEFiYnJldmlhdGlvbjogZnVuY3Rpb24oZWRpdG9yKSB7XG5cdFx0dmFyIGluZm8gPSBlZGl0b3JVdGlscy5vdXRwdXRJbmZvKGVkaXRvcik7XG5cdFx0dmFyIHNlbEN0eCA9IGVkaXRvci5zZWxlY3Rpb25MaXN0KCkubWFwKGZ1bmN0aW9uKHNlbCwgaSkge1xuXHRcdFx0ZWRpdG9yLl9zZWxlY3Rpb24uaW5kZXggPSBpO1xuXHRcdFx0dmFyIHIgPSByYW5nZShzZWwpO1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0c2VsZWN0aW9uOiByLFxuXHRcdFx0XHRzZWxlY3RlZFRleHQ6IHIuc3Vic3RyaW5nKGluZm8uY29udGVudCksXG5cdFx0XHRcdGNhcmV0OiByLnN0YXJ0LFxuXHRcdFx0XHRzeW50YXg6IGluZm8uc3ludGF4LFxuXHRcdFx0XHRwcm9maWxlOiBpbmZvLnByb2ZpbGUgfHwgbnVsbCxcblx0XHRcdFx0Y291bnRlcjogaSArIDEsXG5cdFx0XHRcdGNvbnRleHROb2RlOiBhY3Rpb25VdGlscy5jYXB0dXJlQ29udGV4dChlZGl0b3IsIHIuc3RhcnQpXG5cdFx0XHR9O1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHRoaXMud3JhcFdpdGhBYmJyZXZpYXRpb24oZWRpdG9yLCBzZWxDdHgpO1xuXHR9LFxuXG5cdHdyYXBXaXRoQWJicmV2aWF0aW9uOiBmdW5jdGlvbihlZGl0b3IsIHNlbEN0eCkge1xuXHRcdHNlbEN0eCA9IHNlbEN0eCB8fCBzZWxlY3Rpb25Db250ZXh0KGVkaXRvcik7XG5cblx0XHQvLyBzaG93IHByb21wdCBkaWFsb2cgdGhhdCB3aWxsIHdyYXAgZWFjaCBzZWxlY3Rpb25cblx0XHQvLyBvbiB1c2VyIHR5cGluZ1xuXHRcdHByb21wdC5zaG93KHtcblx0XHRcdGxhYmVsOiAnRW50ZXIgQWJicmV2aWF0aW9uJyxcblx0XHRcdGVkaXRvcjogZWRpdG9yLmVkaXRvcixcblx0XHRcdGVkaXRvclZpZXc6IGVkaXRvci5lZGl0b3JWaWV3LFxuXHRcdFx0dXBkYXRlOiBmdW5jdGlvbihhYmJyKSB7XG5cdFx0XHRcdHZhciByZXN1bHQsIHJlcGxhY2VkO1xuXHRcdFx0XHRmb3IgKHZhciBpID0gc2VsQ3R4Lmxlbmd0aCAtIDEsIGN0eDsgaSA+PSAwOyBpLS0pIHtcblx0XHRcdFx0XHRjdHggPSBzZWxDdHhbaV07XG5cdFx0XHRcdFx0cmVzdWx0ID0gJyc7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGlmIChhYmJyKSB7XG5cdFx0XHRcdFx0XHRcdHJlc3VsdCA9IHBhcnNlci5leHBhbmQoYWJiciwgY3R4KTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHJlc3VsdCA9IGN0eC5wYXN0ZWRDb250ZW50O1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoZSk7XG5cdFx0XHRcdFx0XHRyZXN1bHQgPSBjdHgucGFzdGVkQ29udGVudDtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRlZGl0b3IuX3NlbGVjdGlvbi5pbmRleCA9IGk7XG5cdFx0XHRcdFx0cmVwbGFjZWQgPSBlZGl0b3IucmVwbGFjZUNvbnRlbnQocmVzdWx0LCBjdHguc2VsZWN0aW9uLnN0YXJ0LCBjdHguc2VsZWN0aW9uLmVuZCk7XG5cdFx0XHRcdFx0Y3R4LmZpbmFsQ2FyZXQgPSBnZXRDYXJldChlZGl0b3IuZWRpdG9yKTtcblx0XHRcdFx0XHR1cGRhdGVGaW5hbENhcmV0cyhzZWxDdHgsIGksIGxpbmVEZWx0YShjdHguc2VsZWN0ZWRUZXh0LCByZXBsYWNlZCkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0Y29uZmlybTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHNldEZpbmFsQ2FyZXRzKHNlbEN0eCwgZWRpdG9yLmVkaXRvcik7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cblx0dXBkYXRlVGFnOiBmdW5jdGlvbihlZGl0b3IpIHtcblx0XHR2YXIgaW5mbyA9IGVkaXRvclV0aWxzLm91dHB1dEluZm8oZWRpdG9yKTtcblx0XHR2YXIgc2VsQ3R4ID0gc2VsZWN0aW9uQ29udGV4dChlZGl0b3IsIGluZm8pO1xuXG5cdFx0Ly8gc2hvdyBwcm9tcHQgZGlhbG9nIHRoYXQgd2lsbCB1cGRhdGUgZWFjaFxuXHRcdC8vIHRhZyBmcm9tIHNlbGVjdGlvblxuXHRcdHByb21wdC5zaG93KHtcblx0XHRcdGxhYmVsOiAnRW50ZXIgQWJicmV2aWF0aW9uJyxcblx0XHRcdGVkaXRvcjogZWRpdG9yLmVkaXRvcixcblx0XHRcdGVkaXRvclZpZXc6IGVkaXRvci5lZGl0b3JWaWV3LFxuXHRcdFx0dXBkYXRlOiBmdW5jdGlvbihhYmJyKSB7XG5cdFx0XHRcdHZhciB0YWcsIHJlcGxhY2VkLCBkZWx0YTtcblx0XHRcdFx0Zm9yICh2YXIgaSA9IHNlbEN0eC5sZW5ndGggLSAxLCBjdHg7IGkgPj0gMDsgaS0tKSB7XG5cdFx0XHRcdFx0Y3R4ID0gc2VsQ3R4W2ldO1xuXHRcdFx0XHRcdHRhZyA9IG51bGw7XG5cblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0dGFnID0gdXBkYXRlVGFnLmdldFVwZGF0ZWRUYWcoYWJiciwge21hdGNoOiBjdHgudGFnfSwgaW5mby5jb250ZW50LCB7XG5cdFx0XHRcdFx0XHRcdGNvdW50ZXI6IGN0eC5jb3VudGVyXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmVycm9yKGUpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICghdGFnKSB7XG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRyZXBsYWNlZCA9IFt7XG5cdFx0XHRcdFx0XHRzdGFydDogY3R4LnRhZy5vcGVuLnJhbmdlLnN0YXJ0LCBcblx0XHRcdFx0XHRcdGVuZDogY3R4LnRhZy5vcGVuLnJhbmdlLmVuZCxcblx0XHRcdFx0XHRcdGNvbnRlbnQ6IHRhZy5zb3VyY2Vcblx0XHRcdFx0XHR9XTtcblxuXHRcdFx0XHRcdGlmICh0YWcubmFtZSgpICE9IGN0eC50YWcubmFtZSAmJiBjdHgudGFnLmNsb3NlKSB7XG5cdFx0XHRcdFx0XHRyZXBsYWNlZC51bnNoaWZ0KHtcblx0XHRcdFx0XHRcdFx0c3RhcnQ6IGN0eC50YWcuY2xvc2UucmFuZ2Uuc3RhcnQsIFxuXHRcdFx0XHRcdFx0XHRlbmQ6IGN0eC50YWcuY2xvc2UucmFuZ2UuZW5kLFxuXHRcdFx0XHRcdFx0XHRjb250ZW50OiAnPC8nICsgdGFnLm5hbWUoKSArICc+J1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0cmVwbGFjZWQuZm9yRWFjaChmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRcdFx0XHRlZGl0b3IucmVwbGFjZUNvbnRlbnQoZGF0YS5jb250ZW50LCBkYXRhLnN0YXJ0LCBkYXRhLmVuZCk7XG5cdFx0XHRcdFx0XHRjdHguZmluYWxDYXJldCA9IGVkaXRvci5lZGl0b3IuZ2V0QnVmZmVyKCkucG9zaXRpb25Gb3JDaGFyYWN0ZXJJbmRleChkYXRhLnN0YXJ0KTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXG5cdFx0XHR9LFxuXHRcdFx0Y29uZmlybTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHNldEZpbmFsQ2FyZXRzKHNlbEN0eCwgZWRpdG9yLmVkaXRvcik7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn07Il19