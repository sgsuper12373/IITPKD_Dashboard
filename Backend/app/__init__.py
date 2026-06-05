"""Flask application factory."""
import os
import secrets
from flask import Flask, request, send_from_directory
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from dotenv import load_dotenv

load_dotenv()

cors = CORS()
bcrypt = Bcrypt()


def create_app():
    app = Flask(__name__)

    secret_key = os.environ.get('JWT_SECRET_KEY')
    if not secret_key:
        print("⚠️  WARNING: JWT_SECRET_KEY not set — using a temporary key for this session.")
        secret_key = secrets.token_hex(32)

    app.config['SECRET_KEY'] = secret_key
    app.config['DATABASE_URL'] = os.environ.get('DATABASE_URL')
    app.config['GOOGLE_CLIENT_ID'] = os.environ.get('GOOGLE_CLIENT_ID', '')

    cors.init_app(app, resources={
        r"/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
        }
    })
    bcrypt.init_app(app)

    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'logos')
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    FACILITIES_UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'facilities')
    app.config['FACILITIES_UPLOAD_FOLDER'] = FACILITIES_UPLOAD_FOLDER
    os.makedirs(FACILITIES_UPLOAD_FOLDER, exist_ok=True)

    @app.route('/uploads/logos/<path:filename>')
    def serve_logo(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    @app.route('/uploads/facilities/<path:filename>')
    def serve_facility_image(filename):
        return send_from_directory(app.config['FACILITIES_UPLOAD_FOLDER'], filename)

    from . import (
        auth, dashboard, upload,
        academic_stats, administrative_stats, grievance_stats,
        ewd_stats, iar_stats, education_stats, placement_stats,
        academic_module, research_module, innovation_module,
        industry_connect_module, outreach_extension_module, nirf_stats, export_db,
        mou_partners, last_updated, iptif_facilities,
    )

    app.register_blueprint(auth.auth_bp,                              url_prefix='/auth')
    app.register_blueprint(dashboard.dashboard_bp,                    url_prefix='/api')
    app.register_blueprint(upload.upload_bp,                          url_prefix='/api')
    app.register_blueprint(export_db.export_db_bp,                    url_prefix='/api/export')
    app.register_blueprint(nirf_stats.nirf_bp,                        url_prefix='/api/nirf')
    app.register_blueprint(academic_stats.academic_bp,                 url_prefix='/api/academic')
    app.register_blueprint(administrative_stats.administrative_bp,     url_prefix='/api/administrative')
    app.register_blueprint(grievance_stats.grievance_bp,               url_prefix='/api/grievance')
    app.register_blueprint(ewd_stats.ewd_bp,                           url_prefix='/api/ewd')
    app.register_blueprint(iar_stats.iar_bp,                           url_prefix='/api/iar')
    app.register_blueprint(education_stats.education_bp,               url_prefix='/api/education')
    app.register_blueprint(placement_stats.placement_bp,               url_prefix='/api/placement')
    app.register_blueprint(academic_module.academic_module_bp,         url_prefix='/api/academic-module')
    app.register_blueprint(research_module.research_bp,                url_prefix='/api/research-module')
    app.register_blueprint(innovation_module.innovation_bp,            url_prefix='/api/innovation')
    app.register_blueprint(industry_connect_module.industry_connect_bp, url_prefix='/api/industry-connect')
    app.register_blueprint(outreach_extension_module.outreach_extension_bp, url_prefix='/api/outreach-extension')
    app.register_blueprint(mou_partners.mou_partners_bp,                   url_prefix='/api/mou-partners')
    app.register_blueprint(iptif_facilities.iptif_facilities_bp,           url_prefix='/api/iptif-facilities')
    app.register_blueprint(last_updated.last_updated_bp,                   url_prefix='/api/last-updated')

    @app.route('/health')
    def health_check():
        return "Server is running!"

    @app.after_request
    def add_cache_headers(response):
        """
        Add Cache-Control to read-only endpoints so the browser can skip
        round-trips on repeated calls within the same session.

        filter-options  → 5 min  (these almost never change between requests)
        all other GETs  → 30 s   (light freshness buffer, cuts duplicate calls)
        non-GET         → no-store (uploads, auth — must always hit the server)
        """
        if request.method != 'GET':
            response.headers['Cache-Control'] = 'no-store'
            return response

        path = request.path
        if 'filter-options' in path or 'filter_options' in path:
            # Authenticated responses: private so proxies don't share across users
            response.headers['Cache-Control'] = 'private, max-age=300'
        else:
            response.headers['Cache-Control'] = 'private, max-age=30'

        return response

    return app