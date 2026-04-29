"""Flask application factory."""
import os
import secrets
from flask import Flask
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

    cors.init_app(app, resources={
        r"/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
        }
    })
    bcrypt.init_app(app)

    from . import (
        auth, dashboard, upload,
        academic_stats, administrative_stats, grievance_stats,
        ewd_stats, iar_stats, education_stats, placement_stats,
        academic_module, research_module, innovation_module,
        industry_connect_module, outreach_extension_module, nirf_stats, export_db,

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

    @app.route('/health')
    def health_check():
        return "Server is running!"

    return app