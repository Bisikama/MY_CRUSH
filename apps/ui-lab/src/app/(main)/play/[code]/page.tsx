import { QuizClient } from '../../../../features/quiz/quiz-client';
export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <QuizClient code={code.toUpperCase()} />;
}
