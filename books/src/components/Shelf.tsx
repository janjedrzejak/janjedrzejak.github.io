import { useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  books,
  categories,
  numberLabel,
  shelfId,
  shelfTitle,
  wraps,
} from "../data/catalog";
import { BookModel } from "../geometry/BookModel";
import { ShelfController } from "../animation/ShelfController";
import { Details } from "./Details";
import { ShelfNavigation } from "./ShelfNavigation";
import "../styles/layout.css";
import "../styles/book.css";
import "../styles/details.css";

function Arrow({ next }: { next: boolean }) {
  return (
    <svg
      viewBox="0 0 18 10"
      width="18"
      height="10"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
    >
      <path d={next ? "M13 1l4 4-4 4M1 5h16" : "M5 1L1 5l4 4M1 5h16"} />
    </svg>
  );
}
const solids = Array.from({ length: books.length * (wraps ? 3 : 1) }, (_, i) => (
  <BookModel
    key={i}
    slot={i}
    index={i % books.length}
    book={books[i % books.length]}
  />
));
export function Shelf() {
  const root = useRef<HTMLDivElement>(null),
    engine = useRef<ShelfController | null>(null);
  const group = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0),
    [detail, setDetail] = useState<number | null>(null);
  const b = books[active];
  useLayoutEffect(() => {
    const controller = new ShelfController(
      root.current!,
      (i) => flushSync(() => setDetail(i)),
      setActive,
    );
    engine.current = controller;
    return () => {
      controller.dispose();
      engine.current = null;
    };
  }, []);
  useLayoutEffect(() => {
    const parent = group.current;
    if (!parent) return;
    const adjust = () => {
      const current = parent.querySelector<HTMLButtonElement>(
        '[aria-pressed="true"]',
      );
      if (!current) return;
      parent.style.setProperty("--tab-x", current.offsetLeft + "px");
      parent.style.setProperty("--tab-w", current.offsetWidth + "px");
    };
    adjust();
    const resize = new ResizeObserver(adjust);
    resize.observe(parent);
    document.fonts.ready.then(adjust);
    const current = parent.querySelector<HTMLButtonElement>(
      '[aria-pressed="true"]',
    );
    if (
      current &&
      (current.offsetLeft < parent.scrollLeft ||
        current.offsetLeft + current.offsetWidth >
          parent.scrollLeft + parent.clientWidth)
    ) {
      parent.scrollLeft = current.offsetLeft;
    }
    return () => resize.disconnect();
  }, [b.category]);
  return (
    <div id="experience" ref={root} tabIndex={-1}>
      <div className="library-shell">
        <main className="library-main">
          <div className="heading-row">
            <h1>{shelfTitle}</h1>
            <ShelfNavigation />
          </div>
          <section className="collection" aria-label="Półka z książkami">
            <div className="shelf-index">
              {!shelfId && (
                <div
                  className="groups"
                  role="group"
                  aria-label="Kategorie książek"
                  ref={group}
                >
                  <i className="indicator" aria-hidden="true" />
                  {categories.map(([label, name]) => (
                    <button
                      key={name}
                      aria-pressed={b.category === name}
                      onClick={() => engine.current?.category(name)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              <span className="position-count" aria-hidden="true">
                {numberLabel(b.number)}
                <i /> {books.length}
              </span>
            </div>
            <div className="fit">
              <div className="track">
                <div className="stage">{solids}</div>
              </div>
            </div>
            <div
              className="current-book"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <strong>{b.title}</strong>
              <span>{b.authors.join(", ")}</span>
            </div>
            <div className="controls">
              <button
                aria-label="Poprzednia książka"
                onClick={() => engine.current?.relative(-1)}
              >
                <Arrow next={false} />
              </button>
              <button
                className="open-current"
                onClick={() => engine.current?.openCurrent()}
              >
                Otwórz książkę
              </button>
              <button
                aria-label="Następna książka"
                onClick={() => engine.current?.relative(1)}
              >
                <Arrow next />
              </button>
            </div>
          </section>
        </main>
      </div>
      <div className="shelf-cursor" aria-hidden="true">
        <i />
        <b />
        <span>Otwórz</span>
      </div>
      {detail !== null && (
        <Details
          key={books[detail].id}
          book={books[detail]}
          onClose={() => engine.current?.close()}
        />
      )}
    </div>
  );
}
