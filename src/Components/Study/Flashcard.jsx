import { RotateCw } from 'lucide-react'

export default function Flashcard({ card, isFlipped, onFlip }) {
  return (
    <button className={`flashcard${isFlipped ? ' is-flipped' : ''}`} type="button" onClick={onFlip} aria-label={isFlipped ? 'Show flashcard question' : 'Reveal flashcard answer'} aria-pressed={isFlipped}>
      <span className="flashcard-side-label">{isFlipped ? 'ANSWER' : 'QUESTION'}</span>
      <span className="flashcard-text">{isFlipped ? card.back : card.front}</span>
      <span className="flashcard-flip-hint"><RotateCw size={14} aria-hidden="true" /> Flip card</span>
    </button>
  )
}