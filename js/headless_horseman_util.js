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
        var okAttribute = _HH_PROPERTY + 'clickChecked';
        var found = false;

        // Iterate through elements looking for one that might trigger
        // an XHR.
        for (var index in elements) {
            if (!elements.hasOwnProperty(index)) {
                continue;
            }

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
            p.resolve(false);
            return p;
        }

        if (_visual) {
            // Scroll so that element is visible before clicking.
            var elTop = element.offsetTop - element.scrollTop + element.clientTop;
            window.scrollTo(0, elTop);
        }

        // Now we have a clickable element.
        p.resolve(true);
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
                  ' listeners in the registry for ' + eventName + ' event.',
                  registeredListeners);

        eventAttributeName = '[on' + eventName + ']';
        attributeListeners = Array.prototype.slice.call(
            document.querySelectorAll(eventAttributeName)
        );

        debugLog('Found ' + attributeListeners.length +
                  ' attribute listeners for ' + eventName + ' event.',
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

        return element.className.match(classRegex);
    }

    // Mouseover an element that might trigger an XHR.
    // Returns a promise.
    function mouseoverXhrElement() {
        var p = new Promise();
        var elements = findElementsWithListener('mouseover');
        var okAttribute = _HH_PROPERTY + 'mouseoverChecked';
        var found = false;

        // Iterate through elements looking for one that might trigger
        // an XHR.
        for (var index in elements) {
            if (!elements.hasOwnProperty(index)) {
                continue;
            }

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
            debugLog('mouseoverXhrElement: No elements found to mouseover.')
            p.resolve(false);
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

        p.resolve(true)
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

    // Run all patches.
    function patchAll() {
        patchAddEventListener();
        patchXhrSend();
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

    // Try to trigger XHRs by clicking on elements. Will continue to click
    // on elements until it runs out of good candidates or exceeds the max
    // number of attempts.
    //
    // Returns a promise that is resolved when it is completely finished
    // with all of its clicking.
    function tryClickXhr(n) {
        var p = new Promise();

        whenAll(
            whenXhrFinished(),
            clickXhrElement()
        ).then(function (values) {
            var found = values[1]; // The return value from clickXhrElement()

            if (found && n > 1) {
                p.resolve(tryClickXhr(n-1));
            } else {
                p.resolve();
            }
        });

        return p;
    }

    // Try to trigger an infinite scroll XHR. If successful, then repeat
    // several more times until no XHR is trigger or you hit the max
    // number of attempts.
    //
    // Returns a promise that is resolved when it is completely finished
    // with all of its scrolling.
    function tryInfiniteScroll(n) {
        var p = new Promise();

        whenAll(
            whenXhrFinished(),
            scroll(window, 'left', 'bottom')
        ).then(function (values) {
            var intercepted = values[0]; // The return value from whenXhrFinished()

            if (intercepted && n > 1) {
                p.resolve(tryInfiniteScroll(n-1));
            } else {
                p.resolve();
            }
        });

        return p;
    }

    // Try to trigger XHRs by mousing over elements. Will continue to
    // mouseover elements until it runs out of good candidates or exceeds
    // the max number of attempts.
    //
    // Returns a promise that is resolved when it is completely finished
    // with all of its mouseovers.
    function tryMouseoverXhr(n) {
        var p = new Promise();

        whenAll(
            whenXhrFinished(),
            mouseoverXhrElement()
        ).then(function (values) {
            var found = values[1]; // The return value from mouseoverXhrElement()

            if (found && n > 1) {
                p.resolve(tryMouseoverXhr(n-1));
            } else {
                p.resolve();
            }
        });

        return p;
    }

    // Delay for a period of time. Returns a promise that is resolved
    // when the delay has expired.
    function wait(milliseconds) {
        var p = new Promise();
        setTimeout(function () {p.resolve()}, milliseconds);
        return p;
    }

    // A convenience function that turns a function call into a promise.
    // Any extra arguments are passed to the specified function. If called
    // without any arguments, then it just returns a promise that is
    // immediately resolved.
    //
    // Returns a promise.
    function when() {
        var p = new Promise();
        var fn = Array.prototype.shift.apply(arguments);

        if (typeof fn === 'undefined') {
            p.resolve();
        } else {
            p.resolve(fn.apply(window, arguments));
        }

        return p;
    }

    // Returns a promise that is resolved when all of the arguments
    // are resolved.
    function whenAll() {
        var p = new Promise();
        var dependencies = Array.prototype.slice.call(arguments);
        var values = new Array(dependencies.length);
        var promisedCount = dependencies.length;
        var resolvedCount = 0;

        debugLog("whenAll: has " + promisedCount + " dependencies.");

        dependencies.forEach(function (dependency, index) {
            dependency.then(function (value) {
                resolvedCount++;
                values[index] = value;
                debugLog("whenAll: resolvedCount is " + resolvedCount + ".");

                if (resolvedCount === promisedCount) {
                    debugLog("whenAll: resolved.");
                    p.resolve(values);
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
            p.resolve(intercepted);
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

    // When a promise is resolved, run a callback with the resolved value.
    // This returns a promise so that a series of events can easily be chained
    // together. Any extra arguments are passed as arguments to the callback,
    // but note that passing extra arguments clobbers the resolved value!
    Promise.prototype.then = function () {
        var self = this;
        var p = new Promise();
        var fn = Array.prototype.shift.apply(arguments);
        var args = arguments;

        var callback = function () {
            if (args.length > 0) {
                p.resolve(fn.apply(window, args));
            } else {
                p.resolve(fn.call(window, self.value));
            }
        }

        if (this.isResolved) {
            setTimeout(callback, 0);
        } else {
            this.callbacks.push(callback);
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

            self.callbacks.forEach(function (callback) {
                setTimeout(function () {callback(value)}, 0);
            });
        }
    }

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
        'patchAll': patchAll,
        'patchXhrSend': patchXhrSend,
        'scroll': scroll,
        'setDebug': setDebug,
        'setVisual': setVisual,
        'startOverlayWatcher': startOverlayWatcher,
        'trigger': trigger,
        'tryClickXhr': tryClickXhr,
        'tryInfiniteScroll': tryInfiniteScroll,
        'tryMouseoverXhr': tryMouseoverXhr,
        'wait': wait,
        'when': when,
        'whenAll': whenAll,
        'whenXhrFinished': whenXhrFinished
    };

})(window);
