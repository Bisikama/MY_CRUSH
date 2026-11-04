import { Injectable } from '@nestjs/common';
import { assertDomain } from '@duoquest/game-core';
import { QuizEngine } from '@duoquest/game-quiz';

@Injectable()
export class GameRegistry {
  private readonly quiz = new QuizEngine();
  get(gameId: string) {
    assertDomain(gameId === 'quiz', 'NOT_FOUND', 'Game chưa được đăng ký');
    return this.quiz;
  }
  catalog() {
    return [
      {
        id: 'quiz',
        title: 'Quiz Battle',
        modes: ['SOLO', 'DUEL', 'COOP'],
        layouts: ['SHARED_SCREEN', 'MULTI_DEVICE'],
      },
    ];
  }
}
