var _via_mixin_attribution_meta = {};

function closePolygon() {
    // injected polygon close shortcut that mimic the mouse click on the first polygon point

    // if user is not edting a polygon, exit.
    if (!_via_is_user_drawing_polygon) return;

    const currentRegion = _via_canvas_regions[_via_canvas_regions.length - 1];
    const computedX0 = currentRegion.shape_attributes.all_points_x[0];
    const computedY0 = currentRegion.shape_attributes.all_points_y[0];

    const bbox = _via_canvas_bbox;

    // hack the mousedown because via checks it
    _via_reg_canvas.dispatchEvent(new MouseEvent('mousedown', {
        clientX: computedX0 + bbox.x,
        clientY: computedY0 + bbox.y
    }));
    _via_reg_canvas.dispatchEvent(new MouseEvent('mouseup', {
        clientX: computedX0 + bbox.x,
        clientY: computedY0 + bbox.y
    }));
    alertify.success("Polygon path closed");

}

// scroll by wsad
function wsadScroll(top, left) {
    window.scrollBy({left: left, top: top, behavior: 'smooth'});
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
    const link = document.createElement("link");
    link.href = url;
    link.type = "text/css";
    link.rel = "stylesheet";
    document.getElementsByTagName("head")[0].appendChild(link);
}

function assertKey(e, keycode) {
    if (keycode >= 97 && keycode <= 122) {
        return (e.which === keycode || e.keyCode === keycode || e.keyCode === keycode - 32 || e.which === keycode - 32);
    }

    if (keycode >= 65 && keycode <= 90) { // A to Z
        return (e.which === keycode || e.keyCode === keycode || e.keyCode === keycode + 32 || e.which === keycode + 32);
    }

    return e.which === keycode || e.keyCode === keycode;

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
    }

    if (assertKey(e, 83)) {
        // S
        wsadScroll(mixinConfig.keyboardMovementSpeed, 0);
    }

    if (assertKey(e, 65)) {
        // A
        wsadScroll(0, -mixinConfig.keyboardMovementSpeed);
    }
    if (assertKey(e, 68)) {
        // D
        wsadScroll(0, mixinConfig.keyboardMovementSpeed);
    }
}

