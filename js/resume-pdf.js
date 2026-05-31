"use strict";
/* ============================================================
   RÉSUMÉ PDF UPLOAD
   ------------------------------------------------------------
   Lets the player upload a résumé PDF instead of pasting text. The PDF is read
   entirely IN THE BROWSER with Mozilla's PDF.js (lazy-loaded from a CDN only
   when first used), the text layer is extracted, and it's dropped into the
   #resumeInput textarea — still editable, and it flows into the same
   question-generation logic (gemini.js reads RESUME_CTX from that textarea).

   No server involved, so this works regardless of any hosting/key setup.
   Degrades gracefully: if PDF.js can't load (offline/blocked) or the PDF is a
   scanned image with no text layer, it tells the user to paste instead.
   ============================================================ */

const PDFJS_SRC    = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
const PDFJS_WORKER = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
const PDF_MAX_PAGES = 20;   // safety cap

/* lazy-load PDF.js once, on first upload */
let _pdfjsPromise = null;
function ensurePdfJs(){
  if(typeof window !== "undefined" && window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if(_pdfjsPromise) return _pdfjsPromise;
  _pdfjsPromise = new Promise(function(resolve, reject){
    const s = document.createElement("script");
    s.src = PDFJS_SRC; s.async = true;
    s.onload = function(){
      if(window.pdfjsLib){
        try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; } catch(e){}
        resolve(window.pdfjsLib);
      } else {
        reject(new Error("pdf.js loaded but pdfjsLib is missing"));
      }
    };
    s.onerror = function(){ reject(new Error("couldn't load the PDF reader (offline or blocked)")); };
    document.head.appendChild(s);
  });
  return _pdfjsPromise;
}

/* read a File -> plain text (text layer only) */
async function extractPdfText(file){
  const pdfjsLib = await ensurePdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const pages = [];
  const max = Math.min(pdf.numPages, PDF_MAX_PAGES);
  for(let p = 1; p <= max; p++){
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    pages.push(tc.items.map(function(it){ return it.str; }).join(" "));
  }
  return pages.join("\n")
              .replace(/[ \t]+/g, " ")
              .replace(/\n{3,}/g, "\n\n")
              .trim();
}

function _pdfStatus(el, msg, cls){
  if(el){ el.textContent = msg; el.className = "resumePdfStatus" + (cls ? " " + cls : ""); }
}

function resumePdfInit(){
  const input  = document.getElementById("resumePdfInput");
  const status = document.getElementById("resumePdfStatus");
  const ta     = document.getElementById("resumeInput");
  const label  = document.getElementById("resumePdfLabel");
  if(!input || !ta) return;

  input.addEventListener("change", async function(){
    const file = input.files && input.files[0];
    if(!file) return;
    const looksPdf = (file.type && file.type.indexOf("pdf") !== -1) || /\.pdf$/i.test(file.name);
    if(!looksPdf){ _pdfStatus(status, "Please choose a PDF file.", "bad"); input.value = ""; return; }

    _pdfStatus(status, "Reading “" + file.name + "”…", "");
    if(label) label.style.opacity = "0.6";
    try {
      const text = await extractPdfText(file);
      if(!text || text.length < 20){
        _pdfStatus(status, "Couldn't find selectable text — is it a scanned image? Paste your résumé below instead.", "bad");
      } else {
        ta.value = text;
        // reuse gemini.js's input handler to populate RESUME_CTX + localStorage
        ta.dispatchEvent(new Event("input", { bubbles: true }));
        const n = text.length.toLocaleString();
        _pdfStatus(status, "✓ Loaded " + n + " characters from “" + file.name + "”. Edit below if needed.", "ok");
      }
    } catch(e){
      _pdfStatus(status, "Couldn't read the PDF (" + ((e && e.message) || e) + "). Paste the text below instead.", "bad");
    } finally {
      if(label) label.style.opacity = "";
      input.value = "";   // let the same file be re-selected
    }
  });
}

document.addEventListener("DOMContentLoaded", resumePdfInit);
if(document.readyState !== "loading") resumePdfInit();

/* harmless in the browser (no `module`); enables unit testing under Node */
if(typeof module !== "undefined" && module.exports){
  module.exports = { extractPdfText: extractPdfText, ensurePdfJs: ensurePdfJs };
}
