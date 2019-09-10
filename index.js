const { TesseractWorker } = require('tesseract.js');
const path = require('path');

const worker = new TesseractWorker({
    langPath: path.join(__dirname, '..', 'lang-data'),
});

worker
    .recognize(path.join(__dirname, 'cra.png'))
    .progress((info) => {
        console.log(info);
    })
    .then((result) => {
        console.log(result.text);
        process.exit();
    });


let PDFJS = require('pdfjs-dist');

let pathToPDF = './alice_credit_report.pdf';

let toText = Pdf2TextObj();
let onPageDone = function () { }; // don't want to do anything between pages
let onFinish = function (fullText) { console.log(fullText) };
toText.pdfToText(pathToPDF, onPageDone, onFinish);

function Pdf2TextObj() {
    let self = this;
    this.complete = 0;

    /**
     *
     * @param path Path to the pdf file.
     * @param callbackPageDone To inform the progress each time
     *        when a page is finished. The callback function's input parameters are:
     *        1) number of pages done.
     *        2) total number of pages in file.
     *        3) the `page` object itself or null.
     * @param callbackAllDone Called after all text has been collected. Input parameters:
     *        1) full text of parsed pdf.
     *
     */
    this.pdfToText = function (path, callbackPageDone, callbackAllDone) {
        // console.assert(typeof path == 'string');
        PDFJS.getDocument(path).promise.then(function (pdf) {

            let total = pdf.numPages;
            callbackPageDone(0, total, null);

            let pages = {};
            // For some (pdf?) reason these don't all come in consecutive
            // order. That's why they're stored as an object and then
            // processed one final time at the end.
            for (let pagei = 1; pagei <= total; pagei++) {
                pdf.getPage(pagei).then(function (page) {
                    let pageNumber = page.pageNumber;
                    page.getTextContent().then(function (textContent) {
                        if (null != textContent.items) {
                            let page_text = "";
                            let last_item = null;
                            for (let itemsi = 0; itemsi < textContent.items.length; itemsi++) {
                                let item = textContent.items[itemsi];
                                // I think to add whitespace properly would be more complex and
                                // would require two loops.
                                if (last_item != null && last_item.str[last_item.str.length - 1] != ' ') {
                                    let itemX = item.transform[5]
                                    let lastItemX = last_item.transform[5]
                                    let itemY = item.transform[4]
                                    let lastItemY = last_item.transform[4]
                                    if (itemX < lastItemX)
                                        page_text += "\r\n";
                                    else if (itemY != lastItemY && (last_item.str.match(/^(\s?[a-zA-Z])$|^(.+\s[a-zA-Z])$/) == null))
                                        page_text += ' ';
                                } // ends if may need to add whitespace

                                page_text += item.str;
                                last_item = item;
                            } // ends for every item of text

                            textContent != null && console.log("page " + pageNumber + " finished.") // " content: \n" + page_text);
                            pages[pageNumber] = page_text + "\n\n";
                        } // ends if has items

                        ++self.complete;

                        callbackPageDone(self.complete, total, page);


                        // If all done, put pages in order and combine all
                        // text, then pass that to the callback
                        if (self.complete == total) {
                            // Using `setTimeout()` isn't a stable way of making sure 
                            // the process has finished. Watch out for missed pages.
                            // A future version might do this with promises.
                            setTimeout(function () {
                                let full_text = "";
                                let num_pages = Object.keys(pages).length;
                                for (let pageNum = 1; pageNum <= num_pages; pageNum++)
                                    full_text += pages[pageNum];
                                callbackAllDone(full_text);
                            }, 1000);
                        }
                    }); // ends page.getTextContent().then
                }); // ends page.then
            } // ends for every page
        });
    }; // Ends pdfToText()

    return self;
}; // Ends object factory