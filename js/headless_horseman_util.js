;(function(window) {

    // Splash utils will be installed with this property name. We want
    // to make sure this does not conflict with property names that are
    // used by other frameworks.
    var _HH_PROPERTY = '__headless_horseman__';

    // Calling window.scrollTo() too quickly doesn't seem to work well,
    // therefore all of our scrolling APIs introduce a small delay. I
    // picked this value experimentally by messing around with Twitter
    // and dontsellbodies.org.
    var _SCROLL_DELAY_MS = 1000;

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

    // Return true if it looks like clicking this element triggers an XHR.
    // This is a very rough heuristic.
    // TODO: Fine tune based on real world sites.
    function clickLikelyTriggersXhr(element) {
        var regex = /(more|load)/i;

        return element.tagName == 'A' && element.innerText.match(regex);
    }

    // Click on an element that looks like it might trigger an XHR.
    // Returns a promise.
    function clickXhrElement() {
        var p = new Promise();
        var elements = findElementsWithListener('click');
        var currentElement = 0;
        var okAttribute = _HH_PROPERTY + 'clickChecked';
        var found = false;

        // Iterate through elements looking for one that might trigger
        // an XHR.
        for (var index in elements) {
            var element = elements[index];

            if (!element.hasAttribute(okAttribute) && clickLikelyTriggersXhr(element)) {
                found = true;
            }

            element.setAttribute(okAttribute, 'ok');

            if (found) {
                break;
            }
        }

        if (!found) {
            debugLog('clickXhrElement: No elements found to click on.')
            p.resolve();
            return p;
        }

        if (_visual) {
            // Scroll so that element is visible before clicking.
            var elTop = element.offsetTop - element.scrollTop + element.clientTop;
            window.scrollTo(0, elTop);
        }

        // Now we have a clickable element.
        p.resolve();
        trigger('click', element);

        return p;
    }

    // Write to the console log if debug mode is enabled.
    function debugLog() {
        if (_debug) {
            console.log.apply(console, arguments);
        }
    }

    // Return an array of elements that have event listeners for the
    // specified eventName, e.g. 'click'.
    function findElementsWithListener(eventName) {
        var registeredListeners;
        var attributeListeners;

        // Check the registry for listeners.
        if (_elementsWithListeners.hasOwnProperty(eventName)) {
            registeredListeners = _elementsWithListeners[eventName];
        } else {
            registeredListeners = [];
        }

        debugLog('Found ' + registeredListeners.length +
                  ' listeners in the registry for ' + eventName + 'event.',
                  registeredListeners);

        eventAttributeName = '[on' + eventName + ']';
        attributeListeners = Array.prototype.slice.call(
            document.querySelectorAll(eventAttributeName)
        );

        debugLog('Found ' + attributeListeners.length +
                  ' attribute listeners for ' + eventName + 'event.',
                  attributeListeners);

        return registeredListeners.concat(attributeListeners);
    }

    // Get the headless horseman property for an object, creating
    // it first, if necessary.
    function getHH(obj) {
        if (!obj.hasOwnProperty(_HH_PROPERTY)) {
            obj[_HH_PROPERTY] = {};
        }

        return obj[_HH_PROPERTY];
    }

    // Return true if it looks like mousing over this element triggers an XHR.
    // This is a very rough heuristic.
    // TODO: Fine tune based on real-world sites.
    function mouseoverLikelyTriggersXhr(element) {
        var classRegex = /hover/i;
        debugLog(element.className);
        if (element.hasAttribute('data-asin')) debugLog(element.getAttribute('data-asin'));
        return element.className.match(classRegex);
    }

    // Mouseover an element that might trigger an XHR.
    // Returns a promise.
    function mouseoverXhrElement() {
        var p = new Promise();
        var elements = findElementsWithListener('mouseover');
        var currentElement = 0;
        var okAttribute = _HH_PROPERTY + 'mouseoverChecked';
        var found = false;

        // Iterate through elements looking for one that might trigger
        // an XHR.
        for (var index in elements) {
            var element = elements[index];

            if (!element.hasAttribute(okAttribute) && mouseoverLikelyTriggersXhr(element)) {
                found = true;
            }

            element.setAttribute(okAttribute, 'ok');

            if (found) {
                break;
            }
        }

        if (!found) {
            debugLog('clickXhrElement: No elements found to mouseover.')
            p.resolve();
            return p;
        }

        if (_visual) {
            // Scroll so that element is visible before clicking.
            var elTop = element.offsetTop - element.scrollTop + element.clientTop;
            window.scrollTo(0, elTop);
        }

        // Now we have a mouserover-able element.
        debugLog('Mousing over', element);
        trigger('mouseover', element);

        p.resolve()
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
            debugLog('patchAddEventListener: addEventListener is already patched.');
            return;
        }

        debugLog('Patching addEventListener.');

        var prototypeSplash = getHH(Element.prototype);
        prototypeSplash.oldAddEventListener = Element.prototype.addEventListener;

        Element.prototype.addEventListener = function(eventType, listener, useCapture) {
            debugLog('patchAddEventListener: addEventListener called.\nelement: ', this,
                      '\neventType: ', eventType,
                      '\nlistener: ', listener,
                      '\nuseCapture: ', useCapture);

            var thisSplash = getHH(this);

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
                _elementsWithListeners[eventType] = [];
            }

            // TODO: Elements with multiple listeners will be pushed on this
            // list multiple times, but I'm not aware of any more efficient
            // data structure to do this.
            _elementsWithListeners[eventType].push(this)

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

        var prototypeSplash = getHH(XMLHttpRequest.prototype);
        prototypeSplash.oldXhrSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.send = function(body) {
            var self = this;
            var oldOnLoad;

            debugLog('patchXhrSend: Intercepted XHR send\nbody: ',body);
            window.dispatchEvent(new Event(_xhrInterceptedEvent));

            oldOnLoad = this.onload;

            this.onload = function() {
                debugLog('patchXhrSend: XHR onLoad was called.')

                window.dispatchEvent(new Event(_xhrFinishedEvent));

                if (oldOnLoad) {
                    oldOnLoad.call(self);
                }
            };

            oldOnError = this.onerror;

            this.onerror = function() {
                debugLog('patchXhrSend: XHR onError was called.')

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

        debugLog('Scroll to (' + x + ', ' + y + ')', el);

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

    // Close an overlay that obscures page contents. This is a rough heuristic.
    // It's based on having a high z-index and covering a lot of the screen.
    //
    // To do: there may be better heuristics. We could compute a weighted
    // average of z-indexes, take opacity into account, etc. Let's see how
    // this works in practice and start building up a list of real sites
    // that have overlays.
    function startOverlayWatcher() {
        setInterval(function () {
            var baseZIndex = window.getComputedStyle(document.documentElement).zIndex;
            var areaThreshold = window.innerHeight * window.innerWidth * 0.33;
            var okAttribute = _HH_PROPERTY + 'overlayChecked';

            var divs = Array.prototype.slice.call(
                document.querySelectorAll('div:not([' + okAttribute + '])')
            );

            divs.forEach(function (div) {
                var divZIndex = window.getComputedStyle(div).zIndex;
                var divArea = div.scrollHeight * div.scrollWidth;

                if (divZIndex != 'auto' &&
                    divZIndex > baseZIndex &&
                    divArea > areaThreshold) {

                    debugLog('Div looks like an overlay: div z-index(' +
                              divZIndex + ') > windox z-index(' +
                              baseZIndex + ') and div area(' +
                              divArea + ') > threshold(' +
                              areaThreshold + ').');

                    div.parentNode.removeChild(div);
                } else {
                    div.setAttribute(okAttribute, 'ok');
                }
            });
        }, 1000);
    }

    // Simulate an event on an element.
    function trigger(eventName, element) {
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
        var p = new Promise();

        setTimeout(function () {p.resolve()}, milliseconds);

        return p;
    }

    // Returns a promise that is resolved when all of the arguments
    // are resolved.
    function whenAll() {
        var p = new Promise();
        var dependencies = Array.prototype.slice.call(arguments);
        var promisedCount = dependencies.length;
        var resolvedCount = 0;

        debugLog("whenAll: has " + promisedCount + " dependencies.");

        dependencies.forEach(function (dependency) {
            dependency.then(function () {
                resolvedCount++;
                debugLog("whenAll: resolvedCount is " + resolvedCount + ".");

                if (resolvedCount === promisedCount) {
                    debugLog("whenAll: resolved.");
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
        var p = new Promise();

        var timeoutBeforeMs = timeoutBeforeMs || 10;
        var timeoutAfterMs = timeoutAfterMs || 2500;

        var xhrInterceptedCount = 0;
        var xhrFinishedCount = 0;

        var timerBefore;
        var timerBeforeFired = false;
        var timerAfter;

        function finished(intercepted) {
            xhrInterceptedCount = xhrFinishedCount = 0;
            window.removeEventListener(_xhrInterceptedEvent, interceptedXhr);
            window.removeEventListener(_xhrFinishedEvent, finishedXhr);
            clearTimeout(timerBefore);
            clearTimeout(timerAfter);
            p.resolve(intercepted ? 'true' : 'false');
        }

        function interceptedXhr(e) {
            xhrInterceptedCount++;
            debugLog('whenXhrFinished: intercept count = ', xhrInterceptedCount);
        };

        function finishedXhr(e) {
            xhrFinishedCount++;
            debugLog('whenXhrFinished: finished count = ', xhrFinishedCount);

            if (timerBeforeFired && xhrInterceptedCount == xhrFinishedCount) {
                debugLog('whenXhrFinished: all XHRs finished');
                finished(true);
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
                    debugLog('whenXhrFinished: no XHRs sent before "beforeTimeout"');
                    finished(false);
                } else {
                    debugLog('whenXhrFinished: all XHRs finished before "beforeTimeout"');
                    finished(true);
                }
            }
        }, timeoutBeforeMs);

        timerAfter = setTimeout(function () {
            debugLog('whenXhrFinished: timed out waiting for XHRs to to finished');
            finished();
        }, timeoutAfterMs);

        return p;
    }

    // A lightweight implementation of a promise. This isn't a full A+
    // implementation -- just the basics we need for HH. We want this to
    // keep our callback hell to a minimum, especially for things like
    // scrolling that need to introduce some delay or run callbacks on the
    // next tick.
    function Promise() {
        this.isResolved = false;
        this.value = undefined;
        this.callbacks = [];
    }

    // When a promise is resolved, run a callback. This returns a promise
    // so that a series of events can easily be chained together.
    Promise.prototype.then = function (callback) {
        var p = new Promise();

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
    Promise.prototype.resolve = function (value) {
        var self = this;

        if (value instanceof Promise) {
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

    // Apply patches.
    patchAddEventListener();
    patchXhrSend();

    // Export public functions.
    window[_HH_PROPERTY] = {
        'clickLikelyTriggersXhr': clickLikelyTriggersXhr,
        'clickXhrElement': clickXhrElement,
        'debugLog': debugLog,
        'findElementsWithListener': findElementsWithListener,
        'getHH': getHH,
        'mouseoverLikelyTriggersXhr': mouseoverLikelyTriggersXhr,
        'mouseoverXhrElement': mouseoverXhrElement,
        'nextTick': nextTick,
        'patchAddEventListener': patchAddEventListener,
        'patchXhrSend': patchXhrSend,
        'scroll': scroll,
        'setDebug': setDebug,
        'setVisual': setVisual,
        'startOverlayWatcher': startOverlayWatcher,
        'trigger': trigger,
        'wait': wait,
        'whenAll': whenAll,
        'whenXhrFinished': whenXhrFinished
    };

})(window);
