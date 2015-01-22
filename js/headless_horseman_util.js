;(function(window) {

    // Splash utils will be installed with this property name. We want
    // to make sure this does not conflict with property names that are
    // used by other frameworks.
    var _HH_PROPERTY = "__headless_horseman__";

    // True if addEventListener() has already been patched.
    var _addEventListenerIsPatched = false;

    // If true, then diagnostics will be logged to console.
    var _debug = false;

    // A registry of events and the elements that have listeners for each event.
    var _elementsWithListeners = {};

    // An event used for tracking calls to XHR.send().
    var _xhrInterceptedEvent = _HH_PROPERTY + "xhrIntercepted";

    // An event used for when an XHR finishes.
    var _xhrFinishedEvent = _HH_PROPERTY + "xhrFinished";

    // If true, then HH will do somethings for the benefit of the viewer,
    // such as scrolling to a clickable element visible before clicking
    // on it.
    var _visual = false;

    // True if XHR.send() has already been patched.
    var _xhrSendIsPatched = false;

    // Click on anchor elements that look like they might trigger an XHR.
    function clickXhrElements(finished) {
        var elements = findElementsWithListener('click');
        var currentElement = 0;

        // Iterate through elements looking for one that might trigger
        // an XHR.
        while (!_likelyTriggersXHR(elements[currentElement])) {
            currentElement++;

            if (currentElement >= elements.length) {
                finished();
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
        waitForXhr(finished);
        _trigger('click', elements[currentElement++]);
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

        _debugLog("Found " + registeredListeners.length +
                  " listeners in the registry for " + eventName + "event.",
                  registeredListeners);

        eventAttributeName = "[on" + eventName + "]";
        attributeListeners = Array.prototype.slice.call(
            document.querySelectorAll(eventAttributeName)
        );

        _debugLog("Found " + attributeListeners.length +
                  " attribute listeners for " + eventName + "event.",
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

    // Monkey patch addEventListener so that we can track all event
    // registrations. Event listeners are stored on the element itself as
    // well as in a global registry.
    function patchAddEventListener() {
        if (_addEventListenerIsPatched) {
            _debugLog("patchAddEventListener: addEventListener is already patched.");
            return;
        }

        _debugLog("Patching addEventListener.");

        var prototypeSplash = _getHH(Element.prototype);
        prototypeSplash.oldAddEventListener = Element.prototype.addEventListener;

        Element.prototype.addEventListener = function(eventType, listener, useCapture) {
            _debugLog("patchAddEventListener: addEventListener called.\nelement: ", this,
                      "\neventType: ", eventType,
                      "\nlistener: ", listener,
                      "\nuseCapture: ", useCapture);

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

            _debugLog("patchXhrSend: Intercepted XHR send\nbody: ",body);
            window.dispatchEvent(new Event(_xhrInterceptedEvent));

            oldOnLoad = this.onload;

            this.onload = function() {
                _debugLog("patchXhrSend: XHR onLoad was called.")

                window.dispatchEvent(new Event(_xhrFinishedEvent));

                if (oldOnLoad) {
                    oldOnLoad.call(self);
                }
            };

            oldOnError = this.onerror;

            this.onerror = function() {
                _debugLog("patchXhrSend: XHR onError was called.")

                window.dispatchEvent(new Event(_xhrFinishedEvent));

                if (oldOnError) {
                    oldOnError.call(self);
                }
            };

            prototypeSplash.oldXhrSend.call(this, body);
        };

        _xhrSendIsPatched = true;
    }


    // Scroll the view to the bottom.
    function scrollBottom() {
        var height = document.body.scrollHeight - window.innerHeight;
        window.scrollTo(0, height);
    }

    // Scroll the view to the bottom and wait for an XHR to finish.
    function scrollBottomXhr(finished) {
        waitForXhr(finished);
        scrollBottom();
    }

    // Scroll the view to the top.
    function scrollTop() {
        window.scrollTo(0, 0);
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
        var attributeName = "on" + eventName;
        var event = new Event(eventName);

        if (element[attributeName]) {
            element[attributeName](event);
        } else {
            element.dispatchEvent(event);
        }
    }

    // If any XHRs are opened, then wait for them to complete.
    //
    // Because an XHR may not be opened in the event handler, we wait for
    // <timeoutBefore> milliseconds to see if any XHRs are created. If there
    // are, then we wait up to <timeoutAfter> milliseconds for those XHRs to
    // finish.
    var waitForXhr = function(finished, timeoutBeforeMs, timeoutAfterMs) {
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
            finished();
        }

        function interceptedXhr(e) {
            xhrInterceptedCount++;
            _debugLog('waitForXhr: intercept count = ', xhrInterceptedCount);
        };

        function finishedXhr(e) {
            xhrFinishedCount++;
            _debugLog('waitForXhr: finished count = ', xhrFinishedCount);

            if (timerBeforeFired && xhrInterceptedCount == xhrFinishedCount) {
                _debugLog('waitForXhr: all XHRs finished');
                _finished();
            }
        }

        window.addEventListener(_xhrInterceptedEvent, interceptedXhr);
        window.addEventListener(_xhrFinishedEvent, finishedXhr);

        timerBefore = setTimeout(function () {
            timerBeforeFired = true;

            // If there are no XHRs, or if the XHRs finished before this
            // timer fired:
            if (xhrInterceptedCount == xhrFinishedCount) {
                _debugLog("waitForXhr: no XHRs sent or all XHRs finished before 'beforeTimeout'");
                _finished();
            }
        }, timeoutBeforeMs);

        timerAfter = setTimeout(function () {
            _debugLog("waitForXhr: timed out waiting for XHRs to to finished");
            _finished();
        }, timeoutAfterMs);
    }

    // Export public functions.
    window[_HH_PROPERTY] = {
        "clickXhrElements": clickXhrElements,
        "closeOverlay": closeOverlay,
        "findElementsWithListener": findElementsWithListener,
        "patchAddEventListener": patchAddEventListener,
        "patchXhrSend": patchXhrSend,
        "scrollBottom": scrollBottom,
        "scrollBottomXhr": scrollBottomXhr,
        "scrollTop": scrollTop,
        "setDebug": setDebug,
        "setVisual": setVisual,
        "waitForXhr": waitForXhr
    };

})(window);
