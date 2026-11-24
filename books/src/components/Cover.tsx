import { useState } from "react";
import { asset, type Book } from "../data/catalog";

/** Shelf images start on demand when the controller brings a book into range. */
export function loadCover(img: HTMLImageElement | null) {
  if (
    img &&
    !img.hasAttribute("src") &&
    img.dataset.status !== "failed" &&
    img.dataset.src
  ) {
    img.src = img.dataset.src;
  }
}
export function Cover({
  book,
  immediate = false,
  lazy = false,
}: {
  book: Book;
  immediate?: boolean;
  lazy?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <>
      <img
        className="cover-image"
        alt={book.cover.alt}
        draggable={false}
        decoding="async"
        referrerPolicy="no-referrer"
        loading={lazy ? "lazy" : "eager"}
        data-src={asset(book.cover.src)}
        src={immediate ? asset(book.cover.src) : undefined}
        onLoad={(e) => {
          const img = e.currentTarget;
          img.dataset.status = "loaded";
          const face = img.parentElement;
          // Paint the decoded texture on the transformed plane as well. Some
          // WebKit compositors delay invalidating a child image at rotateY(90deg).
          if (face?.classList.contains("cover-front"))
            face.style.backgroundImage = 'url("' + img.currentSrc + '")';
        }}
        onError={(e) => {
          const img = e.currentTarget;
          if (book.cover.alternative && img.dataset.retried !== "1") {
            img.dataset.retried = "1";
            img.src = asset(book.cover.alternative);
            return;
          }
          img.dataset.status = "failed";
          setFailed(true);
        }}
      />
      {!failed && (
        <span className="cover-wait" aria-hidden="true">
          Wczytywanie okładki…
        </span>
      )}
      {failed && (
        <span className="missing-cover" role="status">
          Okładka niedostępna
          <br />
          <small>
            {book.spine}
            {book.isbn && " · " + book.isbn}
          </small>
        </span>
      )}
    </>
  );
}
