;(function(window) {

    // Splash utils will be installed with this property name. We want
    // to make sure this does not conflict with property names that are
    // used by other frameworks.
    var _HH_PROPERTY = '__headless_horseman__';

    // Calling window.scrollTo() too quickly doesn't seem to work well,
    // therefore all of our scrolling APIs introduce a small delay.
    var _SCROLL_DELAY_MS = 100;

    // True if addEventListener() has already been patched.
    var _addEventListenerIsPatched = false;

    // If true, then diagnostics will be logged to console.
    var _debug = false;

    // A registry of events and the elements that have listeners for each event.
    var _elementsWithListeners = {};

    // An event used for tracking calls to XHR.send().
    var _xhrInterceptedEvent = _HH_PROPERTY + 'xhrIntercepted';

    // An event used for when an XHR finishes.
    var _xhrFinishedEvent = _HH_PROPERTY + 'xhrFinished';

    // If true, then HH will do somethings for the benefit of the viewer,
    // such as scrolling to a clickable element visible before clicking
    // on it.
    var _visual = false;

    // True if XHR.send() has already been patched.
    var _xhrSendIsPatched = false;

    // Run a callback in the next tick.
    function _callOnNextTick(callback) {
        setTimeout(callback, 0);
    }

    // Click on elements that look like they might trigger an XHR.
    // Returns a promise.
    function clickXhrElements() {
        var p = new _Promise();
        var elements = findElementsWithListener('click');
        var currentElement = 0;

        // Iterate through elements looking for one that might trigger
        // an XHR.
        while (!_likelyTriggersXHR(elements[currentElement])) {
            currentElement++;

            if (currentElement >= elements.length) {
                p.resolve();
                return p;
            }
        }

        if (_visual) {
            // Scroll so that element is visible before clicking.
            var el = elements[currentElement];
            var elTop = el.offsetTop - el.scrollTop + el.clientTop;
            window.scrollTo(0, elTop);
        }

        // Now we have a clickable element: click it and wait for the
        // XHR to finish.
        p.resolve(whenXhrFinished());
        _trigger('click', elements[currentElement++]);

        return p;
    }

    // Close an overlay that obscures page contents. This selector
    // works for Twitter and dontsellbodies.org, but obviously it
    // doesn't generalize very well...
    function closeOverlay() {
        window.setInterval(function () {
            var els = document.querySelectorAll('button.modal-close,div.fancybox-close');
            els.forEach(function (el) {
                _trigger('click', el);
            });
        }, 1000);
    }

    // Write to the console log if debug mode is enabled.
    function _debugLog() {
        if (_debug) {
            console.log.apply(console, arguments);
        }
    }

    // Return an array of elements that have event listeners for the
    // specified eventName, e.g. 'click'.
    function findElementsWithListener(eventName) {
        var registeredListeners = [];

        // Check the registry for listeners.
        if (_elementsWithListeners.hasOwnProperty(eventName)) {
            Object.keys(_elementsWithListeners[eventName]).forEach(function (key) {
                registeredListeners.push(_elementsWithListeners[eventName][key])
            });
        }

        _debugLog('Found ' + registeredListeners.length +
                  ' listeners in the registry for ' + eventName + 'event.',
                  registeredListeners);

        eventAttributeName = '[on' + eventName + ']';
        attributeListeners = Array.prototype.slice.call(
            document.querySelectorAll(eventAttributeName)
        );

        _debugLog('Found ' + attributeListeners.length +
                  ' attribute listeners for ' + eventName + 'event.',
                  attributeListeners);

        return registeredListeners.concat(attributeListeners);
    }

    // Get the headless horseman property for an object, creating
    // it first, if necessary.
    function _getHH(obj) {
        if (!obj.hasOwnProperty(_HH_PROPERTY)) {
            obj[_HH_PROPERTY] = {};
        }

        return obj[_HH_PROPERTY];
    }

    // Return true if this element looks like it triggers an XHR.
    // This is a very rough heuristic.
    function _likelyTriggersXHR(element) {
        var regex = /(more|load)/i;

        return element.textContent.match(regex);
    }

    // Click on anchor elements that look like they might trigger an XHR.
    // Returns a promise.
    function clickXhrElements() {
        var p = new _Promise();
        var elements = findElementsWithListener('click');
        var currentElement = 0;

        // Iterate through elements looking for one that might trigger
        // an XHR.
        while (!_likelyTriggersXHR(elements[currentElement])) {
            currentElement++;

            if (currentElement >= elements.length) {
                p.resolve();
                return p;
            }
        }

        if (_visual) {
            // Scroll so that element is visible before clicking.
            var el = elements[currentElement];
            var elTop = el.offsetTop - el.scrollTop + el.clientTop;
            window.scrollTo(0, elTop);
        }

        // Now we have a clickable element: click it and wait for the
        // XHR to finish.
        p.resolve(whenXhrFinished());
        _debugLog('Clicking on', elements[currentElement]);
        _trigger('click', elements[currentElement]);

        return p;
    }

    // Mouse over elements that have mouseover event handlers.
    // Returns a promise.
    function mouseoverElements() {
        var p = new _Promise();
        var elements = findElementsWithListener('mouseover');
        var currentElement = 0;

        elements.forEach(function (element) {
            if (_visual) {
                // Scroll so that element is visible before mouseover.
                var elTop = element.offsetTop - element.scrollTop + element.clientTop;
                window.scrollTo(0, elTop);
            }

            // Now we have a mouserover-able element.
            _debugLog('Mousing over', element);
            _trigger('mouseover', element);
        });

        p.resolve();
        return p;
    }

    // Resolve a promise on the next tick.
    function nextTick() {
        return wait(0);
    }

    // Monkey patch addEventListener so that we can track all event
    // registrations. Event listeners are stored on the element itself as
    // well as in a global registry.
    function patchAddEventListener() {
        if (_addEventListenerIsPatched) {
            _debugLog('patchAddEventListener: addEventListener is already patched.');
            return;
        }

        _debugLog('Patching addEventListener.');

        var prototypeSplash = _getHH(Element.prototype);
        prototypeSplash.oldAddEventListener = Element.prototype.addEventListener;

        Element.prototype.addEventListener = function(eventType, listener, useCapture) {
            _debugLog('patchAddEventListener: addEventListener called.\nelement: ', this,
                      '\neventType: ', eventType,
                      '\nlistener: ', listener,
                      '\nuseCapture: ', useCapture);

            var thisSplash = _getHH(this);

            // Register this event on the element itself.
            if (!thisSplash.hasOwnProperty('eventListeners')) {
                thisSplash.eventListeners = {};
            }

            if (!thisSplash.eventListeners.hasOwnProperty(eventType)) {
                thisSplash.eventListeners[eventType] = [];
            }

            thisSplash.eventListeners[eventType].push(listener);

            // Register this event in the registry.
            if (!_elementsWithListeners.hasOwnProperty(eventType)) {
                _elementsWithListeners[eventType] = {};
            }

            _elementsWithListeners[eventType][this] = this; // Hash used as a set.

            // Finally, call the patched function.
            args = [eventType, listener, useCapture];
            prototypeSplash.oldAddEventListener.apply(this, args);
        }

        _addEventListenerIsPatched = true;
    }

    // Monkey patch the XHR.send() method so that we can track when
    // XHRs start and finish.
    function patchXhrSend() {
        if(_xhrSendIsPatched) {
            return;
        }

        var prototypeSplash = _getHH(XMLHttpRequest.prototype);
        prototypeSplash.oldXhrSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.send = function(body) {
            var self = this;
            var oldOnLoad;

            _debugLog('patchXhrSend: Intercepted XHR send\nbody: ',body);
            window.dispatchEvent(new Event(_xhrInterceptedEvent));

            oldOnLoad = this.onload;

            this.onload = function() {
                _debugLog('patchXhrSend: XHR onLoad was called.')

                window.dispatchEvent(new Event(_xhrFinishedEvent));

                if (oldOnLoad) {
                    oldOnLoad.call(self);
                }
            };

            oldOnError = this.onerror;

            this.onerror = function() {
                _debugLog('patchXhrSend: XHR onError was called.')

                window.dispatchEvent(new Event(_xhrFinishedEvent));

                if (oldOnError) {
                    oldOnError.call(self);
                }
            };

            prototypeSplash.oldXhrSend.call(this, body);
        };

        _xhrSendIsPatched = true;
    }

    // Scroll an element to a given position. This function wraps scrollTo
    // so that we can introduce a delay. (See note on _SCROLL_DELAY_MS.)
    // If xhr is true, then after scrolling, it will wait for XHRs to finish.
    // Returns a promise.
    function scroll(el, x, y, xhr) {
        if (x === 'left') {
            x = 0;
        } else if (x === 'right') {
            if (el === window) {
                x = document.body.scrollWidth;
            } else {
                x = el.scrollWidth - el.clientWidth;
            }
        }

        if (y === 'top') {
            y = 0;
        } else if (y === 'bottom') {
            if (el === window) {
                y = document.body.scrollHeight;
            } else {
                y = el.scrollHeight - el.clientHeight;
            }
        }

        _debugLog('Scroll to (' + x + ', ' + y + ')', el);

        if (el === window) {
            window.scrollTo(x, y);
        } else {
            el.scrollLeft = x;
            el.scrollTop = y;
        }

        return wait(_SCROLL_DELAY_MS);
    }

    // Enable or disable debug mode.
    function setDebug(enabled) {
        _debug = enabled;
    }

    // Enable or disable visual mode.
    function setVisual(enabled) {
        _visual = enabled;
    }

    // Simulate an event on an element.
    function _trigger(eventName, element) {
        var attributeName = 'on' + eventName;
        var event = new Event(eventName);

        if (element[attributeName]) {
            element[attributeName](event);
        } else {
            element.dispatchEvent(event);
        }
    }

    // Delay for a period of time. Returns a promise that is resolved
    // when the delay has expired.
    function wait(milliseconds) {
        var p = new _Promise();

        setTimeout(function () {p.resolve()}, milliseconds);

        return p;
    }

    // Returns a promise that is resolved when all of the arguments
    // are resolved.
    function whenAll() {
        var p = new _Promise();
        var dependencies = Array.prototype.slice.call(arguments);
        var promisedCount = dependencies.length;
        var resolvedCount = 0;

        _debugLog("whenAll: has " + promisedCount + "dependencies.");

        dependencies.forEach(function (dependency) {
            dependency.then(function () {
                resolvedCount++;
                _debugLog("whenAll: resolvedCount is " + resolvedCount + ".");

                if (resolvedCount === promisedCount) {
                    _debugLog("whenAll: resolved.");
                    p.resolve();
                }
            });
        });

        return p;
    }

    // If any XHRs are opened, then wait for them to complete.
    //
    // Because an XHR may not be opened in the event handler, we wait for
    // <timeoutBefore> milliseconds to see if any XHRs are created. If there
    // are, then we wait up to <timeoutAfter> milliseconds for those XHRs to
    // finish.
    //
    // Typically, you want to call this _before_ you do something that
    // triggers an XHR, so that this function can detect the send event.
    //
    // Returns a promise.
    function whenXhrFinished(timeoutBeforeMs, timeoutAfterMs) {
        var p = new _Promise();

        var timeoutBeforeMs = timeoutBeforeMs || 10;
        var timeoutAfterMs = timeoutAfterMs || 2000;

        var xhrInterceptedCount = 0;
        var xhrFinishedCount = 0;

        var timerBefore;
        var timerBeforeFired = false;
        var timerAfter;

        function _finished() {
            xhrInterceptedCount = xhrFinishedCount = 0;
            window.removeEventListener(_xhrInterceptedEvent, interceptedXhr);
            window.removeEventListener(_xhrFinishedEvent, finishedXhr);
            clearTimeout(timerBefore);
            clearTimeout(timerAfter);
            p.resolve();
        }

        function interceptedXhr(e) {
            xhrInterceptedCount++;
            _debugLog('whenXhrFinished: intercept count = ', xhrInterceptedCount);
        };

        function finishedXhr(e) {
            xhrFinishedCount++;
            _debugLog('whenXhrFinished: finished count = ', xhrFinishedCount);

            if (timerBeforeFired && xhrInterceptedCount == xhrFinishedCount) {
                _debugLog('whenXhrFinished: all XHRs finished');
                _finished();
            }
        }

        window.addEventListener(_xhrInterceptedEvent, interceptedXhr);
        window.addEventListener(_xhrFinishedEvent, finishedXhr);

        timerBefore = setTimeout(function () {
            timerBeforeFired = true;

            // If there are no XHRs, or if the XHRs finished before this
            // timer fired:
            if (xhrInterceptedCount === xhrFinishedCount) {
                if (xhrInterceptedCount === 0) {
                    _debugLog('whenXhrFinished: no XHRs sent before "beforeTimeout"');
                } else {
                    _debugLog('whenXhrFinished: all XHRs finished before "beforeTimeout"');
                }
                _finished();
            }
        }, timeoutBeforeMs);

        timerAfter = setTimeout(function () {
            _debugLog('whenXhrFinished: timed out waiting for XHRs to to finished');
            _finished();
        }, timeoutAfterMs);

        return p;
    }

    // A lightweight implementation of a promise. This isn't a full A+
    // implementation -- just the basics we need for HH. We want this to
    // keep our callback hell to a minimum, especially for things like
    // scrolling that need to introduce some delay or run callbacks on the
    // next tick.
    function _Promise() {
        this.isResolved = false;
        this.value = undefined;
        this.callbacks = [];
    }

    // When a promise is resolved, run a callback. This returns a promise
    // so that a series of events can easily be chained together.
    _Promise.prototype.then = function (callback) {
        var p = new _Promise();

        if (this.isResolved) {
            p.resolve(callback(this.value));
        } else {
            this.callbacks.push(function (value) {
                p.resolve(callback(value));
            });
        }

        return p;
    }

    // Resolve a promise with either a concrete value or another promise.
    // If it's a concrete value, then all of the callbacks are executed.
    // If it's another promise, then this promise is set to resolve when
    // the other promise resolves.
    _Promise.prototype.resolve = function (value) {
        var self = this;

        if (value instanceof _Promise) {
            value.then(function (nestedValue) {
                self.resolve(nestedValue);
            });
        } else {
            this.isResolved = true;
            this.value = value;

            setTimeout(function () {
                self.callbacks.forEach(function (callback) {
                    callback(value);
                });
            }, 0);
        }
    }

    // Export public functions.
    window[_HH_PROPERTY] = {
        'clickXhrElements': clickXhrElements,
        'closeOverlay': closeOverlay,
        'findElementsWithListener': findElementsWithListener,
        'mouseoverElements': mouseoverElements,
        'nextTick': nextTick,
        'patchAddEventListener': patchAddEventListener,
        'patchXhrSend': patchXhrSend,
        'scroll': scroll,
        'setDebug': setDebug,
        'setVisual': setVisual,
        'wait': wait,
        'whenAll': whenAll,
        'whenXhrFinished': whenXhrFinished
    };

})(window);
