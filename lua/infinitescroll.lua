function scroll_to_bottom_and_wait(splash)
  splash:runjs([[
    scrollDown();
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
  local page_count = splash.args.page_count or 2

  splash:autoload(splash.args.js_source)
  assert(splash:go(url))

  for i=1,page_count do
    scroll_to_bottom_and_wait(splash)
  end

  splash:stop()
  splash:set_viewport("full")

  return {
    html = splash:html(),
    png = splash:png{width=640},
    har = splash:har(),
  }
end
