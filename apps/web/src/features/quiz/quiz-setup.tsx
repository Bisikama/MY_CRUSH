'use client';
import type { ReactNode } from 'react';
import { Button, Card } from '@duoquest/ui';
import type { GameMode, GameLayout, GuestIdentity, PackSummary } from '@duoquest/shared-types';
interface Props {
  identity: GuestIdentity;
  resumeCode: string | null;
  mode: GameMode;
  setMode: (value: GameMode) => void;
  layout: GameLayout;
  setLayout: (value: GameLayout) => void;
  packs: PackSummary[];
  packId: string;
  setPackId: (value: string) => void;
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
    subtitle: 'Rủ bạn vào so tài',
    description: 'Cùng câu hỏi, khác chiến thuật. Ai sẽ chớp thời cơ và dẫn đầu bảng điểm?',
  },
  {
    id: 'COOP' as const,
    icon: '∞',
    title: 'Co-op',
    subtitle: 'Hai cái đầu, một mục tiêu',
    description: 'Luân phiên làm đội trưởng, cùng vượt các ải và giữ những mạng cuối cùng.',
  },
];
export function QuizSetup({
  identity,
  resumeCode,
  mode,
  setMode,
  layout,
  setLayout,
  packs,
  packId,
  setPackId,
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
  return (
    <>
      {resumeCode && (
        <Card>
          <h2>Bạn có phòng đang mở: {resumeCode}</h2>
          <div className="actions">
            <Button asChild>
              <a href={`/play/${resumeCode}`}>Quay lại phòng</a>
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
            Tự phá kỷ lục, thách đấu bạn bè hoặc cùng nhau vượt ải.
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
              <label htmlFor="pack">Bộ câu hỏi</label>
              <select id="pack" value={packId} onChange={(event) => setPackId(event.target.value)}>
                {packs.map((pack) => (
                  <option key={pack.id} value={pack.id}>
                    {pack.title} · {pack.questionCount} câu
                  </option>
                ))}
              </select>
            </div>
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
          </div>
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
            </>
          )}
          <Button onClick={() => void createRoom()} disabled={busy || !connected || !packId}>
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
