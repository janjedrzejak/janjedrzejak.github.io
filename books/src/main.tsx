import { createRoot } from "react-dom/client";
import { Shelf } from "./components/Shelf";
import { pageTitle } from "./data/catalog";

document.title = pageTitle;
createRoot(document.getElementById("root")!).render(<Shelf />);
