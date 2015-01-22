--[[
python demo.py https://twitter.com/cnn lua/test.lua js/test.js
]]

function main(splash)
  local url = splash.args.url

  splash:autoload(splash.args.js_source)
  assert(splash:go(url))

  local async_result, err = splash:runjs_async([[
    setTimeout(function () {
      lua_resume("Good things come to those who wait.");
    }, 2000);
  ]])
  print(async_result, err)

  local async_result, err = splash:runjs_async([[
    setTimeout(function () {
      lua_error("But sometimes bad things come to those who wait.");
    }, 2000);
  ]])
  print(async_result, err)

  local async_result, err = splash:runjs_async([[
    setTimeout(function () {
      lua_resume(["Return","multiple","arguments","in","a","list!"]);
    }, 2000);
  ]])
  print(async_result, err)

  local async_result, err = splash:runjs_async([[
    setTimeout(function () {
      lua_resume("Don't wait too long or you might get interr-");
    }, 2000);
  ]], 1)
  print(async_result, err)

  splash:stop()
  splash:set_viewport("full")

  return {
    png = splash:png{width=640},
  }
end
