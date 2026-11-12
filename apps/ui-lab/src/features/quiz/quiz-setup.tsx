'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button, Card } from '../../ui';
import {
  matchesQuestion,
  knowledgeKey,
  knowledgeTypeSchema,
  type Difficulty,
  type GameMode,
  type GameLayout,
  type PackSummary,
  type QuestionFilter,
  type QuizSelection,
  type CasualCatalog,
  type CasualCustomSelection,
} from '@duoquest/shared-types';
import type { GameIdentity } from '../../lib/client';
import { knowledgeTypeLabels, type KnowledgeTypeFilter } from '../../lib/knowledge-type';
import { CasualFilters } from './casual-filters';
interface Props {
  selectionType: QuizSelection['type'];
  setSelectionType: (value: QuizSelection['type']) => void;
  casualCatalog: CasualCatalog;
  casualSelection: CasualCustomSelection;
  setCasualSelection: (value: CasualCustomSelection) => void;
  identity: GameIdentity;
  resumeCode: string | null;
  mode: GameMode;
  setMode: (value: GameMode) => void;
  layout: GameLayout;
  setLayout: (value: GameLayout) => void;
  packs: PackSummary[];
  hasUnclassifiedPacks: boolean;
  knowledgeType: KnowledgeTypeFilter;
  setKnowledgeType: (value: KnowledgeTypeFilter) => void;
  packId: string;
  setPackId: (value: string) => void;
  filter: QuestionFilter;
  setFilter: (value: QuestionFilter) => void;
  secondNickname: string;
  setSecondNickname: (value: string) => void;
  joinCode: string;
  setJoinCode: (value: string) => void;
  busy: boolean;
  connected: boolean;
  notice: ReactNode;
  createRoom: () => Promise<void>;
  joinRoom: () => Promise<void>;
  leaveRoom: (code: string) => Promise<void>;
}
const modeInfo = [
  {
    id: 'SOLO' as const,
    icon: '01',
    title: 'Solo',
    subtitle: 'Một mình, một kỷ lục mới',
    description: 'Luyện kiến thức theo nhịp của bạn. Mỗi câu trả lời là một điều mới để nhớ.',
  },
  {
    id: 'DUEL' as const,
    icon: '02',
    title: 'Duel',
    subtitle: 'Một lời thách đấu dành cho người ấy',
    description: 'Cùng trả lời một bộ câu hỏi. Ai sẽ nhanh tay và ghi nhiều điểm hơn?',
  },
  {
    id: 'COOP' as const,
    icon: '∞',
    title: 'Co-op',
    subtitle: 'Cặp đôi tâm đầu ý hợp',
    description: 'Thay nhau làm đội trưởng và xem hai bạn phối hợp ăn ý đến đâu qua từng ải.',
  },
];
export function QuizSetup({
  selectionType,
  setSelectionType,
  casualCatalog,
  casualSelection,
  setCasualSelection,
  identity,
  resumeCode,
  mode,
  setMode,
  layout,
  setLayout,
  packs,
  hasUnclassifiedPacks,
  knowledgeType,
  setKnowledgeType,
  packId,
  setPackId,
  filter,
  setFilter,
  secondNickname,
  setSecondNickname,
  joinCode,
  setJoinCode,
  busy,
  connected,
  notice,
  createRoom,
  joinRoom,
  leaveRoom,
}: Props) {
  const distinct = (values: string[]) =>
    [...new Map(values.map((value) => [knowledgeKey(value), value])).values()].sort((a, b) =>
      a.localeCompare(b, 'vi'),
    );
  const categories = distinct(packs.map((pack) => pack.category));
  const topics = distinct(
    packs
      .filter(
        (pack) => !filter.category || knowledgeKey(pack.category) === knowledgeKey(filter.category),
      )
      .flatMap((pack) => pack.groups.map((group) => group.topic)),
  );
  const choices = packs
    .map((pack) => ({
      pack,
      count: pack.groups
        .filter((group) => matchesQuestion(pack.category, group, filter))
        .reduce((total, group) => total + group.count, 0),
    }))
    .filter(({ count }) => count > 0);
  const selected = choices.find(({ pack }) => pack.id === packId);
  return (
    <>
      {resumeCode && (
        <Card>
          <h2>Bạn có phòng đang mở: {resumeCode}</h2>
          <div className="actions">
            <Button asChild>
              <Link href={`/play/${resumeCode}`}>Quay lại phòng</Link>
            </Button>
            <Button
              variant="outline"
              disabled={busy || !connected}
              onClick={() => void leaveRoom(resumeCode)}
            >
              Rời phòng hiện tại
            </Button>
          </div>
        </Card>
      )}
      <div className="hero">
        <div>
          <p className="eyebrow">CHÀO {identity.nickname.toLocaleUpperCase('vi')} · QUIZ BATTLE</p>
          <h1>
            Mỗi câu hỏi,
            <br />
            một cuộc <em>phiêu lưu.</em>
          </h1>
          <p className="lead">
            Tự phá kỷ lục, gửi người ấy một lời thách đấu hoặc cùng nhau vượt ải.
            <br />
            Chọn cách chơi của bạn hôm nay.
          </p>
        </div>
        <div className="quiz-illustration" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <span className="quiz-tile">
            Q<span>✦</span>
          </span>
          <b className="floating-pill">+1 điều mới</b>
          <i className="spark">✧</i>
        </div>
      </div>
      <div className="section-heading">
        <h2>Hôm nay, bạn chơi thế nào?</h2>
        <span>01 GAME · 03 CÁCH CHƠI</span>
      </div>
      <div className="mode-grid">
        {modeInfo.map((item) => (
          <button
            key={item.id}
            className={`mode-card ${mode === item.id ? 'selected' : ''}`}
            onClick={() => setMode(item.id)}
            aria-pressed={mode === item.id}
          >
            <span className="mode-icon">{item.icon}</span>
            <span className="mode-title">
              {item.title}
              <span className="radio" />
            </span>
            <strong>{item.subtitle}</strong>
            <p>{item.description}</p>
          </button>
        ))}
      </div>
      <div className="setup-grid">
        <Card>
          <span className="tag">SẴN SÀNG MỘT VÒNG MỚI?</span>
          <h2>Thiết lập sân chơi</h2>
          <div className="form-grid">
            <div>
              <label htmlFor="quiz-experience">Trải nghiệm</label>
              <select
                id="quiz-experience"
                value={selectionType === 'STUDY' ? 'STUDY' : 'CASUAL'}
                onChange={(event) =>
                  setSelectionType(event.target.value === 'STUDY' ? 'STUDY' : 'CASUAL_RANDOM')
                }
              >
                <option value="CASUAL">Đố vui thử thách</option>
                <option value="STUDY">Học luyện chuyên môn</option>
              </select>
            </div>
            {mode !== 'SOLO' && (
              <div>
                <label htmlFor="layout">Không gian chơi</label>
                <select
                  id="layout"
                  value={layout}
                  onChange={(event) => setLayout(event.target.value as GameLayout)}
                >
                  <option value="MULTI_DEVICE">Mỗi người một thiết bị · LAN</option>
                  <option value="SHARED_SCREEN">Chung một màn hình</option>
                </select>
              </div>
            )}
            {selectionType !== 'STUDY' && (
              <div>
                <label htmlFor="casual-method">Cách chọn đề</label>
                <select
                  id="casual-method"
                  value={selectionType}
                  onChange={(event) =>
                    setSelectionType(event.target.value as QuizSelection['type'])
                  }
                >
                  <option value="CASUAL_RANDOM">Ngẫu nhiên</option>
                  <option value="CASUAL_CUSTOM">Tự chọn</option>
                </select>
              </div>
            )}
            {selectionType === 'CASUAL_CUSTOM' && (
              <CasualFilters
                catalog={casualCatalog}
                selection={casualSelection}
                onChange={setCasualSelection}
              />
            )}
            {selectionType === 'STUDY' && (
              <>
                <div>
                  <label htmlFor="pack-knowledge-type">Nhóm kiến thức</label>
                  <select
                    id="pack-knowledge-type"
                    value={knowledgeType}
                    onChange={(event) =>
                      setKnowledgeType(event.target.value as KnowledgeTypeFilter)
                    }
                  >
                    <option value="all">Tất cả</option>
                    {knowledgeTypeSchema.options.map((value) => (
                      <option key={value} value={value}>
                        {knowledgeTypeLabels[value]}
                      </option>
                    ))}
                    {hasUnclassifiedPacks && (
                      <option value="unclassified">{knowledgeTypeLabels.unclassified}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label htmlFor="pack-category">Lĩnh vực</label>
                  <select
                    id="pack-category"
                    value={filter.category ?? ''}
                    onChange={(event) =>
                      setFilter({
                        ...filter,
                        category: event.target.value || undefined,
                        topic: undefined,
                      })
                    }
                  >
                    <option value="">Tất cả lĩnh vực</option>
                    {categories.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="pack-topic">Đề tài</label>
                  <select
                    id="pack-topic"
                    value={filter.topic ?? ''}
                    onChange={(event) =>
                      setFilter({ ...filter, topic: event.target.value || undefined })
                    }
                  >
                    <option value="">Tất cả đề tài</option>
                    {topics.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="pack-difficulty">Độ khó</label>
                  <select
                    id="pack-difficulty"
                    value={filter.difficulty ?? ''}
                    onChange={(event) =>
                      setFilter({
                        ...filter,
                        difficulty: (event.target.value || undefined) as Difficulty | undefined,
                      })
                    }
                  >
                    <option value="">Mọi độ khó</option>
                    <option value="easy">Dễ</option>
                    <option value="medium">Trung bình</option>
                    <option value="hard">Khó</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="pack">Bộ câu hỏi</label>
                  <select
                    id="pack"
                    value={selected?.pack.id ?? ''}
                    onChange={(event) => setPackId(event.target.value)}
                  >
                    <option value="" disabled>
                      Chọn bộ đề
                    </option>
                    {choices.map(({ pack, count }) => (
                      <option key={pack.id} value={pack.id}>
                        {pack.title} · {count} câu phù hợp
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
          {selectionType !== 'STUDY' && (
            <p className="small">
              Tối đa 20 câu, ưu tiên câu bạn chưa gặp. Hết câu mới trong lựa chọn này sẽ bắt đầu
              vòng mới.
              {selectionType === 'CASUAL_CUSTOM' &&
                ' Có thể chọn nhiều lĩnh vực, chủ đề. Để trống để lấy tất cả; giữ Ctrl hoặc Command khi chọn nhiều trên máy tính.'}
            </p>
          )}
          {selectionType !== 'STUDY' && !casualCatalog.length && (
            <p role="status">Chưa có câu đố vui trong thư viện.</p>
          )}
          {selectionType === 'STUDY' && !choices.length && (
            <p role="status">Không có bộ đề phù hợp với bộ lọc.</p>
          )}
          {selectionType === 'STUDY' && selected && (
            <p className="small">
              {knowledgeTypeLabels[selected.pack.knowledgeType ?? 'unclassified']}
            </p>
          )}
          {selectionType === 'STUDY' &&
            selected?.pack.relatedKnowledge.map(({ category, topic, reason }, index) => {
              const match = categories.find(
                (value) => knowledgeKey(value) === knowledgeKey(category),
              );
              return (
                <p className="small" key={index}>
                  {match ? (
                    <button type="button" onClick={() => setFilter({ category: match })}>
                      {category}
                    </button>
                  ) : (
                    category
                  )}
                  {' · '}
                  {topic} — {reason}
                </p>
              );
            })}
          {layout === 'SHARED_SCREEN' && mode !== 'SOLO' && (
            <>
              <label htmlFor="second">Tên người chơi 2</label>
              <input
                id="second"
                value={secondNickname}
                onChange={(event) => setSecondNickname(event.target.value)}
                minLength={2}
                maxLength={30}
              />
              <p className="small muted" style={{ marginTop: -8, marginBottom: 14 }}>
                Người chơi 2 là slot khách tạm của phòng này; tiến trình và thưởng chỉ lưu cho chủ
                phòng.
              </p>
            </>
          )}
          <Button
            onClick={() => void createRoom()}
            disabled={
              busy || !connected || (selectionType === 'STUDY' ? !selected : !casualCatalog.length)
            }
          >
            Tạo {mode === 'SOLO' ? 'ván Solo' : 'phòng chơi'} →
          </Button>
          <p className="small muted">
            {connected ? '● Đã kết nối máy chủ' : '○ Đang kết nối máy chủ…'} · Điểm và thời gian do
            server xác nhận.
          </p>
        </Card>
        <Card className="join-card">
          <span className="tag">ĐÃ CÓ LỜI MỜI?</span>
          <h2>Vào phòng của bạn</h2>
          <p>Nhập mã 6 ký tự từ host. Hai thiết bị cần cùng mạng LAN.</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void joinRoom();
            }}
          >
            <label htmlFor="room-code">Mã phòng</label>
            <input
              id="room-code"
              className="code-input"
              placeholder="ABC234"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              maxLength={6}
              required
            />
            <Button variant="outline" disabled={busy || !connected || joinCode.length !== 6}>
              Tham gia phòng ↗
            </Button>
          </form>
        </Card>
      </div>
      {notice}
    </>
  );
}
