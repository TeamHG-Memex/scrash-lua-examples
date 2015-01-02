;(function(window) {
    var ajaxStack = [];
    var ajaxId = 0;
    var callbacks = {};
    var isPatched = false;

    var setAjaxCallback = function(fromId, callback) {
        callbacks[fromId] = callback;
    }

    var unsetAjaxCallback = function(fromId) {
        delete callbacks[fromId];
    }

    var patch = function() {
        if(!isPatched) {
            XMLHttpRequest.prototype.__send = XMLHttpRequest.prototype.send;
            XMLHttpRequest.prototype.send = function(body) {
                var self = this;
               
                this.__id = ajaxId++;
                ajaxStack.push(this);
               
                function patchOnReadyState() {
                    var oldReadyStateChange = self.onreadystatechange || function() {};

                    self.onreadystatechange = function() {
                        if(self.readyState == 4) { 
                            ajaxStack.forEach(function(ajax) {
                                for(var fromId in callbacks) {
                                    if(fromId >= self.__id) {
                                        callbacks[fromId](self);
                                    }
                                }
                            });
                            if(oldReadyStateChange) { 
                                oldReadyStateChange.call(self);
                            }
                        }
                    }
                }
                this.__send(body);
                setTimeout(patchOnReadyState, 0);
            };
            isPatched = true;
        }
    }

    var unpatch = function() {
        if(isPatched) {
            XMLHttpRequest.prototype.send = XMLHttpRequest.prototype.__send;
            isPatched = false;
        }
    }

    var waitForAjax = function(actions, callback, timeoutBefore, timeoutAfter) {
        var action;
        var remainingActions = [];
        var currentAjaxId = ajaxId;
        var called = false;

        // Handle multiple actions
        if(Array.isArray(actions)) {
            action = actions.shift();
            remainingActions = actions;
        } else {
            action = actions;
        }

        var wrappedCallback = function(ajaxIntercepted) {
            if(!called) {
                if(remainingActions.length > 0) {
                    waitForAjax(remainingActions, callback, timeoutBefore, timeoutAfter);
                } else {
                    callback(ajaxIntercepted);
                }
                called = true;
            }
        }

        // Cancel waiting if no ajaxes intercepted in timeoutBefore seconds
        setTimeout(function() {
            if(ajaxId == currentAjaxId) {
                wrappedCallback(false);
            }
        }, timeoutBefore)

        // Set callback for further ajax calls
        setAjaxCallback(currentAjaxId, function() {
            if(ajaxId > currentAjaxId) {
                var remainingAjaxes = ajaxId - currentAjaxId;
                setTimeout(function() {
                    if(--remainingAjaxes == 0) {
                        wrappedCallback(true);
                    }
                }, timeoutAfter)
                unsetAjaxCallback(currentAjaxId);
            } else {
                wrappedCallback(false);
            }
        });
        action();
    }

    
    window.__waitForAjax = function(actions, callback, timeoutBefore, timeoutAfter) {
        if(typeof(timeoutBefore) == 'undefined') {
            timeoutBefore = 501;
        }
        if(typeof(timeoutAfter) == 'undefined') {
            timeoutAfter = 101;
        }
        waitForAjax(actions, callback, timeoutBefore, timeoutAfter);
    }


    patch();
})(window);
