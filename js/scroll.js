;(function(window) {

    window.__scrollBottom = function() {
        var height = Zepto(document).height()
        Zepto(window).scrollTop(height);
    }

    window.__scrollTop = function() {
        window.__ajaxReady = false;
        Zepto(window).scrollTop(0);
    }

})(window);
