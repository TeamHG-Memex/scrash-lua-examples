import base64, json, sys
import requests

SPLASH_URL = 'http://192.168.31.1:8050/execute'

lua_scripts = list()
js_scripts = list()

cmd=sys.argv.pop(0)
url=sys.argv.pop(0)

if url == 'curl':
    curl = True
    url=sys.argv.pop(0)
else:
    curl = False

for arg in sys.argv:
    i = open(arg, 'r')

    if arg[-4:] == '.lua':
        lua_scripts.append(i.read())
    elif arg[-3:] == '.js':
        js_scripts.append(i.read())

    i.close()

js_combined = '\n'.join(js_scripts)

for lua_script in lua_scripts:
    data = json.dumps({
        'url': url,
        'lua_source': lua_script,
        'js_source': js_combined
    })

    headers = {'content-type':'application/json'}

    if curl:
        body = open('body', 'w')
        body.write(data)
        body.close()

        header_args = " ".join([r"-H '%s:%s'" % (k,v) for (k,v) in headers.items()])
        curl = r"curl -d @body %s '%s'" % (header_args, SPLASH_URL)
        print("Your curl command is:\n%s" % curl)
    else:
        print("Requesting %s" % url)
        r = requests.post(SPLASH_URL, data=data, headers=headers, timeout=500)

        if r.status_code != 200:
            print("ERROR: %d\n%s" % (r.status_code, r.text))

        data = json.loads(r.text)
        png = open('out.png','wb')
        png.write(base64.b64decode(data['png']))
        png.close()
        print("Done! (wrote out.png)")
