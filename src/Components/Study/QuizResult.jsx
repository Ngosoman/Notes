import { CheckCircle2, CircleAlert, RotateCw } from 'lucide-react'
import { SourcePages } from '../Notes/SummarySection.jsx'

export default function QuizResult({ result, onRetry }) {
  return (
    <section className="quiz-result" aria-labelledby="quiz-result-heading">
      <div className="quiz-result-score"><strong>{Math.round(result.score_percent)}%</strong><span>{result.correct_count} of {result.question_count} correct</span></div>
      <h2 id="quiz-result-heading">{result.score_percent >= 80 ? 'Strong work.' : 'Good review opportunity.'}</h2>
      {result.weak_topics?.length > 0 && <div className="quiz-weak-topics"><h3><CircleAlert size={15} aria-hidden="true" /> Topics to revisit</h3><ul>{result.weak_topics.map((topic) => <li key={topic}>{topic}</li>)}</ul></div>}
      <div className="quiz-review-list">
        {result.results.map((item, index) => <article className={`quiz-review-item${item.isCorrect ? ' is-correct' : ' is-incorrect'}`} key={item.questionId}>
          <div className="quiz-review-question"><span>{String(index + 1).padStart(2, '0')}</span><h3>{item.question}</h3>{item.isCorrect ? <CheckCircle2 size={17} aria-label="Correct" /> : <CircleAlert size={17} aria-label="Review this answer" />}</div>
          <p className="quiz-review-answer"><strong>Your answer:</strong> {item.selectedAnswer || 'No answer selected'}</p>
          {!item.isCorrect && <p className="quiz-review-answer"><strong>Correct answer:</strong> {item.correctAnswer}</p>}
          <p className="quiz-review-explanation">{item.explanation}</p>
          {item.sourceTopic && <p className="quiz-source-topic">Topic: {item.sourceTopic}</p>}
          <SourcePages pages={item.sourcePages} />
        </article>)}
      </div>
      <button className="button button-secondary" type="button" onClick={onRetry}><RotateCw size={15} aria-hidden="true" /> Try another quiz</button>
    </section>
  )
}