import { makeInkField } from "./inkField";
self.onmessage = ({ data }: { data: { width: number; height: number } }) => {
  const times = makeInkField(data.width, data.height);
  self.postMessage(times, { transfer: [times.buffer] });
};
