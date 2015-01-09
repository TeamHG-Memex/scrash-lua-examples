--[[
python demo.py 'http://www.amazon.com/Instant-Video/b/ref=topnav_storetab_atv?_encoding=UTF8&node=2858778011' \
               lua/mouseover.lua \
               js/zepto.js \
               js/find-listeners.js \
               js/wait-for-ajax.js \
               js/mouseover.js
]]

function mouseover_bound_elements_and_wait(splash)
  splash:runjs([[
    window.__mouseOver();
  ]])
  for j=1,20 do
    ready = splash:runjs([[
      window.__ajaxReady
    ]])
    if ready then
      break
    end
    assert(splash:wait(0.5))
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

