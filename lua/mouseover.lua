--[[
python demo.py 'http://www.amazon.com/Instant-Video/b/ref=topnav_storetab_atv?_encoding=UTF8&node=2858778011' \
               lua/mouseover.lua \
               js/headless_horseman_util.js
]]

function main(splash)
  local url = splash.args.url

  splash:autoload(splash.args.js_source)
  splash:autoload([[
    __headless_horseman__.setDebug(true);
    __headless_horseman__.setVisual(true);
    __headless_horseman__.patchAll();
  ]])

  assert(splash:go(url))
  splash:lock_navigation()

  splash:wait_for_resume([[
    function main(splash) {
      __headless_horseman__.whenAll(
        __headless_horseman__.whenXhrFinished(2500, 5000),
        __headless_horseman__.mouseoverXhrElement()
      ).then(splash.resume);
    }
  ]])

  splash:stop()
  splash:set_viewport_full()

  return {
    html = splash:html(),
    png = splash:png{width=800},
    har = splash:har(),
  }
end

