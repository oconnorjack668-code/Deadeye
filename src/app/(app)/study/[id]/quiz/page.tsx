// src/app/(app)/study/[id]/quiz/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { ArrowLeft, CheckCircle2, XCircle, BarChart3 } from 'lucide-react';
import Link from 'next/link';

interface Question {
  id: string;
  itemId: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface QuizResult {
  score: number;
  totalQuestions: number;
  percentage: number;
  answers: Record<string, number>;
}

// The shape stored in study_items.quiz_questions (a jsonb column, so the schema
// types it as Json rather than this specific shape).
interface QuizQuestionJson {
  question: string;
  options?: string[];
  correct_index: number;
  explanation?: string;
}

export default function QuizPage() {
  const params = useParams();
  const topicId = params.id as string;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bumped by Retake Quiz to fetch the questions again
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        // A topic's quiz is the combined quiz_questions of its lessons; ?item=<id> quizzes one lesson
        const itemId = new URLSearchParams(window.location.search).get('item');
        let query = supabase
          .from('study_items')
          .select('id, quiz_questions')
          .eq('topic_id', topicId)
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        if (itemId) query = query.eq('id', itemId);
        const { data: items, error: fetchError } = await query;
        if (cancelled) return;

        if (fetchError || !items) {
          setError('Quiz not found');
          return;
        }

        const loaded: Question[] = items.flatMap((item) =>
          (Array.isArray(item.quiz_questions) ? (item.quiz_questions as unknown as QuizQuestionJson[]) : []).map((q, idx) => ({
            id: `${item.id}-${idx}`,
            itemId: item.id,
            text: q.question,
            options: q.options || [],
            correctAnswer: q.correct_index,
            explanation: q.explanation,
          }))
        );

        setQuestions(loaded);
      } catch {
        if (!cancelled) setError('Failed to load quiz');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [topicId, reload]);

