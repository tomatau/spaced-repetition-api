BEGIN;

TRUNCATE
  "user";

INSERT INTO "user" ('username', "name", "password")
VALUES
  ('admin', 'Tom HT', '$2a$12$lHK6LVpc15/ZROZcKU00QeiD.RyYq5dVlV/9m4kKYbGibkRc5l4Ne');

COMMIT;
