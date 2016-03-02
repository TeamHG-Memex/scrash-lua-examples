function main(splash)
  local url = splash.args.url

  -- splash:autoload(splash.args.js_source)
  assert(splash:go(url))

  local ok, err = splash:wait_for_resume([[
    function main(splash) {
        setTimeout(function () {console.log("foo!"); splash.resume()}, 3000);
    }
  ]])

  splash:stop()
  splash:set_viewport_full()

  return {
    png = splash:png{width=800},
  }
end
