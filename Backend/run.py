import os
from werkzeug.serving import WSGIRequestHandler
from app import create_app

app = create_app()


class _QuietRequestHandler(WSGIRequestHandler):
    """
    Suppresses the dev server's own "Server: Werkzeug/x.x Python/x.x" header.

    That header is written by BaseHTTPRequestHandler.send_response() at the
    socket layer, before the WSGI app's own response headers are ever
    considered — so overriding response.headers['Server'] in Flask
    (app/__init__.py's add_security_headers) has no effect here; this dev
    server is the only place that string actually comes from. Confirmed via
    a live curl against this exact process: the unmodified handler leaks the
    precise Python and Werkzeug versions, handy for targeting known CVEs
    against either. Production doesn't run this file at all (gunicorn, per
    gunicorn.conf.py/Procfile) — this only covers local development.
    """
    def version_string(self):
        return 'IIT-Palakkad-Dashboard'


if __name__ == '__main__':
    app.run(
        debug=os.environ.get('FLASK_DEBUG', '0') == '1',
        port=5000,
        request_handler=_QuietRequestHandler,
    )
