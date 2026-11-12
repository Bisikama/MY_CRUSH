import { hasFreeSkill, QuizEngine, roundIdOf, type QuizState } from '@duoquest/game-quiz';
import type {
  ActionReceipt,
  GameActionCommand,
  GameLayout,
  GameMode,
  OptionId,
  PlayerSlot,
  Question,
  QuizAction,
  QuizSkill,
  RoomView,
} from '@duoquest/shared-types';

export const labRoomCode = 'LAB222';
export type RoomCommand = 'room:ready' | 'match:start' | 'room:rematch' | 'room:sync';

interface MatchOptions {
  mode: GameMode;
  layout: GameLayout;
  players: { playerId: string; nickname: string }[];
  questions: Question[];
  setup?: RoomView['setup'];
  stock: (playerId: string) => Partial<Record<QuizSkill, number>>;
  consume: (playerId: string, skill: QuizSkill) => void;
  sessionId: () => string;
}

export class LabMatch {
  private readonly engine = new QuizEngine();
  private readonly players: PlayerSlot[];
  private readonly receipts = new Map<string, ActionReceipt>();
  private readonly votes = new Set<string>();
  private readonly disconnected = new Set<number>();
  private state: QuizState | null = null;
  private perspective = 0;
  private joined: boolean;

  constructor(private readonly options: MatchOptions) {
    this.players = options.players.map((player) => ({ ...player, ready: false, connected: true }));
    this.joined = !this.canSwitch;
  }

  get canSwitch() {
    return this.options.mode !== 'SOLO' && this.options.layout === 'MULTI_DEVICE';
  }

  get isConnected() {
    return !this.disconnected.has(this.perspective);
  }

  get activePerspective() {
    return this.perspective;
  }

  private get participants() {
    return this.joined ? this.players : this.players.slice(0, 1);
  }

  private get controlledIds() {
    return this.canSwitch
      ? [this.players[this.perspective]!.playerId]
      : this.players.map(({ playerId }) => playerId);
  }

  private get status(): RoomView['status'] {
    if (this.state) return this.state.phase === 'FINISHED' ? 'FINISHED' : 'IN_PROGRESS';
    return this.joined && !this.disconnected.size && this.players.every(({ ready }) => ready)
      ? 'READY'
      : 'WAITING';
  }

  switchPlayer(index: 0 | 1) {
    if (!this.canSwitch) return;
    this.perspective = index;
    if (index === 1) this.joined = true;
  }

  toggleConnection() {
    if (!this.disconnected.delete(this.perspective)) this.disconnected.add(this.perspective);
  }

  view(now: number): RoomView {
    const game = this.state ? this.engine.getPlayerView(this.state, this.controlledIds, now) : null;
    game?.skillSlots.forEach((slot) => {
      slot.stock = { ...this.options.stock(slot.playerId) };
    });
    return {
      code: labRoomCode,
      hostPlayerId: this.players[0]!.playerId,
      mode: this.options.mode,
      layout: this.options.layout,
      players: this.participants.map((player, index) => ({
        ...player,
        connected: !this.disconnected.has(this.canSwitch ? index : 0),
      })),
      status: this.status,
      controlledPlayerIds: this.controlledIds,
      rematchVotes: [...this.votes],
      setup: this.options.setup,
      game,
    };
  }

  private begin(now: number) {
    this.state = this.engine.initialize(
      {
        sessionId: this.options.sessionId(),
        mode: this.options.mode,
        layout: this.options.layout,
        playerIds: this.players.map(({ playerId }) => playerId),
        questions: this.options.questions,
      },
      now,
    );
    this.receipts.clear();
    this.votes.clear();
  }

  command(event: RoomCommand, now: number) {
    if (!this.isConnected) throw new Error('Kết nối mô phỏng đang tắt.');
    if (event === 'room:ready' && !this.state) {
      this.players.forEach((player) => {
        if (this.controlledIds.includes(player.playerId)) player.ready = true;
      });
    } else if (event === 'match:start') {
      if (this.perspective !== 0 || this.status !== 'READY')
        throw new Error('Chờ tất cả người chơi sẵn sàng.');
      this.begin(now);
    } else if (event === 'room:rematch' && this.status === 'FINISHED') {
      if (this.disconnected.size) throw new Error('Chờ tất cả người chơi kết nối lại.');
      this.votes.add(this.players[this.perspective]!.playerId);
      if (!this.canSwitch || this.votes.size === this.players.length) this.begin(now);
    }
  }

  tick(now: number) {
    if (!this.state || this.state.phase === 'FINISHED' || now < this.state.deadline) return false;
    this.state = this.engine.onTimeout(this.state, now);
    return true;
  }

