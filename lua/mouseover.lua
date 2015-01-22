--[[
python demo.py 'http://www.amazon.com/Instant-Video/b/ref=topnav_storetab_atv?_encoding=UTF8&node=2858778011' \
               lua/mouseover.lua \
               js/zepto.js \
               js/find-listeners.js \
               js/wait-for-ajax.js \
               js/mouseover.js
]]

function main(splash)
  local url = splash.args.url

  splash:autoload(splash.args.js_source)
  assert(splash:go(url))

  splash:runjs_async("Zepto(function () {lua_resume()});")
  splash:runjs_async("window.__mouseOver(lua_resume);")

  splash:stop()
  splash:set_viewport("full")

  return {
    html = splash:html(),
    png = splash:png{width=640},
    har = splash:har(),
  }
end

