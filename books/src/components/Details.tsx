import type { CSSProperties } from "react";
import {
  numberLabel,
  shelfTitle,
  technicalShelf,
  type Book,
} from "../data/catalog";
import { Cover } from "./Cover";

export function Details({
  book,
  onClose,
}: {
  book: Book;
  onClose: () => void;
}) {
  return (
    <section
      id="book-details"
      className="details"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-title"
    >
      <button className="close-detail" onClick={onClose} aria-label="Zamknij">
        <span aria-hidden="true">×</span> Zamknij
      </button>
      <span className="detail-brand">{shelfTitle}</span>
      <article className="book-description">
        <div className="rise-line">
          <p data-rise className="stage-label">
            {numberLabel(book.number)} ·{" "}
            {technicalShelf ? book.stage : book.category}
          </p>
        </div>
        <div className="rise-line">
          <h2 id="detail-title" data-rise>
            {book.title}
          </h2>
        </div>
        {book.subtitle && (
          <div className="rise-line">
            <p className="subtitle" data-rise>
              {book.subtitle}
            </p>
          </div>
        )}
        <div className="rise-line">
          <p className="byline" data-rise>
            {book.credit === "Editors" ? "Red. " : ""}
            {book.authors.join(", ")}
          </p>
        </div>
        <div className="rise-line">
          <p className="reading-note" data-rise>
            {book.description}
          </p>
        </div>
        <ol
          className="topics"
          aria-label="Tematy"
          style={
            { "--rows": Math.ceil(book.topics.length / 2) } as CSSProperties
          }
        >
          {book.topics.map((topic, i) => (
            <li key={topic}>
              <span data-rise>
                <b>{numberLabel(i + 1)}</b>
                {topic}
              </span>
            </li>
          ))}
        </ol>
        <div className="rise-line">
          <div className="edition" data-rise>
            <p>
              {book.edition} · {book.year} · {book.publisher}
            </p>
            <p>
              {book.category} · ISBN {book.isbn}
            </p>
            {book.editionNote && <p>{book.editionNote}</p>}
          </div>
        </div>
        <div className="rise-line">
          <div className="source-links" data-rise>
            <a href={book.official} target="_blank" rel="noreferrer">
              Informacje o książce
            </a>
            <a href={book.cover.attribution} target="_blank" rel="noreferrer">
              Okładka · {book.cover.provider}
            </a>
          </div>
        </div>
      </article>
      <div className="poster">
        <div
          className="poster-area"
          style={{ "--aspect": book.aspect } as CSSProperties}
        >
          <Cover book={book} immediate />
          <canvas className="ink" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
