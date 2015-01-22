;(function(window) {

    window.__mouseOver = function(lua_resume) {
        var nodes = window.__findListeners('mouseover');
        var actions = [];

        Zepto(nodes).each(function(index, node) {
            actions.push(function() {
                return Zepto(node).mouseover();
            })
        });

        window.__waitForAjax(actions, function(ajaxIntercepted) {
            Zepto('span').attr('data-ajax-intercepted', ajaxIntercepted)
            lua_resume();
        });
    };

})(window);
