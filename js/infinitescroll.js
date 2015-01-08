;(function(window) {

    window.__scrollAndWait = function() {
        window.__ajaxReady = false;

        window.__waitForAjax(
            window.__scrollBottom,
            function() {
                window.__ajaxReady = true;
            },
            500,
            200
        );
    }

})(window);
