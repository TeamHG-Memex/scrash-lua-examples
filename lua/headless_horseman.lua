--[[

INFINITE SCROLL:

python demo.py https://twitter.com/cnn \
               lua/headless_horseman.lua \
               js/headless_horseman_util.js

python demo.py http://dontsellbodies.org \
               lua/headless_horseman.lua \
               js/headless_horseman_util.js

CLICK XHR:

python demo.py http://www.reddit.com/r/IAmA/comments/qccer/i_am_neil_degrasse_tyson_ask_me_anything/ \
               lua/headless_horseman.lua \
               js/headless_horseman_util.js

MOUSEOVER XHR:

python demo.py 'http://www.amazon.com/Instant-Video/b/ref=topnav_storetab_atv?_encoding=UTF8&node=2858778011' \
               lua/headless_horseman.lua \
               js/headless_horseman_util.js
]]

function main(splash)
  local url = splash.args.url

  splash:autoload(splash.args.js_source)
  splash:autoload([[
    __headless_horseman__.setDebug(true);
    __headless_horseman__.setVisual(true);
    __headless_horseman__.patchAll();
    __headless_horseman__.startOverlayWatcher();
  ]])

  -- 992px is Bootstrap's minimum "desktop" size. 744 gives the viewport
  -- a nice 4:3 aspect ratio. We may need to tweak the viewport size even
  -- higher, based on real world usage... (Don't forget to change PNG width
  -- argument below to avoid scaling.)
  splash:set_viewport('992x744')

  assert(splash:go(url))
  splash:lock_navigation()

  splash:wait_for_resume([[
    function main(splash) {
      __headless_horseman__
        .wait(3000)
        .then(__headless_horseman__.tryInfiniteScroll, 3)
        .then(__headless_horseman__.tryClickXhr, 3)
        .then(__headless_horseman__.tryMouseoverXhr, 3)
        .then(__headless_horseman__.scroll, window, 'left', 'top')
        .then(splash.resume);
    }
  ]])

  splash:stop()
  splash:set_viewport("full")

  return {
    html = splash:html(),
    png = splash:png{width=992},
    har = splash:har(),
  }
end

