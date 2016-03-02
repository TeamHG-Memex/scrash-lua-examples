--[[
This script shows what a crawler might see if it doesn't interact
with the page at all.

python demo.py https://twitter.com/cnn lua/no-frills.lua

python demo.py http://dontsellbodies.org/ lua/no-frills.lua

python demo.py http://www.reddit.com/r/IAmA/comments/qccer/i_am_neil_degrasse_tyson_ask_me_anything/ \
               lua/no-frills.lua

python demo.py 'http://www.amazon.com/Instant-Video/b/ref=topnav_storetab_atv?_encoding=UTF8&node=2858778011' \
               lua/no-frills.lua
]]


function main(splash)
  local url = splash.args.url

  splash:autoload(splash.args.js_source)
  assert(splash:go(url))

  splash:wait(2)
  splash:stop()
  splash:set_viewport_full()

  return {
    html = splash:html(),
    png = splash:png{width=800},
    har = splash:har(),
  }
end
