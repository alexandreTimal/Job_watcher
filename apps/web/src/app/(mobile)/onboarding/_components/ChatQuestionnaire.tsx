"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Question,
  QuestionnaireAnswer,
  QuestionnaireState,
} from "../_lib/questionnaire-types";

interface ChatQuestionnaireProps {
  state: QuestionnaireState;
  onChange: (state: QuestionnaireState) => void;
}

export function ChatQuestionnaire({ state, onChange }: ChatQuestionnaireProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [state.currentQuestionIndex, state.answers.length]);

  const visibleQuestions = state.questions.slice(
    0,
    state.currentQuestionIndex + 1,
  );

  function handleSelect(question: Question, optionId: string) {
    const existingAnswer = state.answers.find(
      (a) => a.questionId === question.id,
    );

    if (question.multiple) {
      // Toggle the option in multi-select mode
      const current = existingAnswer?.selectedOptionIds ?? [];
      const updated = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];

      const newAnswers = state.answers.filter(
        (a) => a.questionId !== question.id,
      );
      if (updated.length > 0) {
        newAnswers.push({ questionId: question.id, selectedOptionIds: updated });
      }

      onChange({ ...state, answers: newAnswers });
    } else {
      // Single select — answer and advance
      const questionIndex = state.questions.findIndex(
        (q) => q.id === question.id,
      );
      // Truncate answers after this question (in case of re-answer)
      const newAnswers = state.answers.filter((a) => {
        const aIdx = state.questions.findIndex((q) => q.id === a.questionId);
        return aIdx < questionIndex;
      });
      newAnswers.push({ questionId: question.id, selectedOptionIds: [optionId] });

      onChange({
        ...state,
        answers: newAnswers,
        currentQuestionIndex: Math.min(
          questionIndex + 1,
          state.questions.length - 1,
        ),
      });
    }
  }

  function handleConfirmMultiple(question: Question) {
    const questionIndex = state.questions.findIndex(
      (q) => q.id === question.id,
    );
    // Truncate answers after this question
    const newAnswers = state.answers.filter((a) => {
      const aIdx = state.questions.findIndex((q) => q.id === a.questionId);
      return aIdx <= questionIndex;
    });

    onChange({
      ...state,
      answers: newAnswers,
      currentQuestionIndex: Math.min(
        questionIndex + 1,
        state.questions.length - 1,
      ),
    });
  }

  function handleRewind(questionIndex: number) {
    // Truncate answers from this question onwards
    const newAnswers = state.answers.filter((a) => {
      const aIdx = state.questions.findIndex((q) => q.id === a.questionId);
      return aIdx < questionIndex;
    });

    onChange({
      ...state,
      answers: newAnswers,
      currentQuestionIndex: questionIndex,
    });
  }

  function getAnswer(questionId: string): QuestionnaireAnswer | undefined {
    return state.answers.find((a) => a.questionId === questionId);
  }

  const allAnswered =
    state.answers.length === state.questions.length;

  function isAnswered(questionIndex: number): boolean {
    const question = state.questions[questionIndex];
    if (!question) return false;
    const answer = getAnswer(question.id);
    if (!answer) return false;
    // Moved past this question, OR all questions answered (handles last question)
    return state.currentQuestionIndex > questionIndex || allAnswered;
  }

  return (
    <div className="flex flex-col">
      <div
        ref={scrollRef}
        className="flex flex-col gap-4 overflow-y-auto pr-1"
        style={{ maxHeight: "60vh" }}
      >
        {visibleQuestions.map((question, qIdx) => {
          const answer = getAnswer(question.id);
          const answered = isAnswered(qIdx);
          const isActive = qIdx === state.currentQuestionIndex && !answered;

          return (
            <div key={question.id} className="flex flex-col gap-2">
              {/* System message bubble */}
              <div className="flex justify-start">
                <div className="bg-muted max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-2.5">
                  <p className="text-sm">
                    {question.text}
                    {question.multiple && (
                      <span className="text-muted-foreground ml-1 text-xs">
                        (plusieurs choix possibles)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Answered — show as user bubble, clickable to rewind */}
              {answered && answer && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRewind(qIdx)}
                    className="bg-primary text-primary-foreground max-w-[85%] cursor-pointer rounded-2xl rounded-tr-sm px-4 py-2.5 text-left transition-opacity hover:opacity-80"
                  >
                    <p className="text-sm">
                      {answer.selectedOptionIds
                        .map(
                          (id) =>
                            question.options.find((o) => o.id === id)?.label,
                        )
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </button>
                </div>
              )}

              {/* Active question — show chips */}
              {isActive && (
                <div className="flex flex-wrap gap-2 pl-2">
                  {question.options.map((option) => {
                    const selected =
                      answer?.selectedOptionIds.includes(option.id) ?? false;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleSelect(question, option.id)}
                        className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                          selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-muted border-border"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                  {question.multiple && answer && answer.selectedOptionIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleConfirmMultiple(question)}
                      className="bg-primary text-primary-foreground rounded-full px-4 py-1.5 text-sm font-medium transition-opacity hover:opacity-90"
                    >
                      Valider ✓
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
