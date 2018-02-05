Scrash LUA examples
===

A set of LUA directives with JavaScript helpers that are useful to scrape dynamic pages with extensive AJAX calls.

JavaScript utilities
---
In order to gain more control on scraped pages and to not repeat common tasks in LUA scripts, we need some JavaScript utilities. They should be loaded as soon as possible, for example by [splash:autoload](http://splash.readthedocs.org/en/latest/scripting-ref.html#splash-autoload) in order to properly monkey-patch some of standard browser utilities. There are following utils in this package:

**`window.__waitForAjax(action, callback, timeoutBefore, timeoutAfter)`**

Runs `action`, captures immediate AJAX requests, waits for their completion and runs `callback`. It takes following arguments:

- `action` - a function or list of functions (in this case they will be called sequentially) that will be run as soon as AJAX calls are monkey-patched and request intercepting mechanism is ran.
- `callback` - function that is called when AJAX completes. It takes one boolean argument: `true` if ajax was intercepted and `false` if not.
- `timeoutBefore` - indicates how many miliseconds we will wait for AJAX call to be initiated. This is helpful when `debounce` of `setInterval` are implemented in some libraries and AJAX requests are not starting immidiately. If no requests are intercepted in given period, a `callback(false)` is called.
- `timeoutAfter` - indicates how many milliseconds we will wait after request is finished. It could resolve issues with eg. `AngularJS` when content is not rendering immidiately and it can take about 50ms to see the changes. The `callback` is not ran until `timeoutAfter` passes.

Example:

	window.__waitForAjax(function() {
        $('a').click();
    }, function(ajaxIntercepted) {
    	console.log('finished!')
    	if(ajaxIntercepted) {
	        console.log('AJAX intercepted!');
	    }
    });
    
If `$('a').click();` produces an AJAX request within `timeoutBefore` time, callback will be called after it finishes + `timeoutAfter` milliseconds. If no requests are captured, `ajaxIntercepted` will be set to `false`


**`window.__findListeners(eventName)`**

Finds all DOM nodes that have event listener of given type attached. It takes following arguments:

- `eventName` - single event name eg. `click` or `mouseover`, or space separated event list eg. `click mouseover keypress`

It returns list of DOM nodes that have given listener type attached to them.

Example:

	$('a').click(function() {
        console.log('clicked');
    });

    var anchors = window.__findListeners('click');
    // anchors list should contain <a> nodes previously bound by .click()
    

Example LUA directives 
---
The package contains directives that are meant to deal with sites that implement various dynamic content loading techniques.

**`ajax-click.lua`**

It runs `click` event on given element and waits for AJAX request to complete

**`infinitescroll.lua`**

It scrolls page to bottom `page_count` times. Each time it waits for intercepted AJAX request to complete.

**`mouseover.lua`**

It finds all elements that have attached `mouseover` event and trigger event on those elements and all their descendands (that's because possible [event delegation](http://learn.jquery.com/events/event-delegation/)). For each element it checks if any AJAX request was intercepted. If any, it waits for its completion and continue with another element.

Directive can be modified, so it can find also elements that have attached other event listeners such as `click` or `keypress` (please see below)

**`tabs.lua`**

Similar to `mouseover.lua`, but focused on `click` event.
It clicks all dynamically loaded tabs and waits for each to load.

An external anchor is introduced here. It is also clicked, but `splash:lock_navigation()` prevents to change url of current site, so link is ignored.


Tests
---


Unit tests consist of test module based on `unittest` and mock server based on [flask](http://flask.pocoo.org/). The server emulates all dynamic content techniques needed by lua directives, so tests are running locally.

**Running tests**

The easiest way to run tests is to start them via [Docker](https://www.docker.com/), eg.

	$ docker build -t scrash-lua-examples . && docker run -t scrash-lua-examples
	
They can also be ran without docker to simplify development, but you have to install Splash instance by your own ([tutorial](http://splash.readthedocs.org/en/latest/install.html)). If you have Splash installed, please run these commands in separate terminals:

Run splash (if you didn't run it before):

	$ python -m splash.server

Run mock server:

	$ python -m tests.server

Run tests:

	$ nosetests tests

---

[![define hyperion gray](https://hyperiongray.s3.amazonaws.com/define-hg.svg)](https://hyperiongray.com/?pk_campaign=github&pk_kwd=scrash-lua-examples "Hyperion Gray")
