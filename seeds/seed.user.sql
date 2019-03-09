BEGIN;

TRUNCATE
  "user";

INSERT INTO "user" ("id", "username", "name", "password")
VALUES
  (1, 'admin', 'Dunder Mifflin Admin', '$2a$12$lHK6LVpc15/ZROZcKU00QeiD.RyYq5dVlV/9m4kKYbGibkRc5l4Ne');

COMMIT;
