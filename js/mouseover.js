;(function(window) {

    window.__mouseOver = function() {
        window.__ajaxReady = false;

        var nodes = window.__findListeners('mouseover');
        var actions = [];

        Zepto(nodes).each(function(index, node) {
            actions.push(function() {
                return Zepto(node).mouseover();
            })
        });

        window.__waitForAjax(actions, function(ajaxIntercepted) {
            window.__ajaxReady = true;
            Zepto('span').attr('data-ajax-intercepted', ajaxIntercepted)
        });
    };

})(window);
