;(function(window) {

    // Return true if this anchor tag looks like it triggers an XHR.
    // This is a very rough heuristic.
    function _likelyTriggersXHR(anchor) {
        var regex = /(more|load)/i;

        return anchor.onclick && anchor.textContent.match(regex);
    }

    window.__ajaxClick = function () {
        Zepto(function () {
            var links = Zepto('a');
            var currentLink = 0;

            window.__ajaxReady = false;

            // Iterate through anchors looking for one that might trigger
            // an XHR.
            while (!_likelyTriggersXHR(links[currentLink])) {
                currentLink++;

                if (currentLink >= links.length) {
                    window.__ajaxReady = true;
                    return;
                }
            }

            // Now we have an anchor; click it and wait for the XHR to finish.
            window.__waitForAjax(function() {
                // Scroll to the link so that the visual demo is easier to follow:
                Zepto(window).scrollTop(Zepto(links[currentLink]).offset().top);
                links[currentLink].click();
                currentLink++;
            }, function(ajaxIntercepted) {
                window.__ajaxReady = true;
            });
        });
    };

})(window);


