--[[
python demo.py https://twitter.com/cnn \
               lua/infinitescroll.lua \
               js/headless_horseman_util.js

python demo.py http://dontsellbodies.org \
               lua/infinitescroll.lua \
               js/headless_horseman_util.js
]]

function main(splash)
  local url = splash.args.url
  local page_count = splash.args.page_count or 3

  splash:autoload(splash.args.js_source)

  assert(splash:go(url))

  for i=1,page_count do
    splash:runjs_async([[
      __headless_horseman__.setDebug(true);
      __headless_horseman__.setVisual(true);
      __headless_horseman__.startOverlayWatcher();

      __headless_horseman__.whenAll(
        __headless_horseman__.whenXhrFinished(),
        __headless_horseman__.scroll(window, 'left', 'bottom')
      ).then(luaResume);
    ]])
  end

  splash:runjs_async([[
    __headless_horseman__.scroll(window, 'left', 'top').then(luaResume);
  ]])

  splash:stop()
  splash:set_viewport("full")

  return {
    html = splash:html(),
    png = splash:png{width=800},
    har = splash:har(),
  }
end