function patchZoom() {
    _zoom_in = zoom_in.bind({});

    zoom_in = function () {
        if (!_via_is_user_drawing_polygon)
            _zoom_in();
    };

    _zoom_out = zoom_out.bind({});

    zoom_out = function () {
        if (!_via_is_user_drawing_polygon)
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
    let url = mixinConfig.metaUrl;
    if (url) {
        // remove leading and trailing quotes
        url = url.replace(/['"]+/g, '');
        $.ajax({
            url: url,
            dataType: 'json'
        })
            .done(function (meta) {
                _via_mixin_attribution_meta = meta;
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

function getRegionAttributeByGroup(group) {
    return _via_img_metadata[_via_image_id].regions.filter(v=>v.is_user_selected)[0].region_attributes[group];
}
function updateRegionAttribute(group, value) {
    try {
        if (_via_region_attributes.hasOwnProperty(group))
            _via_img_metadata[_via_image_id].regions.filter(v=>v.is_user_selected)[0].region_attributes[group] = value;

    } catch (e) {
        alertify.error('Failed to update region attributes');
        console.error(e);
    }
}

function getFileAttributeByGroup(group) {
    return _via_img_metadata[_via_image_id].file_attributes[group];
}

function updateFileAttribute(group, value) {
    if (_via_file_attributes.hasOwnProperty(group))
        _via_img_metadata[_via_image_id].file_attributes[group] = value;
}
function updateDialogContent() {
    const regionAttrSectionSelector = $("#region_attr_section");
    const fileAttrSectionSelector = $("#file_attr_section");
    regionAttrSectionSelector.empty();
    fileAttrSectionSelector.empty();

    Object.keys(_via_mixin_attribution_meta.regionAttribute).forEach((v) => {
        let ret = $('<div></div>');
        ret.append(`<h2>${v}</h2>`);
        let fs = $('<fieldset></fieldset>');
        ret.append(fs);
        let options = _via_mixin_attribution_meta.regionAttribute[v];
        options.forEach((cur) => {
            let val = cur;
            let idName = cur.replace(/\s+/g, '-').toLowerCase();
            let idGroup = v.replace(/\s+/g, '-').toLowerCase();

            fs.append(`<label for="${'region-' + idGroup + '-' + idName}"> ${val} </label>`);
            let input = $(`<input type="radio" name="${'region-' + idGroup}" id="${'region-' + idGroup + '-' + idName}">`);
            if (val === getRegionAttributeByGroup(v)) {
                input.prop('checked', true);
            }
            input.on('change', e => {
                if (e.target.checked)
                    updateRegionAttribute(v, val);
            });
            fs.append(input);

        });
        regionAttrSectionSelector.append(ret);
    });

    Object.keys(_via_mixin_attribution_meta.fileAttribute).forEach((v) => {
        let ret = $('<div></div>');
        ret.append(`<h2>${v}</h2>`);
        let fs = $('<fieldset></fieldset>');
        ret.append(fs);
        const options = _via_mixin_attribution_meta.fileAttribute[v];
        options.forEach((cur) => {
            let val = cur;
            let idName = cur.replace(/\s+/g, '-').toLowerCase();
            let idGroup = v.replace(/\s+/g, '-').toLowerCase();

            fs.append(`<label for="${'file-' + idGroup + '-' + idName}"> ${val} </label>`);
            let input = $(`<input type="radio" name="${'file-' + idGroup}" id="${'file-' + idGroup + '-' + idName}">`);
            if (val === getFileAttributeByGroup(v)) {
                input.prop('checked', true);
            }
            input.on('change', e => {
                if (e.target.checked)
                    updateFileAttribute(v, val);
            });
            fs.append(input);
        });
        fileAttrSectionSelector.append(ret);
    });

    // initialize all inputs
    $("#param_dialog input").checkboxradio();
}

function initializeDialog() {
    const dialogSelector = $("#param_dialog");
    // initialize the dialog
    dialogSelector.dialog({
        autoOpen: false,
        width: 400,
        modal: false
    });

    // Listen for document click to close non-modal dialog
    $(document).mousedown(function(e) {
        var clicked = $(e.target); // get the element clicked
        if (clicked.is('#param_dialog') || clicked.parents().is('#param_dialog') || clicked.is('.ui-dialog-titlebar')) {
            return; // click happened within the dialog, do nothing here
        } else { // click was outside the dialog, so close it
            $('#param_dialog').dialog("close");
        }
    });

    // put options into the dialog once it opens
    dialogSelector.on('dialogopen', updateDialogContent);

    // open dialog when region selected
    window.addEventListener('region_selected',
        () => {
            dialogSelector
                .dialog('option', 'position', {
                    my: 'left center',
                    at: `left+${Math.round(_via_current_x) + 10} top+${Math.round(_via_current_y)}`,
                    of: _via_reg_canvas
                })
                .dialog('open');
        }
    );
}

function injectionMain() {
    injectCss("mixin.css");

    injectCss("alertify.css");
    injectScript("alertify.js").then(() => {
        alertify.logPosition("bottom right");
        alertify.success("Via mixin has been injected!");
    });

    injectScript("jquery-3.3.1.min.js").then(() => {
        console.log('jQuery library loaded');
        injectScript("jquery-ui.js").then(() => {
            console.log('jQuery-ui library loaded');
            initializeDialog();
        });
    });


    injectCss("jquery-ui.css");
    injectCss("jquery-ui.structure.css");
    injectCss("jquery-ui.theme.css");

    // use dat.gui for setting
    injectScript("dat.gui.js").then(() => {
        console.log('dat.gui library loaded');
        const css = document.createElement("style");
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