  function handleSelectAnswer(index: number) {
    // First answer counts; the result and explanation are shown right away
    if (selectedAnswers[currentQuestion] !== undefined) return;
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestion]: index,
    });
  }

  function handleNext() {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      calculateResult();
    }
  }

  function handlePrevious() {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  }

  function calculateResult() {
    let score = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswer) {
        score++;
      }
    });

    const quizResult: QuizResult = {
      score,
      totalQuestions: questions.length,
      percentage: Math.round((score / questions.length) * 100),
      answers: selectedAnswers,
    };

    setResult(quizResult);
    setShowResults(true);

    // Save quiz completion
    saveQuizResult(quizResult);
  }

  async function saveQuizResult(quizResult: QuizResult) {
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();

      if (!user?.user) return;

      const { error: insertError } = await supabase.from('quiz_completions').insert([{
        user_id: user.user.id,
        topic_id: topicId,
        score: quizResult.score,
        total_questions: quizResult.totalQuestions,
        percentage: quizResult.percentage,
      }]);
      if (insertError) throw insertError;

      // Record per-lesson progress; a lesson counts as completed at 80%+
      const itemIds = Array.from(new Set(questions.map((q) => q.itemId)));
      for (const itemId of itemIds) {
        const itemQuestionIdxs = questions
          .map((q, idx) => (q.itemId === itemId ? idx : -1))
          .filter((idx) => idx >= 0);
        const correct = itemQuestionIdxs.filter(
          (idx) => quizResult.answers[idx] === questions[idx].correctAnswer
        ).length;
        const itemScore = Math.round((correct / itemQuestionIdxs.length) * 100);
        const now = new Date().toISOString();

        const progress: Database['public']['Tables']['study_progress']['Insert'] = {
          user_id: user.user.id,
          item_id: itemId,
          quiz_score: itemScore,
          quiz_answers: itemQuestionIdxs.map((idx) => quizResult.answers[idx] ?? null),
          updated_at: now,
        };
        // Only set completed_at on a pass so a later failed retake doesn't erase it
        if (itemScore >= 80) progress.completed_at = now;

        const { error: progressError } = await supabase
          .from('study_progress')
          .upsert(progress, { onConflict: 'user_id,item_id' });
        if (progressError) throw progressError;
      }
    } catch (err) {
      console.error('Failed to save quiz result:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-zinc-400">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 overflow-auto p-4 md:p-8 max-w-2xl mx-auto">
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      </div>
    );
  }

  if (showResults && result) {
    return (
      <div className="flex-1 overflow-auto p-4 md:p-8 max-w-2xl mx-auto">
        <Link href={`/study/${topicId}`} className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to Topic
        </Link>

        <Card className="border-zinc-800 bg-zinc-900/70">
          <CardContent className="p-8 text-center space-y-6">
            <div className="space-y-2">
              <BarChart3 className="h-16 w-16 mx-auto text-blue-400" />
              <h2 className="text-2xl font-black text-white">Quiz Complete!</h2>
            </div>

            <div className="space-y-2">
              <div className="text-5xl font-black text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text">
                {result.percentage}%
              </div>
              <p className="text-sm text-zinc-400">
                You scored {result.score} out of {result.totalQuestions} questions correctly
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 py-6 border-t border-b border-zinc-800">
              <div>
                <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">Correct</div>
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span className="text-lg font-bold text-white">{result.score}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">Incorrect</div>
                <div className="flex items-center justify-center gap-1">
                  <XCircle className="h-5 w-5 text-red-400" />
                  <span className="text-lg font-bold text-white">{result.totalQuestions - result.score}</span>
                </div>
              </div>
            </div>

            {result.percentage >= 80 && (
              <Badge variant="success" className="justify-center w-full">
                ✨ Excellent performance!
              </Badge>
            )}
            {result.percentage >= 60 && result.percentage < 80 && (
              <Badge variant="default" className="justify-center w-full">
                Good work! Keep practicing.
              </Badge>
            )}
            {result.percentage < 60 && (
              <Badge variant="warning" className="justify-center w-full">
                Review the material and try again.
              </Badge>
            )}

            <div className="space-y-2">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => {
                  setShowResults(false);
                  setCurrentQuestion(0);
                  setSelectedAnswers({});
                  setReload((n) => n + 1);
                }}
              >
                Retake Quiz
              </Button>
              <Link href={`/study/${topicId}`} className="block">
                <Button variant="outline" size="lg" className="w-full">
                  Back to Topic
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex-1 overflow-auto p-4 md:p-8 max-w-2xl mx-auto">
        <Alert variant="warning" title="No questions">
          This quiz has no questions yet.
        </Alert>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const selectedAnswer = selectedAnswers[currentQuestion];

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8 max-w-2xl mx-auto">
      <Link href={`/study/${topicId}`} className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 mb-8">
        <ArrowLeft className="h-4 w-4" />
        Back to Topic
      </Link>

      <Card className="border-zinc-800 bg-zinc-900/70">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <Badge variant="default">
              Question {currentQuestion + 1} of {questions.length}
            </Badge>
            <Badge variant="default">
              {Math.round(((currentQuestion + 1) / questions.length) * 100)}%
            </Badge>
          </div>
          <CardTitle>{question.text}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {question.options.map((option, idx) => {
            const answered = selectedAnswer !== undefined;
            const isSelected = selectedAnswer === idx;
            const isCorrect = idx === question.correctAnswer;

            return (
              <button
                key={idx}
                onClick={() => handleSelectAnswer(idx)}
                disabled={answered}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  answered && isCorrect
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-white'
                    : isSelected
                      ? 'border-red-500/50 bg-red-500/10 text-white'
                      : answered
                        ? 'border-zinc-800 bg-zinc-900/30 text-zinc-500'
                        : 'border-zinc-700/50 bg-zinc-900/50 text-zinc-300 hover:border-blue-500/30 hover:bg-blue-500/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{option}</span>
                  {answered && (isCorrect || isSelected) && (
                    <span className="text-sm">{isCorrect ? '✓' : '✗'}</span>
                  )}
                </div>
              </button>
            );
          })}

          {selectedAnswer !== undefined && question.explanation && (
            <div
              className={`rounded-lg p-3 text-sm ${
                selectedAnswer === question.correctAnswer ? 'bg-emerald-500/10 text-emerald-200' : 'bg-amber-500/10 text-amber-100'
              }`}
            >
              <span className="font-bold">{selectedAnswer === question.correctAnswer ? 'Correct. ' : 'Not quite. '}</span>
              {question.explanation}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>
          <Button
            variant="primary"
            onClick={handleNext}
            disabled={selectedAnswer === undefined}
          >
            {currentQuestion === questions.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
