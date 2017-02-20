/*
  Distributed Manual Image Annotation Tool (DMIAT)
  www.robots.ox.ac.uk/~vgg/software/via/

  Copyright (c) 2016, Abhishek Dutta.
  All rights reserved.

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

  Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.
  Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.
  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
  LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
  CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
  SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
  INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
  CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
  POSSIBILITY OF SUCH DAMAGE.
*/

var attributes_list = ['name'];

var _dmiat_index;
var _dmiat_img_list;

// state of dmiat
var _dmiat_is_gist_fetch_ongoing = false;

var _dmiat_is_deposit_ongoing = false;
var _dmiat_is_pull_ongoing = false;
var _dmiat_last_deposit_failed = false;
var _dmiat_is_pull_raw_ongoing = false;

var gh = new XMLHttpRequest();
gh.addEventListener('load', responseListener);

var gh_gist = new XMLHttpRequest();
var gh_raw = new XMLHttpRequest();

var ghurl = 'https://api.github.com/';
var gistid = '416c9b4b6dab10f9c27ed783a31c18d5';

var gist_repo = {};
var gist_rawurl = '';
var gist_rawsize = -1;

function _via_load_submodules() {
    //init_payload();
    _dmiat_fetch_gist_repo(gistid);
}

function init_payload() {
    for (var i=0; i<img_url_list.length; ++i) {
	var url = img_url_list[i];
	var filename = url.substring(url.lastIndexOf('/')+1);

	var img = new ImageMetadata('', url, 0);
	img.base64_img_data = url;

	var img_id = _via_get_image_id(url);

	_via_img_metadata[img_id] = img;
	_via_image_id_list.push(img_id);
	_via_img_count += 1;
	_via_reload_img_table = true;
    }

    for (var i=0; i<attributes_list.length; ++i) {
	_via_region_attributes.add( attributes_list[i] );
    }

    //_via_image_index = get_random_int(0, img_url_list.length);
    _via_image_index = 0;
    show_image(_via_image_index);

    _dmiat_pull_metadata();
}

// returns random interger between [min,max)
function get_random_int(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

//
// handle hooks
//

function _via_hook_prev_image(img_index) {
    _dmiat_deposit_metadata(img_index);
}

function _via_hook_next_image(img_index) {
    _dmiat_deposit_metadata(img_index);
}

function responseListener() {
    if (_dmiat_is_pull_ongoing) {
	_dmiat_is_pull_ongoing = false;
	var r = this.responseText;
	var d = JSON.parse(r);

        var gist = d['files'][gistfn];
	gist_rawurl = gist['raw_url'];
	gist_rawsize = gist['size'];

        if ( gist['truncated'] ) {
            _dmiat_pull_raw_gist();
        } else {
            var content = gist['content'];
            import_annotations_from_json( content );
        }
	return;
    }

    if (_dmiat_is_deposit_ongoing) {
	_dmiat_is_deposit_ongoing = false;
	var r = this.responseText;
	var d = JSON.parse(r);

	gist_rawurl = d['files'][gistfn]['raw_url'];
	gist_rawsize = d['files'][gistfn]['size'];
	return;
    }

    if (_dmiat_is_pull_raw_ongoing) {
        _dmiat_is_pull_raw_ongoing = false;
        var r = this.responseText;
        import_annotations_from_json( r );
    }

    console.log('Response processed');
}

function _dmiat_fetch_gist_repo(gistid) {
    setTimeout(function() {
        if (!_dmiat_is_pull_ongoing) {
            try {
                _dmiat_is_gist_fetch_ongoing = true;
		var url = ghurl + 'gists/' + gistid + '?access_token=' + PERSONAL_ACCESS_TOKEN;
		gh_gist.open('GET', url);
		gh_gist.send();
            } catch(err) {
		_dmiat_is_gist_fetch_ongoing = false;
                alert('Failed to fetch gist repo.');
                console.log('Failed to fetch gist repo.');
                console.log(err.message);
            }
        }
    }, 10);
}

gh_gist.addEventListener('load', function(r) {
    if (this.status === 200) {
        gist_repo = JSON.parse(this.responseText);
        _dmiat_process_gist_repo();
    }
});

function _dmiat_fetch_gist_raw(gist_raw_url, response_listener) {
    gh_raw.addEventListener('load', response_listener);
}

function _dmiat_process_gist_repo() {
    console.log(gist_repo);

    // load dmiat-project index
    if ( typeof gist_repo['files']['index.json'] === 'Object' ) {
        var index = gist_repo['files']['index.json'];
        if (index['truncated']) {
            _dmiat_pull_raw_gist(index['raw_url'], _dmiat_process_index);
        } else {
            _dmiat_process_index( index['content'] );
        }
    }
}

function _dmiat_process_index(index_json_str, callback) {
    _dmiat_index = JSON.parse(index_json_str);

    // set project title
    document.title = _dmiat_index['name'];

    callback();
}

    // load attributes
    // @todo

    // load image list
    var img_list_fn = _dmiat_index['image_list'];
    var img_list = gist_repo['files'][img_list_fn];

    if ( img_list['truncated'] ) {
        _dmiat_pull_raw_gist( img_list['raw_url'], _dmiat_process_img_list);
    } else {
        _dmiat_process_img_list(img_list['content']);
    }

    // load lock file

    // request for lock on a file

    // process file

    // push annotation data

    // release lock
}

