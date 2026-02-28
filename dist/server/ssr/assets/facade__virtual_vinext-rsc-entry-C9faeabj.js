import { jsxs, jsx } from "react/jsx-runtime";
import React__default, { useState, useMemo, createElement } from "react";
import { u as usePathname, g as getLayoutSegmentContext } from "../index.js";
import "../__vite_rsc_assets_manifest.js";
import "react-dom";
import "react-dom/server.edge";
import "node:async_hooks";
function PdfBrowser({ files }) {
  const [selectedFile, setSelectedFile] = useState(files[0] ?? "");
  const selectedUrl = useMemo(() => {
    if (!selectedFile) {
      return "";
    }
    return `/api/pdfs/${encodeURIComponent(selectedFile)}`;
  }, [selectedFile]);
  return /* @__PURE__ */ jsxs("div", { className: "splitLayout", children: [
    /* @__PURE__ */ jsxs("aside", { className: "leftPane", children: [
      /* @__PURE__ */ jsx("h2", { children: "Files" }),
      files.length === 0 ? /* @__PURE__ */ jsx("p", { className: "emptyText", children: "No PDF files found in app/data." }) : /* @__PURE__ */ jsx("ul", { className: "fileList", children: files.map((file) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: file === selectedFile ? "fileButton active" : "fileButton",
          onClick: () => setSelectedFile(file),
          children: file
        }
      ) }, file)) })
    ] }),
    /* @__PURE__ */ jsx("section", { className: "rightPane", "aria-label": "PDF viewer", children: selectedUrl ? /* @__PURE__ */ jsx(
      "iframe",
      {
        className: "pdfFrame",
        src: selectedUrl,
        title: selectedFile
      },
      selectedUrl
    ) : /* @__PURE__ */ jsx("p", { className: "emptyText", children: "Select a PDF file to preview it." }) })
  ] });
}
class ErrorBoundary extends React__default.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    if (error && typeof error === "object" && "digest" in error) {
      const digest = String(error.digest);
      if (digest === "NEXT_NOT_FOUND" || // legacy compat
      digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;") || digest.startsWith("NEXT_REDIRECT;")) {
        throw error;
      }
    }
    return { error };
  }
  reset = () => {
    this.setState({ error: null });
  };
  render() {
    if (this.state.error) {
      const FallbackComponent = this.props.fallback;
      return jsx(FallbackComponent, { error: this.state.error, reset: this.reset });
    }
    return this.props.children;
  }
}
class NotFoundBoundaryInner extends React__default.Component {
  constructor(props) {
    super(props);
    this.state = { notFound: false, previousPathname: props.pathname };
  }
  static getDerivedStateFromProps(props, state) {
    if (props.pathname !== state.previousPathname && state.notFound) {
      return { notFound: false, previousPathname: props.pathname };
    }
    return { notFound: state.notFound, previousPathname: props.pathname };
  }
  static getDerivedStateFromError(error) {
    if (error && typeof error === "object" && "digest" in error) {
      const digest = String(error.digest);
      if (digest === "NEXT_NOT_FOUND" || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404")) {
        return { notFound: true };
      }
    }
    throw error;
  }
  render() {
    if (this.state.notFound) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
function NotFoundBoundary({ fallback, children }) {
  const pathname = usePathname();
  return jsx(NotFoundBoundaryInner, { pathname, fallback, children });
}
function LayoutSegmentProvider({ depth, children }) {
  const ctx = getLayoutSegmentContext();
  if (!ctx) {
    return children;
  }
  return createElement(ctx.Provider, { value: depth }, children);
}
const export_f1cda7d4d39d = {
  default: PdfBrowser
};
const export_f29e6e234fea = {
  ErrorBoundary,
  NotFoundBoundary
};
const export_0deffcb8ffd7 = {
  LayoutSegmentProvider
};
export {
  export_0deffcb8ffd7,
  export_f1cda7d4d39d,
  export_f29e6e234fea
};
