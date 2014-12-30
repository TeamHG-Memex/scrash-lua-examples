;(function(window) {

    var boundByEvent = {};

    var patch = function() {
        Element.prototype.__addEventListener = Element.prototype.addEventListener;
        Element.prototype.addEventListener = function(type, listener, useCapture) {
            this.__addEventListener(type, listener, useCapture);
            if(!boundByEvent[type]) {
                boundByEvent[type] = [];
            }
            boundByEvent[type].push(this);
        }
    }

    window.__findListeners = function(eventName) {
        var eventNames = eventName.split(/[ ,]+/);
        var found = [];
        for(var i=0; i<eventNames.length; i++) {
            var name = eventNames[i];
            if(boundByEvent[name]) {
                for(var j=0; j<boundByEvent[name].length; j++) {
                    found.push(boundByEvent[name][j]);
                }
            }
        }
        return found;
    }

    patch();

})(window);