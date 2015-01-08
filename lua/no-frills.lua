--[[
This script shows what a crawler might see if it doesn't interact
with the page at all.

python demo.py https://twitter.com/cnn lua/no-frills.lua

python demo.py http://dontsellbodies.org/ lua/no-frills.lua
]]


function main(splash)
  local url = splash.args.url

  splash:autoload(splash.args.js_source)
  assert(splash:go(url))

  splash:wait(2)
  splash:stop()
  splash:set_viewport("full")

  return {
    html = splash:html(),
    png = splash:png{width=640},
    har = splash:har(),
  }
end
