"use client";

import { useMemo, useState } from "react";

type PdfBrowserProps = {
  files: string[];
};

export default function PdfBrowser({ files }: PdfBrowserProps) {
  const [selectedFile, setSelectedFile] = useState<string>(files[0] ?? "");

  const selectedUrl = useMemo(() => {
    if (!selectedFile) {
      return "";
    }

    return `/api/pdfs/${encodeURIComponent(selectedFile)}`;
  }, [selectedFile]);

  return (
    <div className="splitLayout">
      <aside className="leftPane">
        <h2>Files</h2>
        {files.length === 0 ? (
          <p className="emptyText">No PDF files found in app/data.</p>
        ) : (
          <ul className="fileList">
            {files.map((file) => (
              <li key={file}>
                <button
                  type="button"
                  className={file === selectedFile ? "fileButton active" : "fileButton"}
                  onClick={() => setSelectedFile(file)}
                >
                  {file}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="rightPane" aria-label="PDF viewer">
        {selectedUrl ? (
          <iframe
            key={selectedUrl}
            className="pdfFrame"
            src={selectedUrl}
            title={selectedFile}
          />
        ) : (
          <p className="emptyText">Select a PDF file to preview it.</p>
        )}
      </section>
    </div>
  );
}