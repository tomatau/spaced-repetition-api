BEGIN;

TRUNCATE
  "word",
  "list",
  "user";

INSERT INTO "user" ("id", "username", "name", "password")
VALUES
  (
    1,
    'admin',
    'Dunder Mifflin Admin',
    -- password = "pass"
    '$2a$10$fCWkaGbt7ZErxaxclioLteLUgg4Q3Rp09WW0s/wSLxDKYsaGYUpjG'
  );

INSERT INTO "list" ("id", "name", "user_id")
VALUES
  (1, 'l337$p34k', 1),
  (2, 'French', 1);

INSERT INTO "word" ("id", "list_id", "original", "translation", "next")
VALUES
  (1, 1, '1337', 'leet', 2),
  (2, 1, 'h3110', 'hello', 3),
  (3, 1, 'c001', 'cool', 4),
  (4, 1, '7r4n$l473', 'translate', 5),
  (5, 1, 'w3rd', 'word', 6),
  (6, 1, '4m4z1n5', 'amazing', 7),
  (7, 1, 'd0g', 'dog', 8),
  (8, 1, 'c47', 'cat', null),
  (9, 2, 'entraine toi', 'practice', 10),
  (10, 2, 'bonjour', 'hello', 11),
  (11, 2, 'maison', 'house', 12),
  (12, 2, 'développeur', 'developer', 13),
  (13, 2, 'traduire', 'translate', 14),
  (14, 2, 'incroyable', 'amazing', 15),
  (15, 2, 'chien', 'dog', 16),
  (16, 2, 'chat', 'cat', null);

UPDATE "list" SET 'head' = 1 WHERE 'id' = 1;
UPDATE "list" SET 'head' = 9 WHERE 'id' = 2;

-- because we explicitly set the id fields
-- update the sequencer for future automatic id setting
SELECT setval('word_id_seq', (SELECT MAX(id) from "word"));
SELECT setval('list_id_seq', (SELECT MAX(id) from "list"));
SELECT setval('user_id_seq', (SELECT MAX(id) from "user"));

COMMIT;
