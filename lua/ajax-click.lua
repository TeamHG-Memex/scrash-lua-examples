function click_and_wait(splash)
    splash:runjs([[
        window.__ajaxReady = false;
        $(function() {
            setTimeout(function() {
                window.__waitForAjax(function() {
                    $('a').click();
                }, function(ajaxIntercepted) {
                    if(ajaxIntercepted) {
                        $('p').attr('data-ajax-intercepted', 'true');
                    }
                    window.__ajaxReady = true;
                });
            }, 50);
        })
    ]])
    for j=1,50 do
        ready = splash:runjs([[
            window.__ajaxReady;
        ]])
        if ready then
            break
        end
        assert(splash:wait(0.1))
    end
end

function main(splash)
  local url = splash.args.url
  -- assert(splash:autoload('file:///app/js/ajax-patch.js'))
  ok, reason = splash:autoload(splash.args.js_source)
  assert(splash:go(url))
  
  --splash:runjs(splash.args.js_source)
  click_and_wait(splash)

  splash:stop()
  splash:set_viewport("full")
 
  return {
    html = splash:html(),
    png = splash:png{width=640},
    har = splash:har(),
  }
end

