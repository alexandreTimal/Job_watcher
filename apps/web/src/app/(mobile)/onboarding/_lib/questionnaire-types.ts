export interface QuestionOption {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
  multiple?: boolean;
}

export interface QuestionnaireAnswer {
  questionId: string;
  selectedOptionIds: string[];
}

export interface QuestionnaireState {
  questions: Question[];
  answers: QuestionnaireAnswer[];
  currentQuestionIndex: number;
}

export function createInitialState(questions: Question[]): QuestionnaireState {
  return {
    questions,
    answers: [],
    currentQuestionIndex: 0,
  };
}
