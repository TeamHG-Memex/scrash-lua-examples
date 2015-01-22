--[[
python demo.py http://www.reddit.com/r/IAmA/comments/qccer/i_am_neil_degrasse_tyson_ask_me_anything/ \
               lua/ajax-click.lua \
               js/zepto.js \
               js/wait-for-ajax.js \
               js/close-overlay.js \
               js/scroll.js \
               js/ajax-click.js
]]

function main(splash)
  local url = splash.args.url
  local click_count = splash.args.click_count or 3

  ok, reason = splash:autoload(splash.args.js_source)
  assert(splash:go(url))
  splash:runjs_async("Zepto(function () {lua_resume()});")

  for i=1,click_count do
    splash:runjs_async("__ajaxClick(lua_resume);")
  end

  splash:runjs([[
    window.__scrollTop();
  ]])
  splash:stop()
  splash:set_viewport("full")

  return {
    html = splash:html(),
    png = splash:png{width=640},
    har = splash:har(),
  }
end

