"""CRUD API for the Quick Glance widget layout.

GET  /                 public — returns the ordered list of widgets
POST /                 role_id 3 — add a widget
PUT  /<id>             role_id 3 — update a widget
DELETE /<id>           role_id 3 — remove a widget
PUT  /reorder          role_id 3 — batch-update sort_order
"""
import json

from flask import Blueprint, jsonify, request

from . import limiter
from .auth import token_optional, token_required, _require_admin
from .db import get_db_connection, release_db_connection

glance_widgets_bp = Blueprint('glance_widgets', __name__)

ALLOWED_TYPES = {'gauge', 'kpi', 'combo', 'donut', 'funnel', 'ranked', 'progress', 'radar'}
ALLOWED_SIZES = {'sm', 'md', 'lg'}
TITLE_MAX = 120

_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS glance_widgets (
    id          SERIAL PRIMARY KEY,
    widget_type VARCHAR(20)  NOT NULL,
    data_key    VARCHAR(60)  NOT NULL,
    size        VARCHAR(4)   NOT NULL DEFAULT 'md',
    sort_order  INT          NOT NULL DEFAULT 0,
    title       VARCHAR(120) NOT NULL DEFAULT '',
    config      JSONB        NOT NULL DEFAULT '{}',
    created_by  INT          REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
"""

_SEED_SQL = """
INSERT INTO glance_widgets (widget_type, data_key, size, sort_order, title) VALUES
  ('gauge','placementRate','md',1,'Placement rate'),
  ('gauge','nirfRank','md',2,'NIRF engineering rank'),
  ('kpi','students','sm',3,'Students on roll'),
  ('kpi','faculty','sm',4,'Faculty strength'),
  ('kpi','publications','sm',5,'Publications'),
  ('kpi','patents','sm',6,'Patents filed'),
  ('kpi','funding','sm',7,'Sponsored funding'),
  ('kpi','startups','sm',8,'Startups incubated'),
  ('combo','funding','lg',9,'Cross-section analysis'),
  ('radar','pillarIndex','md',10,'Pillar index'),
  ('funnel','placementFunnel','md',11,'Placement funnel'),
  ('donut','alumniOutcomes','md',12,'Alumni outcomes'),
  ('progress','femaleShare','md',13,'Female share'),
  ('ranked','pubByDept','lg',14,'Publications by department')
ON CONFLICT DO NOTHING;
"""


def _ensure_table(cur):
    cur.execute("SELECT to_regclass('public.glance_widgets')")
    if cur.fetchone()['to_regclass'] is None:
        cur.execute(_CREATE_TABLE_SQL)
        cur.execute(_SEED_SQL)


def _validate_widget(body):
    errors = []
    wtype = body.get('widget_type', '')
    if wtype not in ALLOWED_TYPES:
        errors.append(f'widget_type must be one of {sorted(ALLOWED_TYPES)}')
    data_key = body.get('data_key', '')
    if not data_key or not isinstance(data_key, str) or len(data_key) > 60:
        errors.append('data_key is required (max 60 chars)')
    size = body.get('size', 'md')
    if size not in ALLOWED_SIZES:
        errors.append(f'size must be one of {sorted(ALLOWED_SIZES)}')
    title = body.get('title', '')
    if not isinstance(title, str) or len(title) > TITLE_MAX:
        errors.append(f'title must be a string (max {TITLE_MAX} chars)')
    config = body.get('config', {})
    if not isinstance(config, dict):
        errors.append('config must be a JSON object')
    return errors


@glance_widgets_bp.route('/', methods=['GET'])
@token_optional
def list_widgets(current_user_id=None):
    conn = get_db_connection()
    if not conn:
        return jsonify([]), 200
    try:
        cur = conn.cursor()
        _ensure_table(cur)
        conn.commit()
        cur.execute(
            'SELECT id, widget_type, data_key, size, sort_order, title, config '
            'FROM glance_widgets ORDER BY sort_order, id'
        )
        rows = cur.fetchall()
        return jsonify([dict(r) for r in rows]), 200
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass
        return jsonify([]), 200
    finally:
        release_db_connection(conn)


@glance_widgets_bp.route('/', methods=['POST'])
@token_required
@limiter.limit("30 per minute")
def add_widget(current_user_id):
    user_id = current_user_id
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database unavailable'}), 503
    try:
        cur = conn.cursor()
        if not _require_admin(cur, user_id):
            return jsonify({'message': 'Forbidden'}), 403

        _ensure_table(cur)

        body = request.get_json(silent=True) or {}
        errors = _validate_widget(body)
        if errors:
            return jsonify({'message': 'Validation failed', 'errors': errors}), 400

        cur.execute('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM glance_widgets')
        next_order = cur.fetchone()['next_order']

        cur.execute(
            'INSERT INTO glance_widgets (widget_type, data_key, size, sort_order, title, config, created_by) '
            'VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id, widget_type, data_key, size, sort_order, title, config',
            (
                body['widget_type'],
                body['data_key'],
                body.get('size', 'md'),
                body.get('sort_order', next_order),
                body.get('title', ''),
                json.dumps(body.get('config', {})),
                user_id,
            ),
        )
        row = dict(cur.fetchone())
        conn.commit()
        return jsonify(row), 201
    except Exception:
        conn.rollback()
        raise
    finally:
        release_db_connection(conn)


@glance_widgets_bp.route('/<int:widget_id>', methods=['PUT'])
@token_required
@limiter.limit("30 per minute")
def update_widget(widget_id, current_user_id):
    user_id = current_user_id
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database unavailable'}), 503
    try:
        cur = conn.cursor()
        if not _require_admin(cur, user_id):
            return jsonify({'message': 'Forbidden'}), 403

        body = request.get_json(silent=True) or {}

        sets = []
        params = []
        if 'widget_type' in body:
            if body['widget_type'] not in ALLOWED_TYPES:
                return jsonify({'message': f'widget_type must be one of {sorted(ALLOWED_TYPES)}'}), 400
            sets.append('widget_type = %s')
            params.append(body['widget_type'])
        if 'data_key' in body:
            dk = body['data_key']
            if not dk or not isinstance(dk, str) or len(dk) > 60:
                return jsonify({'message': 'data_key is required (max 60 chars)'}), 400
            sets.append('data_key = %s')
            params.append(dk)
        if 'size' in body:
            if body['size'] not in ALLOWED_SIZES:
                return jsonify({'message': f'size must be one of {sorted(ALLOWED_SIZES)}'}), 400
            sets.append('size = %s')
            params.append(body['size'])
        if 'sort_order' in body:
            sets.append('sort_order = %s')
            params.append(int(body['sort_order']))
        if 'title' in body:
            t = body['title']
            if not isinstance(t, str) or len(t) > TITLE_MAX:
                return jsonify({'message': f'title max {TITLE_MAX} chars'}), 400
            sets.append('title = %s')
            params.append(t)
        if 'config' in body:
            if not isinstance(body['config'], dict):
                return jsonify({'message': 'config must be a JSON object'}), 400
            sets.append('config = %s')
            params.append(json.dumps(body['config']))

        if not sets:
            return jsonify({'message': 'No fields to update'}), 400

        sets.append('updated_at = now()')
        params.append(widget_id)
        cur.execute(
            f'UPDATE glance_widgets SET {", ".join(sets)} WHERE id = %s '
            'RETURNING id, widget_type, data_key, size, sort_order, title, config',
            params,
        )
        row = cur.fetchone()
        if not row:
            return jsonify({'message': 'Widget not found'}), 404
        conn.commit()
        return jsonify(dict(row)), 200
    except Exception:
        conn.rollback()
        raise
    finally:
        release_db_connection(conn)


@glance_widgets_bp.route('/<int:widget_id>', methods=['DELETE'])
@token_required
@limiter.limit("30 per minute")
def delete_widget(widget_id, current_user_id):
    user_id = current_user_id
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database unavailable'}), 503
    try:
        cur = conn.cursor()
        if not _require_admin(cur, user_id):
            return jsonify({'message': 'Forbidden'}), 403

        cur.execute('DELETE FROM glance_widgets WHERE id = %s RETURNING id', (widget_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({'message': 'Widget not found'}), 404
        conn.commit()
        return jsonify({'message': 'Deleted', 'id': row['id']}), 200
    except Exception:
        conn.rollback()
        raise
    finally:
        release_db_connection(conn)


@glance_widgets_bp.route('/reorder', methods=['PUT'])
@token_required
@limiter.limit("10 per minute")
def reorder_widgets(current_user_id):
    user_id = current_user_id
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database unavailable'}), 503
    try:
        cur = conn.cursor()
        if not _require_admin(cur, user_id):
            return jsonify({'message': 'Forbidden'}), 403

        items = request.get_json(silent=True)
        if not isinstance(items, list) or not items:
            return jsonify({'message': 'Expected a JSON array of {id, sort_order}'}), 400

        for item in items:
            wid = item.get('id')
            order = item.get('sort_order')
            if not isinstance(wid, int) or not isinstance(order, int):
                return jsonify({'message': 'Each item needs integer id and sort_order'}), 400
            cur.execute(
                'UPDATE glance_widgets SET sort_order = %s, updated_at = now() WHERE id = %s',
                (order, wid),
            )

        conn.commit()
        return jsonify({'message': 'Reordered'}), 200
    except Exception:
        conn.rollback()
        raise
    finally:
        release_db_connection(conn)
