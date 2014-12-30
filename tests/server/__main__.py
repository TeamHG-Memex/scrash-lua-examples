import time
from os.path import join, dirname, realpath

from flask import Flask, render_template, send_from_directory


app = Flask(__name__)
app.debug = True
app.config['JS_STATIC_PATH'] = realpath(join(dirname(__file__), '../../js'))


@app.route('/js/<path:filename>')
def custom_static(filename):
    return send_from_directory(app.config['JS_STATIC_PATH'], filename)


@app.route('/long-ajax')
def long_ajax():
    time.sleep(1)
    return 'OK'


@app.route('/click')
def click():
    return render_template('click.html')


@app.route('/client-click')
def client_click():
    return render_template('client-click.html')


@app.route('/infinitescroll')
def infinitescroll():
    return render_template('infinitescroll.html')


@app.route('/infinitescroll/page/<page>')
def infinitescroll_page(page):
    time.sleep(1)
    return render_template('infinitescroll-page.html', page=page)


@app.route('/mouseover')
def mouseover():
    return render_template('mouseover.html')


@app.route('/mouseover-delegated')
def mouseover_delegated():
    return render_template('mouseover-delegated.html')


@app.route('/tabs')
def tabs():
    return render_template('tabs.html')


@app.route('/tabs/<tab>')
def tabs_tab(tab):
    time.sleep(1)
    return ('%s content ' % tab) * 100


@app.route('/tabs/external-site')
def tabs_external_site():
    return 'External site'


if __name__ == '__main__':
    app.run()
