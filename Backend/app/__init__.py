"""Flask application factory."""
import os
import secrets
from flask import Flask, abort, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv

load_dotenv()

cors = CORS()
bcrypt = Bcrypt()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],
    storage_uri="memory://",
)


def create_app():
    app = Flask(__name__)

    secret_key = os.environ.get('JWT_SECRET_KEY')
    if not secret_key:
        print("⚠️  WARNING: JWT_SECRET_KEY not set — using a temporary key for this session.")
        secret_key = secrets.token_hex(32)

    app.config['SECRET_KEY'] = secret_key
    app.config['DATABASE_URL'] = os.environ.get('DATABASE_URL')
    app.config['GOOGLE_CLIENT_ID'] = os.environ.get('GOOGLE_CLIENT_ID', '')

    # ── Secure cookie defaults ─────────────────────────────────────────────
    app.config['SESSION_COOKIE_SECURE'] = True
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

    allowed_origins = os.environ.get(
        'CORS_ALLOWED_ORIGINS',
        'https://dashboard.iitpkd.ac.in,http://localhost:5173,http://127.0.0.1:5173'
    ).split(',')
    cors.init_app(app, resources={
        r"/*": {
            "origins": allowed_origins,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
        }
    })
    bcrypt.init_app(app)
    limiter.init_app(app)

    @app.errorhandler(429)
    def ratelimit_handler(_e):
        return jsonify({'message': 'Too many requests. Please slow down and try again later.'}), 429

    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'logos')
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    FACILITIES_UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'facilities')
    app.config['FACILITIES_UPLOAD_FOLDER'] = FACILITIES_UPLOAD_FOLDER
    os.makedirs(FACILITIES_UPLOAD_FOLDER, exist_ok=True)

    STARTUPS_UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'startups')
    app.config['STARTUPS_UPLOAD_FOLDER'] = STARTUPS_UPLOAD_FOLDER
    os.makedirs(STARTUPS_UPLOAD_FOLDER, exist_ok=True)

    INDUSTRY_PROJECT_UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'icsr_industry_project')
    app.config['INDUSTRY_PROJECT_UPLOAD_FOLDER'] = INDUSTRY_PROJECT_UPLOAD_FOLDER
    os.makedirs(INDUSTRY_PROJECT_UPLOAD_FOLDER, exist_ok=True)

    SAFE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}

    def _validate_upload_filename(filename):
        ext = os.path.splitext(filename)[1].lower()
        if ext not in SAFE_EXTENSIONS:
            abort(404)

    @app.route('/uploads/logos/<filename>')
    def serve_logo(filename):
        _validate_upload_filename(filename)
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    @app.route('/uploads/facilities/<filename>')
    def serve_facility_image(filename):
        _validate_upload_filename(filename)
        return send_from_directory(app.config['FACILITIES_UPLOAD_FOLDER'], filename)

    @app.route('/uploads/startups/<filename>')
    def serve_startup_logo(filename):
        _validate_upload_filename(filename)
        return send_from_directory(app.config['STARTUPS_UPLOAD_FOLDER'], filename)

    @app.route('/uploads/industry/<filename>')
    def serve_industry_logo(filename):
        _validate_upload_filename(filename)
        return send_from_directory(app.config['INDUSTRY_PROJECT_UPLOAD_FOLDER'], filename)

    from . import (
        auth, dashboard, upload,
        academic_stats, administrative_stats, grievance_stats,
        ewd_stats, iar_stats, education_stats, placement_stats,
        academic_module, research_module, innovation_module,
        industry_connect_module, outreach_extension_module, nirf_stats, export_db,
        mou_partners, last_updated, iptif_facilities, startup_portfolio,
        icsr_consultancy, icsr_sponsored, feedback,
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
    app.register_blueprint(startup_portfolio.startup_portfolio_bp,         url_prefix='/api/startup-portfolio')
    app.register_blueprint(icsr_consultancy.icsr_consultancy_bp,           url_prefix='/api/icsr-consultancy')
    app.register_blueprint(icsr_sponsored.icsr_sponsored_bp,               url_prefix='/api/icsr-sponsored')
    app.register_blueprint(last_updated.last_updated_bp,                   url_prefix='/api/last-updated')
    app.register_blueprint(feedback.feedback_bp,                           url_prefix='/api/feedback')

    @app.route('/health')
    def health_check():
        return jsonify({'status': 'running'}), 200

    @app.after_request
    def add_security_headers(response):
        # ── Cache ──
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'

        # ── HSTS — force HTTPS for 1 year ──
        response.headers['Strict-Transport-Security'] = (
            'max-age=31536000; includeSubDomains'
        )

        # ── Prevent MIME-sniffing ──
        response.headers['X-Content-Type-Options'] = 'nosniff'

        # ── Clickjacking protection ──
        response.headers['X-Frame-Options'] = 'DENY'

        # ── Referrer policy ──
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        # ── Disable legacy XSS filter (modern CSP is the replacement) ──
        response.headers['X-XSS-Protection'] = '0'

        # ── Restrict browser features ──
        response.headers['Permissions-Policy'] = (
            'camera=(), microphone=(), geolocation=()'
        )

        # ── Content Security Policy ──
        frontend_origin = os.environ.get(
            'FRONTEND_ORIGIN', 'https://dashboard.iitpkd.ac.in'
        )
        csp_directives = '; '.join([
            "default-src 'self'",
            "script-src 'self' https://accounts.google.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
            f"img-src 'self' data: blob: {frontend_origin}",
            "font-src 'self' https://fonts.gstatic.com",
            f"connect-src 'self' {frontend_origin} https://accounts.google.com",
            "frame-src https://accounts.google.com https://maps.google.com https://www.google.com",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ])
        response.headers['Content-Security-Policy'] = csp_directives

        # ── Secure cookie attributes (retrofit onto any Set-Cookie headers) ──
        if 'Set-Cookie' in response.headers:
            cookies = response.headers.getlist('Set-Cookie')
            response.headers.pop('Set-Cookie')
            for cookie in cookies:
                if 'Secure' not in cookie:
                    cookie += '; Secure'
                if 'SameSite' not in cookie:
                    cookie += '; SameSite=Lax'
                if 'HttpOnly' not in cookie:
                    cookie += '; HttpOnly'
                response.headers.add('Set-Cookie', cookie)

        return response

    return app