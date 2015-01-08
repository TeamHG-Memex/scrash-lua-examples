import base64, json, sys
import requests

lua_scripts = list()
js_scripts = list()

cmd=sys.argv.pop(0)
url=sys.argv.pop(0)

for arg in sys.argv:
    i = open(arg, 'r')

    if arg[-4:] == '.lua':
        lua_scripts.append(i.read())
    elif arg[-3:] == '.js':
        js_scripts.append(i.read())

    i.close()

js_combined = '\n'.join(js_scripts)

for lua_script in lua_scripts:
    body = json.dumps({'url':url,'lua_source':lua_script,'js_source':js_combined})
    print("Requesting %s" % url)
    r = requests.post('http://192.168.31.1:8050/execute', data=body, headers={'content-type':'application/json'}, timeout=500)

    if r.status_code != 200:
        print("ERROR: %d\n%s" % (r.status_code, r.text))

    data = json.loads(r.text)
    png = open('out.png','wb')
    png.write(base64.b64decode(data['png']))
    png.close()
    print("Done! (wrote out.png)")
