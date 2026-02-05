export type CaretPosition = {
  top: number;
  left: number;
  lineHeight: number;
};

const STYLE_KEYS = [
  "boxSizing",
  "width",
  "height",
  "overflowX",
  "overflowY",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "fontSizeAdjust",
  "lineHeight",
  "fontFamily",
  "letterSpacing",
  "textTransform",
  "textAlign",
  "textIndent",
  "textDecoration",
  "whiteSpace",
  "wordSpacing",
  "wordWrap",
] as const;

export function getCaretPosition(
  textarea: HTMLTextAreaElement,
  position: number,
  textValue?: string,
): CaretPosition | null {
  if (!textarea) return null;
  const style = window.getComputedStyle(textarea);
  const div = document.createElement("div");

  STYLE_KEYS.forEach((key) => {
    const value = style.getPropertyValue(key);
    if (value) div.style.setProperty(key, value);
  });

  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordWrap = "break-word";
  div.style.top = "0";
  div.style.left = "-9999px";

  const value = textValue ?? textarea.value;
  const text = value.substring(0, position);
  const rest = value.substring(position) || ".";

  div.textContent = text;
  const span = document.createElement("span");
  span.textContent = rest;
  div.appendChild(span);

  document.body.appendChild(div);

  const lineHeight = parseFloat(style.lineHeight || "") || 20;
  const top = span.offsetTop - textarea.scrollTop;
  const left = span.offsetLeft - textarea.scrollLeft;

  document.body.removeChild(div);

  return { top, left, lineHeight };
}
