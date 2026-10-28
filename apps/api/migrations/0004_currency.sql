ALTER TABLE households ADD COLUMN currency varchar(3) NOT NULL DEFAULT 'EUR';
INSERT INTO settings(id,data) VALUES ('catalogueCurrency',JSON_QUOTE('EUR'));
