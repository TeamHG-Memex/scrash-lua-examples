--[[
python demo.py http://www.reddit.com/r/IAmA/comments/qccer/i_am_neil_degrasse_tyson_ask_me_anything/ \
               lua/ajax-click.lua \
               js/headless_horseman_util.js
]]

function main(splash)
  local url = splash.args.url
  local click_count = splash.args.click_count or 10

  splash:autoload(splash.args.js_source)
  splash:autoload([[
    __headless_horseman__.setDebug(true);
    __headless_horseman__.setVisual(true);
    __headless_horseman__.patchAll();
  ]])

  assert(splash:go(url))
  splash:lock_navigation()

  for i=1,click_count do
    splash:wait_for_resume([[
      function main(splash) {
        __headless_horseman__.whenAll(
          __headless_horseman__.whenXhrFinished(),
          __headless_horseman__.clickXhrElement()
        ).then(splash.resume);
      }
    ]])
  end

  splash:wait_for_resume([[
    function main(splash) {
      __headless_horseman__.scroll(window, 0, 'top').then(splash.resume);
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

