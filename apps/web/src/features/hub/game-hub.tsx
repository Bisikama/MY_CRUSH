'use client';

import Link from 'next/link';
import { usePlatform } from '../../providers/platform-provider';

export function GameHub() {
  const { identity } = usePlatform();

  return (
    <div className="hub-container">
      {/* 1. SHORT WELCOME HERO SECTION */}
      <section className="hub-welcome-card" aria-labelledby="hub-welcome-heading">
        <div className="hub-welcome-glow hub-welcome-glow-right" aria-hidden="true" />
        <div className="hub-welcome-glow hub-welcome-glow-left" aria-hidden="true" />

        <div className="hub-welcome-content">
          <div className="hub-welcome-copy">
            <div className="hub-eyebrow-pill">
              <span aria-hidden="true">✦</span>
              <span>DuoQuest Hub • Pastel Playfield</span>
            </div>
            <h1 id="hub-welcome-heading" className="hub-welcome-title">
              Hôm nay, bạn muốn chơi gì?
            </h1>
            <p className="hub-welcome-subtitle">
              Chọn một trò chơi, bắt đầu cuộc vui cùng bạn bè hoặc khám phá thế giới câu đố diệu kỳ.
            </p>
          </div>

          <div className="hub-welcome-art-wrap">
            <div className="hub-welcome-art-frame">
              <img
                src="/images/hub/hero-mascots.jpg"
                alt="Minh họa đất sét 3D đôi bạn linh vật Thỏ Lavender và Chim Xanh trước cánh cửa gỗ nhỏ"
                className="hub-welcome-art-img"
              />
            </div>
            <div className="hub-welcome-sticker">
              <span className="hub-sticker-star" aria-hidden="true">
                ★
              </span>
              <span>{identity ? `${identity.nickname} & Bạn` : 'Mây Nhỏ & Bạn'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. GAME SELECTION SECTION */}
      <section className="hub-games-section" aria-labelledby="hub-games-heading">
        <div className="hub-section-header">
          <div className="hub-section-title-group">
            <h2 id="hub-games-heading" className="hub-section-title">
              Các trò chơi
            </h2>
            <span className="hub-count-badge">1 game có sẵn · 2 ý tưởng tiếp theo</span>
          </div>
          <span className="hub-section-hint">Chọn sảnh chờ để bắt đầu</span>
        </div>

        <div className="hub-cards-grid">
          {/* CARD 1: PLAYABLE QUIZ BATTLE */}
          <article className="hub-game-card hub-game-card-playable">
            <div className="hub-card-media">
              <img
                src="/images/hub/quiz-battle.jpg"
                alt="Minh họa 3D bàn đấu Quiz Battle với các thẻ dấu hỏi phát sáng và nút bấm chuông"
                className="hub-card-img"
              />
              <div className="hub-card-top-left">
                <span className="hub-media-pill hub-media-pill-players">1–2 người</span>
              </div>
              <div className="hub-card-top-right">
                <span className="hub-media-pill hub-media-pill-ready">Có sẵn</span>
              </div>
            </div>

            <div className="hub-card-body">
              <div>
                <div className="hub-card-tags">
                  <span className="hub-tag-chip">Solo · Duel · Co-op</span>
                  <span className="hub-tag-chip">Chung màn hình / LAN</span>
                </div>
                <h3 className="hub-card-title">Quiz Battle</h3>
                <p className="hub-card-desc">
                  Thử tài kiến thức, so tài tốc độ hoặc cùng bạn vượt qua các bộ câu hỏi hóc búa.
                </p>
              </div>

              <Link href="/play" className="hub-play-cta">
                <span>Vào game</span>
                <span className="hub-play-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
          </article>

          {/* CARD 2: FUTURE GAME 1 */}
          <article
            className="hub-game-card hub-game-card-future"
            aria-label="Trò chơi tiếp theo — Đang lên ý tưởng"
          >
            <div className="hub-card-media hub-card-media-muted">
              <img
                src="/images/hub/mystery-chest.jpg"
                alt="Minh họa 3D rương bí ẩn màu pastel đang đóng kín"
                className="hub-card-img hub-card-img-muted"
              />
              <div className="hub-card-top-left">
                <span className="hub-media-pill hub-media-pill-muted">Đang lên ý tưởng</span>
              </div>
              <div className="hub-mystery-center-badge" aria-hidden="true">
                ?
              </div>
            </div>

            <div className="hub-card-body">
              <div>
                <div className="hub-card-tags">
                  <span className="hub-tag-chip hub-tag-chip-muted">Đang lên ý tưởng</span>
                </div>
                <h3 className="hub-card-title hub-card-title-muted">Trò chơi tiếp theo</h3>
                <p className="hub-card-desc hub-card-desc-muted">
                  Một trải nghiệm mới đang được khám phá.
                </p>
              </div>

              <div className="hub-future-status" aria-disabled="true">
                <span>Đang lên ý tưởng</span>
              </div>
            </div>
          </article>

          {/* CARD 3: FUTURE GAME 2 */}
          <article
            className="hub-game-card hub-game-card-future"
            aria-label="Trò chơi tiếp theo — Đang lên ý tưởng"
          >
            <div className="hub-card-media hub-card-media-muted">
              <img
                src="/images/hub/mystery-gift.jpg"
                alt="Minh họa 3D hộp quà bí ẩn thắt nơ pastel giữa những đám mây nhỏ"
                className="hub-card-img hub-card-img-muted"
              />
              <div className="hub-card-top-left">
                <span className="hub-media-pill hub-media-pill-muted">Đang lên ý tưởng</span>
              </div>
              <div className="hub-mystery-center-badge" aria-hidden="true">
                ✦
              </div>
            </div>

            <div className="hub-card-body">
              <div>
                <div className="hub-card-tags">
                  <span className="hub-tag-chip hub-tag-chip-muted">Đang lên ý tưởng</span>
                </div>
                <h3 className="hub-card-title hub-card-title-muted">Trò chơi tiếp theo</h3>
                <p className="hub-card-desc hub-card-desc-muted">
                  Một trải nghiệm mới đang được khám phá.
                </p>
              </div>

              <div className="hub-future-status" aria-disabled="true">
                <span>Đang lên ý tưởng</span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
