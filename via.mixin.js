function closePolygon() {
	// injected polygon close shortcut that mimic the mouse click on the first polygon point

	// if user is not edting a polygon, exit.
	if (!_via_is_user_drawing_polygon) return;

	var currentRegion = _via_canvas_regions[_via_canvas_regions.length - 1];
	var computedX0 = currentRegion.shape_attributes.all_points_x[0];
	var computedY0 = currentRegion.shape_attributes.all_points_y[0];

	var bbox = _via_reg_canvas.getBoundingClientRect();

	// hack the mousedown because via checks it
	_via_reg_canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: computedX0 + bbox.x, clientY: computedY0 + bbox.y }));
	_via_reg_canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: computedX0 + bbox.x, clientY: computedY0 + bbox.y }));
	alertify.success("Polygon path closed");

}

// scroll by wsad
function wsadScroll(top, left) {
	window.scrollBy({ left: left, top: top, behavior: 'smooth' });
}

function injectScript(src) {
	return new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.async = true;
		script.src = src;
		script.addEventListener('load', resolve);
		script.addEventListener('error', () => reject('Error loading script.'));
		script.addEventListener('abort', () => reject('Script loading aborted.'));
		document.head.appendChild(script);
	});
}

function injectCss(url) {
	var link = document.createElement("link");
	link.href = url;
	link.type = "text/css";
	link.rel = "stylesheet";
	document.getElementsByTagName("head")[0].appendChild(link);
}

function assertKey(e, keycode) {
	if (keycode >= 97 && keycode <= 122) {
		return (e.which == keycode || e.keyCode == keycode || e.keyCode == keycode - 32 || e.which == keycode - 32);
	}

	if (keycode >= 65 && keycode <= 90) { // A to Z
		return (e.which == keycode || e.keyCode == keycode || e.keyCode == keycode + 32 || e.which == keycode + 32);
	}

	return e.which == keycode || e.keyCode == keycode;

}
function shortCutHandler(e) {
	e = e || window.event;
	if (assertKey(e, 67) && e.ctrlKey) {
		// Ctrl + C
		closePolygon();
	}

	if (assertKey(e, 87)) {
		// W
		wsadScroll(-mixinConfig.keyboardMovementSpeed, 0);
	};

	if (assertKey(e, 83)) {
		// S
		wsadScroll(mixinConfig.keyboardMovementSpeed, 0);
	};

	if (assertKey(e, 65)) {
		// A
		wsadScroll(0, -mixinConfig.keyboardMovementSpeed);
	};

	if (assertKey(e, 68)) {
		// D
		wsadScroll(0, mixinConfig.keyboardMovementSpeed);
	};
}

function patchZoom() {
	_zoom_in = zoom_in.bind({});

	zoom_in = function () {
		if (!_via_is_user_drawing_polygon && !_via_is_user_drawing_region)
			_zoom_in();
	}

	_zoom_out = zoom_out.bind({});

	zoom_out = function () {
		if (!_via_is_user_drawing_polygon && !_via_is_user_drawing_region)
			_zoom_out();
	}
}

function MixinConfiguration() {
	this.keyboardMovementSpeed = 200;
	this.metaUrl = "";
}
mixinConfig = new MixinConfiguration();

function makeSettingPannel() {
	gui = new dat.GUI();
	gui.close();

	syncWithLocalStorage(gui.add(mixinConfig, 'keyboardMovementSpeed', 0));
	syncWithLocalStorage(gui.add(mixinConfig, 'metaUrl'));

	loadAnnotationMeta();
}

function loadAnnotationMeta() {
	var url = mixinConfig.metaUrl;
	if (url) {
		// remove leading and trailing quotes
		url = url.replace(/['"]+/g, '');
		$.ajax({
			url: url,
			dataType: 'json'
		})
			.done(function (meta) {
				// add new file attributes
				var fileAttr = meta.fileAttribute;
				Object.keys(fileAttr).map((v) => {
					// bypass the add_new_attribution because it updates ui.
					if (!_via_file_attributes.hasOwnProperty(v)) {
						_via_file_attributes[v] = true;
					}
				});

				var regionAttr = meta.regionAttribute;
				Object.keys(regionAttr).map((v) => {
					// bypass the add_new_attribution because it updates ui.
					if (!_via_region_attributes.hasOwnProperty(v)) {
						_via_region_attributes[v] = true;
					}
				});
			})
			.fail(function (err) {
				console.error(err);
				alertify.error(JSON.stringify(err));
			});
	}

}

function syncWithLocalStorage(controller) {
	if (localStorage) {
		var restoredValue = localStorage.getItem(controller.property);
		if (restoredValue)
			controller.setValue(restoredValue);
	}

	controller.onChange(function (value) {
		if (localStorage) {
			localStorage.setItem(controller.property, JSON.stringify(value))
		}
	})
}

function summonDialog() {
	var bbox = _via_reg_canvas.getBoundingClientRect();
	var x = _via_click_x1 + bbox.x;
	var y = _via_click_y1 + bbox.y;
	$("#param_dialog").dialog().position({my: "center", at: "center", of: new Event({pageX: x, pageY:y})});
}

function injectionMain() {
	injectCss("alertify.css");
	injectScript("alertify.js").then(() => {
		alertify.logPosition("bottom right");
		alertify.success("Via mixin has been injected!");
	});

	injectScript("jquery-3.3.1.min.js").then(() => {
		console.log('jQuery library loaded');
	});

	injectCss("jquery-ui.css");
	injectScript("jquery-ui.js").then(() => {
		console.log('jQuery-ui library loaded');
	});


	// use dat.gui for setting
	injectScript("dat.gui.js").then(() => {
		console.log('dat.gui library loaded');
		var css = document.createElement("style");
		css.type = "text/css";
		css.innerHTML = ".dg.ac { z-index: 99999 }";
		document.body.appendChild(css);
		makeSettingPannel();
	});




	// inject shortcuts
	window.addEventListener('keydown', shortCutHandler);

	// zooming during drawing will cause unexpected behavior;
	patchZoom();

}
injectionMain();


