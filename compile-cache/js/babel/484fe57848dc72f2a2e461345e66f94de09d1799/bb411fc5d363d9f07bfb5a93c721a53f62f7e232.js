// Generates Atom menu file from Emmet action list
var fs = require("fs");
var path = require("path");
var actions = require("emmet/lib/action/main");

function generateMenu(menu) {
	return menu.map(function (item) {
		if (item.type == "action") {
			return {
				label: item.label,
				command: "emmet:" + item.name.replace(/_/g, "-")
			};
		}

		if (item.type == "submenu") {
			return {
				label: item.name,
				submenu: generateMenu(item.items)
			};
		}
	});
}

var menu = {
	menu: [{
		label: "Packages",
		submenu: [{
			label: "Emmet",
			submenu: generateMenu(actions.getMenu()).concat([{
				label: "Interactive Expand Abbreviation",
				command: "emmet:interactive-expand-abbreviation"
			}])
		}]
	}]
};

var menuFile = path.join(__dirname, "menus", "emmet.json");
fs.writeFileSync(menuFile, JSON.stringify(menu, null, "\t"), { encoding: "utf8" });

console.log("Menu file \"%s\" generated successfully", menuFile);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy91c3RyYWp1bmlvci8uYXRvbS9wYWNrYWdlcy9lbW1ldC9nZW5lcmF0ZS1tZW51LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFDQSxJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDdkIsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzNCLElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDOztBQUUvQyxTQUFTLFlBQVksQ0FBQyxJQUFJLEVBQUU7QUFDM0IsUUFBTyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVMsSUFBSSxFQUFFO0FBQzlCLE1BQUksSUFBSSxDQUFDLElBQUksSUFBSSxRQUFRLEVBQUU7QUFDMUIsVUFBTztBQUNOLFNBQUssRUFBRSxJQUFJLENBQUMsS0FBSztBQUNqQixXQUFPLEVBQUUsUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUM7SUFDaEQsQ0FBQztHQUNGOztBQUVELE1BQUksSUFBSSxDQUFDLElBQUksSUFBSSxTQUFTLEVBQUU7QUFDM0IsVUFBTztBQUNOLFNBQUssRUFBRSxJQUFJLENBQUMsSUFBSTtBQUNoQixXQUFPLEVBQUUsWUFBWSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7SUFDakMsQ0FBQztHQUNGO0VBQ0QsQ0FBQyxDQUFDO0NBQ0g7O0FBRUQsSUFBSSxJQUFJLEdBQUc7QUFDVixPQUFRLENBQUM7QUFDUixPQUFLLEVBQUUsVUFBVTtBQUNqQixTQUFPLEVBQUUsQ0FBQztBQUNULFFBQUssRUFBRSxPQUFPO0FBQ2QsVUFBTyxFQUFFLFlBQVksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNoRCxTQUFLLEVBQUUsaUNBQWlDO0FBQ3hDLFdBQU8sRUFBRSx1Q0FBdUM7SUFDaEQsQ0FBQyxDQUFDO0dBQ0gsQ0FBQztFQUNGLENBQUM7Q0FDRixDQUFDOztBQUVGLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQztBQUMzRCxFQUFFLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBQyxRQUFRLEVBQUUsTUFBTSxFQUFDLENBQUMsQ0FBQzs7QUFFakYsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5Q0FBdUMsRUFBRSxRQUFRLENBQUMsQ0FBQyIsImZpbGUiOiIvVXNlcnMvdXN0cmFqdW5pb3IvLmF0b20vcGFja2FnZXMvZW1tZXQvZ2VuZXJhdGUtbWVudS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEdlbmVyYXRlcyBBdG9tIG1lbnUgZmlsZSBmcm9tIEVtbWV0IGFjdGlvbiBsaXN0XG52YXIgZnMgPSByZXF1aXJlKCdmcycpO1xudmFyIHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG52YXIgYWN0aW9ucyA9IHJlcXVpcmUoJ2VtbWV0L2xpYi9hY3Rpb24vbWFpbicpO1xuXG5mdW5jdGlvbiBnZW5lcmF0ZU1lbnUobWVudSkge1xuXHRyZXR1cm4gbWVudS5tYXAoZnVuY3Rpb24oaXRlbSkge1xuXHRcdGlmIChpdGVtLnR5cGUgPT0gJ2FjdGlvbicpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGxhYmVsOiBpdGVtLmxhYmVsLFxuXHRcdFx0XHRjb21tYW5kOiAnZW1tZXQ6JyArIGl0ZW0ubmFtZS5yZXBsYWNlKC9fL2csICctJylcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKGl0ZW0udHlwZSA9PSAnc3VibWVudScpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGxhYmVsOiBpdGVtLm5hbWUsXG5cdFx0XHRcdHN1Ym1lbnU6IGdlbmVyYXRlTWVudShpdGVtLml0ZW1zKVxuXHRcdFx0fTtcblx0XHR9XG5cdH0pO1xufVxuXG52YXIgbWVudSA9IHtcblx0J21lbnUnOiBbe1xuXHRcdGxhYmVsOiAnUGFja2FnZXMnLFxuXHRcdHN1Ym1lbnU6IFt7XG5cdFx0XHRsYWJlbDogJ0VtbWV0Jyxcblx0XHRcdHN1Ym1lbnU6IGdlbmVyYXRlTWVudShhY3Rpb25zLmdldE1lbnUoKSkuY29uY2F0KFt7XG5cdFx0XHRcdGxhYmVsOiAnSW50ZXJhY3RpdmUgRXhwYW5kIEFiYnJldmlhdGlvbicsXG5cdFx0XHRcdGNvbW1hbmQ6ICdlbW1ldDppbnRlcmFjdGl2ZS1leHBhbmQtYWJicmV2aWF0aW9uJ1xuXHRcdFx0fV0pXG5cdFx0fV1cblx0fV1cbn07XG5cbnZhciBtZW51RmlsZSA9IHBhdGguam9pbihfX2Rpcm5hbWUsICdtZW51cycsICdlbW1ldC5qc29uJyk7XG5mcy53cml0ZUZpbGVTeW5jKG1lbnVGaWxlLCBKU09OLnN0cmluZ2lmeShtZW51LCBudWxsLCAnXFx0JyksIHtlbmNvZGluZzogJ3V0ZjgnfSk7XG5cbmNvbnNvbGUubG9nKCdNZW51IGZpbGUgXCIlc1wiIGdlbmVyYXRlZCBzdWNjZXNzZnVsbHknLCBtZW51RmlsZSk7Il19