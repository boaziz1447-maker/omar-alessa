
export interface LessonDetails {
  teacherName: string;
  schoolName: string;
  region: string; // Education Administration
  subject: string;
  lessonTitle: string;
  gradeLevel: string;
  content: string;
  principalName: string;
  date: string;
}

export interface Question {
  question: string;
  answer: string;
  wrongAnswer?: string; // Added for multiple choice / distractor
}

export interface Strategy {
  id: string;
  name: string; // e.g., Hot Chair, X&O
  mainIdea: string;
  objectives: string[];
  implementationSteps: string[];
  tools: string[];
  questions: Question[]; // New field for generated questions
  timeRequired?: string;
}

export interface GeneratedResponse {
  strategies: Strategy[];
}
