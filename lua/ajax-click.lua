--[[
python demo.py http://www.reddit.com/r/IAmA/comments/qccer/i_am_neil_degrasse_tyson_ask_me_anything/ \
               lua/ajax-click.lua \
               js/zepto.js \
               js/wait-for-ajax.js \
               js/close-overlay.js \
               js/scroll.js \
               js/ajax-click.js
]]

function click_and_wait(splash)
  splash:runjs([[
    __ajaxClick();
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
  local click_count = splash.args.click_count or 3

  ok, reason = splash:autoload(splash.args.js_source)
  assert(splash:go(url))

  for i=1,click_count do
    click_and_wait(splash)
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

