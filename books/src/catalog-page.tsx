import { createRoot } from "react-dom/client";
import { useState } from "react";
import {
  bookHref,
  books,
  categories,
  numberLabel,
  otherLabel,
  shelfQuery,
  technicalShelf,
} from "./data/catalog";
import { Cover } from "./components/Cover";
import "./styles/layout.css";
import "./styles/book.css";
import "./styles/catalog.css";

function Catalog() {
  const [filter, setFilter] = useState("All");
  const selection =
    filter === "All" ? books : books.filter((book) => book.category === filter);
  return (
    <main className="catalog">
      <div className="catalog-heading">
        <h1>
          {technicalShelf
            ? "Katalog półki inżynierskiej"
            : "Katalog ważnych książek"}
        </h1>
        <nav className="library-nav" aria-label="Nawigacja katalogu">
          <a className="collection-link" href={"./" + shelfQuery}>
            Półka
          </a>
          <a
            className="collection-link"
            href={
              "./catalog.html" + (technicalShelf ? "" : "?shelf=engineering")
            }
          >
            {otherLabel}
          </a>
        </nav>
      </div>
      <div
        className="catalog-filters"
        role="group"
        aria-label="Filtruj katalog"
      >
        {categories.map(([label, group]) => (
          <button
            key={group}
            onClick={() => setFilter(group)}
            aria-pressed={filter === group}
          >
            {label}
          </button>
        ))}
      </div>
      <ol className="catalog-list">
        {selection.map((book) => (
          <li key={book.id}>
            <a
              className="thumb"
              href={bookHref(book.id)}
              aria-label={"Otwórz " + book.title}
            >
              <Cover book={book} immediate lazy />
            </a>
            <article>
              <p className="catalog-stage">
                {numberLabel(book.number)} · {book.category}
              </p>
              <h2>
                <a href={bookHref(book.id)}>{book.title}</a>
              </h2>
              {book.subtitle && <p>{book.subtitle}</p>}
              <p>
                {book.credit === "Editors" ? "Red. " : ""}
                {book.authors.join(", ")}
              </p>
              <p className="catalog-meta">
                {book.edition} · {book.year} · {book.publisher}
                <br />
                ISBN {book.isbn}
              </p>
              <p className="note">{book.description}</p>
              {book.editionNote && (
                <p className="catalog-meta">{book.editionNote}</p>
              )}
              <div className="catalog-links">
                <a href={book.official} target="_blank" rel="noreferrer">
                  Informacje o książce
                </a>
                <a
                  href={book.cover.attribution}
                  target="_blank"
                  rel="noreferrer"
                >
                  {book.cover.provider}
                </a>
              </div>
            </article>
          </li>
        ))}
      </ol>
      <a className="collection-link" href={"./" + shelfQuery}>
        Wróć na półkę
      </a>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Catalog />);
