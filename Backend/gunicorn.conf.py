"""
Gunicorn configuration for production.

Run from Backend/:
    gunicorn -c gunicorn.conf.py run:app
"""
import multiprocessing
import os

bind = f"0.0.0.0:{os.environ.get('PORT', '5000')}"
workers = int(os.environ.get('GUNICORN_WORKERS', min(multiprocessing.cpu_count() * 2 + 1, 9)))
worker_class = 'sync'
timeout = int(os.environ.get('GUNICORN_TIMEOUT', '60'))
keepalive = 5

accesslog = '-'
errorlog = '-'
loglevel = os.environ.get('GUNICORN_LOG_LEVEL', 'info')

# Deliberately NOT preload_app = True: app/db.py opens a psycopg2 connection
# pool at import time. Preloading would create that pool once in the master
# process before forking, and every worker would inherit the same open DB
# sockets — a well-known way to corrupt connections across forked workers.
# Each worker importing the app fresh after it forks (gunicorn's default)
# gives every worker its own pool instead.
