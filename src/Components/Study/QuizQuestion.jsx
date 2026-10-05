import { SourcePages } from '../Notes/SummarySection.jsx'

export default function QuizQuestion({ question, number, selectedAnswer, onAnswer, disabled = false }) {
  return (
    <fieldset className="quiz-question" disabled={disabled}>
      <legend><span className="quiz-question-number">{String(number).padStart(2, '0')}</span>{question.question}</legend>
      <div className="quiz-options">
        {question.options.map((option, index) => {
          const optionId = `${question.id}-option-${index}`
          return <label className={`quiz-option${selectedAnswer === option ? ' is-selected' : ''}`} htmlFor={optionId} key={`${question.id}-${option}`}>
            <input id={optionId} type="radio" name={question.id} value={option} checked={selectedAnswer === option} onChange={() => onAnswer(question.id, option)} />
            <span className="quiz-option-marker" aria-hidden="true">{String.fromCharCode(65 + index)}</span>
            <span>{option}</span>
          </label>
        })}
      </div>
      {question.source_topic && <p className="quiz-source-topic">Topic: {question.source_topic}</p>}
      <SourcePages pages={question.source_pages} />
    </fieldset>
  )
}