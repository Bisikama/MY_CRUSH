'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  knowledgeKey,
  matchesQuestion,
  type CasualCatalog,
  type CasualCustomSelection,
  type GameLayout,
  type GameMode,
  type PackSummary,
  type QuestionFilter,
  type QuizSelection,
} from '@duoquest/shared-types';
import { useI18n } from '../../i18n';
import type { GameIdentity } from '../../lib/client';
import type { KnowledgeTypeFilter } from '../../lib/knowledge-type';
import { matchesLabCasual } from '../../mock/packs';
import { Button } from '../../ui';
import { QuizInviteTicket } from './lobby/quiz-invite-ticket';
import { QuizLobbyHero } from './lobby/quiz-lobby-hero';
import { QuizLobbySky } from './lobby/quiz-lobby-sky';
import styles from './lobby/quiz-lobby-setup.module.css';
import { QuizMatchSetupCard } from './lobby/quiz-match-setup-card';
import { QuizModeCards } from './lobby/quiz-mode-cards';

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

/**
 * Quiz Battle Lobby Setup Orchestrator (Variant 2B — "Vibrant Rainbow Toybox").
 * Visual architecture and maintenance guide: docs/features/quiz-lobby-ui.md
 */
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
  const { localeMeta, t } = useI18n();
  const [motionEnabled, setMotionEnabled] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMotionEnabled(false);
    }
  }, []);

  const casualCount = casualCatalog.reduce(
    (count, row) =>
      count +
      (selectionType !== 'CASUAL_CUSTOM' || matchesLabCasual(row.category, row, casualSelection)
        ? row.count
        : 0),
    0,
  );

  const distinct = (values: string[]) =>
    [...new Map(values.map((value) => [knowledgeKey(value), value])).values()].sort((a, b) =>
      a.localeCompare(b, localeMeta.code),
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
    <div className={styles.lobbyShell}>
      <QuizLobbySky motionEnabled={motionEnabled} />

      <div className={styles.lobbyContent}>
        {resumeCode && (
          <section className={styles.resumeCard} aria-live="polite">
            <h2 className={styles.resumeTitle}>
              {t('quiz.setup.resumeTitle', { code: resumeCode })}
            </h2>
            <div className={styles.resumeActions}>
              <Button asChild>
                <Link href={`/play/${resumeCode}`}>{t('quiz.setup.resumeButton')}</Link>
              </Button>
              <Button
                variant="outline"
                disabled={busy || !connected}
                onClick={() => void leaveRoom(resumeCode)}
              >
                {t('quiz.setup.leaveCurrentButton')}
              </Button>
            </div>
          </section>
        )}

        <QuizLobbyHero
          nickname={identity.nickname}
          motionEnabled={motionEnabled}
          onToggleMotion={() => setMotionEnabled((prev) => !prev)}
        />

        <QuizModeCards mode={mode} onChange={setMode} />

        <div className={styles.workspaceGrid}>
          <QuizMatchSetupCard
            mode={mode}
            layout={layout}
            setLayout={setLayout}
            selectionType={selectionType}
            setSelectionType={setSelectionType}
            casualCatalog={casualCatalog}
            casualSelection={casualSelection}
            setCasualSelection={setCasualSelection}
            casualCount={casualCount}
            hasUnclassifiedPacks={hasUnclassifiedPacks}
            knowledgeType={knowledgeType}
            setKnowledgeType={setKnowledgeType}
            categories={categories}
            topics={topics}
            choices={choices}
            selected={selected}
            setPackId={setPackId}
            filter={filter}
            setFilter={setFilter}
            secondNickname={secondNickname}
            setSecondNickname={setSecondNickname}
            busy={busy}
            connected={connected}
            createRoom={createRoom}
          />

          <QuizInviteTicket
            joinCode={joinCode}
            onJoinCodeChange={setJoinCode}
            busy={busy}
            connected={connected}
            onJoinRoom={joinRoom}
          />
        </div>

        {notice}
      </div>
    </div>
  );
}
