ALTER TABLE "GameSession" ALTER COLUMN "packVersionId" DROP NOT NULL;
ALTER TABLE "GameSession" ADD COLUMN "selectionSnapshot" JSONB;

CREATE TABLE "QuizQuestionHistory" (
    "hostPlayerId" UUID NOT NULL,
    "questionKey" VARCHAR(64) NOT NULL,
    "askedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuizQuestionHistory_pkey" PRIMARY KEY ("hostPlayerId", "questionKey"),
    CONSTRAINT "QuizQuestionHistory_hostPlayerId_fkey" FOREIGN KEY ("hostPlayerId")
        REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
