--[[
python demo.py https://twitter.com/cnn \
               lua/infinitescroll.lua \
               js/zepto.js \
               js/wait-for-ajax.js \
               js/close-overlay.js \
               js/scroll.js \
               js/infinitescroll.js

python demo.py http://dontsellbodies.org/ \
               lua/infinitescroll.lua \
               js/zepto.js \
               js/wait-for-ajax.js \
               js/close-overlay.js \
               js/scroll.js \
               js/infinitescroll.js
]]

function main(splash)
  local url = splash.args.url
  local page_count = splash.args.page_count or 3

  splash:autoload(splash.args.js_source)
  assert(splash:go(url))
  splash:runjs_async("Zepto(function () {lua_resume()});")

  for i=1,page_count do
    print(splash:runjs_async("window.__splash__.scrollBottomXhr(lua_resume);"))
  end

  splash:runjs("window.__splash__.scrollTop();")
  splash:stop()
  splash:set_viewport("full")

  return {
    html = splash:html(),
    png = splash:png{width=640},
    har = splash:har(),
  }
end
