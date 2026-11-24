import { createRoot } from "react-dom/client";
import { useState } from "react";
import {
  bookHref,
  books,
  catalogTitle,
  categories,
  numberLabel,
  shelfHref,
  shelfId,
} from "./data/catalog";
import { Cover } from "./components/Cover";
import { ShelfNavigation } from "./components/ShelfNavigation";
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
        <h1>{catalogTitle}</h1>
        <ShelfNavigation catalog />
      </div>
      {!shelfId && (
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
      )}
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
                {book.isbn && (
                  <>
                    <br />
                    ISBN {book.isbn}
                  </>
                )}
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
      <a className="collection-link" href={shelfHref()}>
        Wróć na półkę
      </a>
    </main>
  );
}
document.title = catalogTitle + " · Jan Jędrzejak";
createRoot(document.getElementById("root")!).render(<Catalog />);
