function mouseover_bound_elements_and_wait(splash)
    splash:runjs([[
        $(function() {
            setTimeout(function() {
              window.__ajaxReady = false;
              var nodes = window.__findListeners('mouseover');
              var nodesWithDescendants = $(nodes).add('*', nodes);
              var actions = [];
              nodesWithDescendants.each(function(index, node) {
                  actions.push(function() {
                      return $(node).mouseover();
                  })
              });
              window.__waitForAjax(actions, function(ajaxIntercepted) {
                  window.__ajaxReady = true;
                  $('span').attr('data-ajax-intercepted', ajaxIntercepted)
              });
            }, 500)
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
  splash:autoload(splash.args.js_source)
  assert(splash:go(url))
  
  mouseover_bound_elements_and_wait(splash)

  splash:stop()
  splash:set_viewport("full")
 
  return {
    html = splash:html(),
    png = splash:png{width=640},
    har = splash:har(),
  }
end

