function scrollDown() {
    window.__ajaxReady = false;

    Zepto(function() {
        setTimeout(function() {
            window.__waitForAjax(
                function() {
                    var height = $(document).height()
                    $('html, body').scrollTop(height);
                },
                function() {
                    window.__ajaxReady = true;
                },
                500,
                200
            );
        }, 0);
    });
}
