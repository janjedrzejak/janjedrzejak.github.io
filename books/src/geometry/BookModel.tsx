import { memo, type CSSProperties } from "react";
import { Cover } from "../components/Cover";
import { numberLabel, type Book } from "../data/catalog";

export const BookModel = memo(function BookModel({
  book,
  slot,
  index,
}: {
  book: Book;
  slot: number;
  index: number;
}) {
  const [binding, type, band] = book.palette;
  const style = {
    "--binding": binding,
    "--lettering": type,
    "--band": band,
    "--aspect": book.aspect,
  } as CSSProperties;
  return (
    <div
      className="book-solid"
      data-slot={slot}
      data-book-index={index}
      data-book-id={book.id}
      style={style}
      aria-hidden="true"
    >
      <div className="face spine">
        <i className="spine-band">{numberLabel(book.number)}</i>
        <span className="spine-title">{book.spine}</span>
        <span className="spine-author">{book.shortAuthor}</span>
      </div>
      <div className="face cover-front">
        <Cover book={book} />
      </div>
      <div className="face back-board" />
      <div className="face page-fore" />
      <div className="face page-head" />
      <div className="face page-foot" />
    </div>
  );
});
