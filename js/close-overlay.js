;(function(window) {

    Zepto(function () {
        window.setInterval(function () {
            Zepto('button.modal-close,div.fancybox-close').click();
        }, 1000);
    });

})(window);
