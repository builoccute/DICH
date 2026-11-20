-- Word Bridge Translation — Independent Site Metrics Table (Zero User Data Storage)
-- Compatible with SQLite and PostgreSQL.
-- ONLY stores aggregate website visit count (site_metrics.total_accesses).
-- NO user accounts, NO translation text, NO documents, NO images, NO feedback, NO IP logs.

CREATE TABLE IF NOT EXISTS site_metrics (
  metric_key TEXT PRIMARY KEY,
  total_accesses INTEGER NOT NULL DEFAULT 0
);

INSERT INTO site_metrics (metric_key, total_accesses)
SELECT 'total_accesses', 0
WHERE NOT EXISTS (SELECT 1 FROM site_metrics WHERE metric_key = 'total_accesses');
