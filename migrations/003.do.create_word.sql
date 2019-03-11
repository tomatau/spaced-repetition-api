CREATE TABLE "word" (
  "id" SERIAL PRIMARY KEY,
  "original" TEXT NOT NULL,
  "translation" TEXT NOT NULL,
  "memory_value" SMALLINT DEFAULT 1,
  "list_id" INTEGER REFERENCES "list"(id)
    ON DELETE CASCADE NOT NULL,
  "next" INTEGER REFERENCES "word"(id)
    ON DELETE SET NULL
);

ALTER TABLE "list"
  ADD COLUMN "head" INTEGER REFERENCES "word"(id)
    ON DELETE SET NULL;
