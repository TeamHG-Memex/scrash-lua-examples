from os.path import join, dirname, realpath
import json
import unittest

import requests
import lxml.html


class LuaDirectivesTestCase(unittest.TestCase):

    SPLASH_BASE_HREF = 'http://localhost:8050'
    BASE_HREF = 'http://localhost:5000'
    JS_DIR = realpath(join(dirname(__file__), '../js'))
    LUA_DIR = realpath(join(dirname(__file__), '../lua'))

    def _test_click_makes_ajax(self):
        dom = self._load_dom('/click', 'ajax-click.lua', ['wait-for-ajax.js'])
        self.assert_xpath(dom, '//p[contains(., "Clicked!")]')
        self.assert_xpath(dom, '//p[@data-ajax-intercepted]')

    def _test_infinite_scroll_makes_ajax(self):
        dom = self._load_dom('/infinitescroll', 'infinitescroll.lua',
                             ['wait-for-ajax.js'])
        for page in xrange(2, 7):
            self.assert_xpath(dom, '//div[contains(., "Item from page %d")]' %
                              page)

    def _test_delegated_mouseover_makes_ajax(self):
        dom = self._load_dom('/mouseover-delegated', 'mouseover.lua',
                             ['wait-for-ajax.js', 'find-listeners.js'])
        xpath = '//span[@data-loaded and @data-ajax-intercepted]'
        self.assertEqual(len(dom.xpath(xpath)), 3)

    def test_tabs_make_ajax(self):
        dom = self._load_dom('/tabs', 'tabs.lua',
                             ['wait-for-ajax.js', 'find-listeners.js'])
        xpath = ('//div[starts-with(@id, "tab-") and '
                 'contains(., "content tab-")]')
        self.assertEqual(len(dom.xpath(xpath)), 3)
        xpath = '//div[@data-ajax-intercepted]'
        self.assertEqual(len(dom.xpath(xpath)), 3)
        xpath = '//a[@id="external-site" and @data-clicked="true"]'
        self.assert_xpath(dom, xpath)

    def assert_xpath(self, dom, xpath):
        self.assertGreater(len(dom.xpath(xpath)), 0)

    def _load_dom(self, uri, lua_file, js_files):
        response = self._splash_request(uri, lua_file, js_files)
        html = json.loads(response.text)['html']
        return lxml.html.document_fromstring(html)

    def _splash_request(self, uri, lua_file, js_files):
        splash_url = self.SPLASH_BASE_HREF + '/execute'
        url = self.BASE_HREF + uri
        js_sources = []
        if js_files:
            for js_file in js_files:
                js_sources.append(open(join(self.JS_DIR, js_file)).read())
        data = {
            'url': url,
            'lua_source': open(join(self.LUA_DIR, lua_file)).read(),
            'js_source': '\n'.join(js_sources),
        }
        headers = {
            'Content-Type': 'application/json'
        }
        return requests.post(splash_url, json.dumps(data), headers=headers)