  action(command: GameActionCommand, now: number): ActionReceipt {
    if (!this.isConnected) throw new Error('Kết nối mô phỏng đang tắt.');
    if (
      !this.state ||
      command.sessionId !== this.state.config.sessionId ||
      !this.controlledIds.includes(command.playerId)
    )
      throw new Error('Thao tác ngoài lượt mô phỏng.');
    const previous = this.receipts.get(command.actionId);
    if (previous) return previous;
    if (command.roundId !== roundIdOf(this.state)) throw new Error('Vòng chơi đã thay đổi.');

    const { payload, playerId } = command;
    const paid =
      payload.type === 'USE_SKILL' && !hasFreeSkill(this.state, playerId, payload.skill)
        ? payload.skill
        : null;
    if (paid && !this.options.stock(playerId)[paid])
      throw new Error('Kho mẫu đã hết lượt kỹ năng này.');
    const next = this.engine.applyAction(this.state, playerId, payload, now);
    if (paid) this.options.consume(playerId, paid);
    this.state = next;
    const receipt = { actionId: command.actionId, stateVersion: next.version };
    this.receipts.set(command.actionId, receipt);
    return receipt;
  }

  prepareScene(scene: LabScene, now: number, delay: number) {
    if (scene === 'lobby') return;
    this.joined = true;
    this.players.forEach((player) => {
      player.ready = true;
    });
    const elapsed =
      scene === 'timeout'
        ? this.options.questions[0]!.timeLimitSeconds * 1000 - delay
        : scene === 'cover' || scene === 'blur'
          ? 6000
          : 0;
    this.begin(now - elapsed);
  }

  /** Replay the interaction after the initial scene has rendered. */
  playScene(scene: LabScene, now: number) {
    if (scene === 'lobby' || scene === 'image') return;
    const act = (index: number, action: QuizAction) => {
      const state = this.state!;
      this.state = this.engine.applyAction(state, this.players[index]!.playerId, action, now);
    };
    const answer = (optionId: OptionId) => act(0, { type: 'ANSWER', optionId });
    const skill = (skill: QuizSkill) => act(0, { type: 'USE_SKILL', skill });
    const question = this.options.questions[0]!;
    const wrong = question.options.find(({ id }) => id !== question.correctOptionId)!.id;
    switch (scene) {
      case 'buzz':
        act(0, { type: 'BUZZ' });
        break;
      case 'steal':
        act(0, { type: 'BUZZ' });
        answer(wrong);
        act(1, { type: 'BUZZ' });
        break;
      case 'correct':
      case 'result':
        answer(question.correctOptionId);
        if (scene === 'result') this.tick(this.state!.deadline);
        break;
      case 'wrong':
      case 'coop-life':
        answer(wrong);
        break;
      case 'timeout':
        this.tick(Math.max(now, this.state!.deadline));
        break;
      case 'hint':
        skill('HINT');
        break;
      case 'fifty':
        skill('FIFTY_FIFTY');
        break;
      case 'cover':
      case 'blur':
        skill(scene === 'cover' ? 'COVER' : 'BLUR');
        this.switchPlayer(1);
        break;
      case 'disconnect':
        this.toggleConnection();
        break;
    }
  }
}

export const labScenes = {
  lobby: { label: 'Phòng chờ', mode: 'DUEL', layout: 'MULTI_DEVICE' },
  buzz: { label: 'Giành quyền trả lời', mode: 'DUEL', layout: 'SHARED_SCREEN' },
  steal: { label: 'Cướp lượt', mode: 'DUEL', layout: 'SHARED_SCREEN' },
  correct: { label: 'Trả lời đúng', mode: 'SOLO', layout: 'MULTI_DEVICE' },
  wrong: { label: 'Trả lời sai', mode: 'SOLO', layout: 'MULTI_DEVICE' },
  timeout: { label: 'Hết giờ', mode: 'SOLO', layout: 'MULTI_DEVICE' },
  image: { label: 'Câu hỏi có ảnh', mode: 'SOLO', layout: 'MULTI_DEVICE' },
  hint: { label: 'Mở Hint', mode: 'SOLO', layout: 'MULTI_DEVICE' },
  fifty: { label: 'Dùng 50/50', mode: 'SOLO', layout: 'MULTI_DEVICE' },
  cover: { label: 'Che câu hỏi', mode: 'DUEL', layout: 'MULTI_DEVICE' },
  blur: { label: 'Làm mờ đáp án', mode: 'DUEL', layout: 'MULTI_DEVICE' },
  'coop-life': { label: 'Co-op mất mạng', mode: 'COOP', layout: 'MULTI_DEVICE' },
  result: { label: 'Kết quả', mode: 'SOLO', layout: 'MULTI_DEVICE' },
  disconnect: { label: 'Mất kết nối', mode: 'DUEL', layout: 'MULTI_DEVICE' },
} as const;

export type LabScene = keyof typeof labScenes;