function _dmiat_process_img_list(img_list_json_str) {
    _dmiat_img_list = JSON.parse(img_list_json_str);

    // load each image in the list
    for (var i=0; i<img_url_list.length; ++i) {
	var url = img_url_list[i];
	var filename = url.substring(url.lastIndexOf('/')+1);

	var img = new ImageMetadata('', url, 0);
	img.base64_img_data = url;

	var img_id = _via_get_image_id(url);

	_via_img_metadata[img_id] = img;
	_via_image_id_list.push(img_id);
	_via_img_count += 1;
	_via_reload_img_table = true;
    }

}

function _dmiat_pull_raw_gist(rawurl, response_handler) {
    var gh_raw = new XMLHttpRequest();
    gh_raw.addEventListener('load', function() {
        if (this.status === 200) {
            response_handler(this.responseText);
        }
    });

    try {
        gh_raw.open('GET', rawurl);
        gh_raw.send();
    }  catch(err) {
        alert('Failed to pull raw data file.');
        console.log('Failed to pull raw data file.');
        console.log(err.message);
    }
}

function _dmiat_pull_metadata() {
    setTimeout(function() {
        if (!_dmiat_is_pull_ongoing) {
            try {
                _dmiat_is_pull_ongoing = true;
		var url = ghurl + 'gists/' + gistid + '?access_token=' + PERSONAL_ACCESS_TOKEN;
		gh.open('GET', url);
		gh.send();
            } catch(err) {
		_dmiat_is_pull_ongoing = false;
                show_message('Failed to pull metadata.');
                alert('Failed to pull metadata.');
                console.log('Failed to pull metadata.');
                console.log(err.message);
            }
        }
    }, 10);
}

function _dmiat_deposit_metadata(image_index) {
    setTimeout(function() {
        if (!_dmiat_is_deposit_ongoing) {
            try {
                _dmiat_is_deposit_ongoing = true;

		var img_metadata = pack_via_metadata('json');
		var img_metadata_str = JSON.stringify(img_metadata[0]);

		var payload = {};
		payload['description'] = image_index.toString();
		payload['files'] = {};
		payload['files'][gistfn] = {};
		payload['files'][gistfn]['content'] = img_metadata_str;


		var url = ghurl + 'gists/' + gistid + '?access_token=' + PERSONAL_ACCESS_TOKEN;

                /*
		console.log('sending to url : ' + url);
		console.log('payload : ' + JSON.stringify(payload));
                console.log(payload);
		console.log('img_metadata : ' + img_metadata);
		console.log('img_metadata (str) : ' + img_metadata_str);
                _dmiat_is_deposit_ongoing = false;
                */

		gh.open('PATCH', url);
		gh.send(JSON.stringify(payload));
            } catch(err) {
		_dmiat_is_deposit_ongoing = false;
                show_message('Failed to deposit metadata changes.');
                alert('Failed to deposit metadata changes.');
                console.log('Failed to deposit metadata changes.');
                console.log(err.message);
            }
        }
    }, 100);
}

// compare the size of local img_metadata size with that of remote
function _dmiat_is_remote_metadata_updated() {
    if (gist_rawsize != -1) {
	var img_metadata = pack_via_metadata('json');
	var img_metadata_str = JSON.stringify(img_metadata[0]);

	if (img_metadata_str.length == gist_rawsize) {
	    return false;
	} else {
	    return true;
	}
    } else {
	return true;
    }
}
