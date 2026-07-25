-- Idempotent: create ecommerce database (run against postgres default DB)
-- Usage: docker exec -i postgres psql -U postgres < deploy/init-db.sql

SELECT 'CREATE DATABASE ep'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ep')\gexec
