CREATE TABLE "QuizSkillUse" (
    "sessionId" UUID NOT NULL,
    "actionId" UUID NOT NULL,
    "roundId" TEXT NOT NULL,
    "playerId" UUID NOT NULL,
    "skill" TEXT NOT NULL,
    "remaining" INTEGER NOT NULL,
    CONSTRAINT "QuizSkillUse_pkey" PRIMARY KEY ("sessionId","actionId"),
    CONSTRAINT "QuizSkillUse_remaining_check" CHECK ("remaining" >= 0),
    CONSTRAINT "QuizSkillUse_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "ItemDefinition" ("id", "name", "kind", "price", "gameId", "metadata") VALUES
  ('quiz-hint', 'Gợi ý', 'SKILL', 10, 'quiz', '{}'),
  ('quiz-fifty-fifty', '50/50', 'SKILL', 15, 'quiz', '{}'),
  ('quiz-cover', 'Che câu hỏi', 'SKILL', 20, 'quiz', '{}'),
  ('quiz-blur', 'Làm mờ đáp án', 'SKILL', 25, 'quiz', '{}')
ON CONFLICT ("id") DO NOTHING;
