-- Admin-editable Quick Glance widget layout
-- Each row is one widget on the Quick Glance page.

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
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_widget_type CHECK (widget_type IN ('gauge','kpi','combo','donut','funnel','ranked','progress','radar')),
    CONSTRAINT chk_size CHECK (size IN ('sm','md','lg'))
);

CREATE INDEX idx_glance_widgets_order ON glance_widgets (sort_order);

-- Seed the current hard-coded layout so the page looks identical on day one.
INSERT INTO glance_widgets (widget_type, data_key, size, sort_order, title) VALUES
    ('gauge',    'placementRate',  'md', 1,  'Placement rate'),
    ('gauge',    'nirfRank',       'md', 2,  'NIRF engineering rank'),
    ('kpi',      'students',       'sm', 3,  'Students on roll'),
    ('kpi',      'faculty',        'sm', 4,  'Faculty strength'),
    ('kpi',      'publications',   'sm', 5,  'Publications'),
    ('kpi',      'patents',        'sm', 6,  'Patents filed'),
    ('kpi',      'funding',        'sm', 7,  'Sponsored funding'),
    ('kpi',      'startups',       'sm', 8,  'Startups incubated'),
    ('combo',    'funding',        'lg', 9,  'Cross-section analysis'),
    ('radar',    'pillarIndex',    'md', 10, 'Pillar index'),
    ('funnel',   'placementFunnel','md', 11, 'Placement funnel'),
    ('donut',    'alumniOutcomes', 'md', 12, 'Alumni outcomes'),
    ('progress', 'femaleShare',    'md', 13, 'Female share'),
    ('ranked',   'pubByDept',      'lg', 14, 'Publications by department');
