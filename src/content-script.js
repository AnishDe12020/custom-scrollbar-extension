const css = `
::-webkit-scrollbar {
    width: 0.5rem;
}

::-webkit-scrollbar-thumb {
    background: #7d7d7d;
    border-radius: 0.25rem;
}
::-webkit-scrollbar-thumb:hover {
    background: #cacaca;
}
`;

const head = document.head || document.getElementsByTagName("head")[0];
const style = document.createElement("style");

head.appendChild(style);

style.type = "text/css";

if (style.styleSheet) {
  style.styleSheet.cssText = css;
} else {
  style.appendChild(document.createTextNode(css));
}
