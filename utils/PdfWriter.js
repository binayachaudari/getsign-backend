const { rgb } = require('pdf-lib');

class PdfWriter {
  constructor(currentPage, placeholder, customFont) {
    this.currentPage = currentPage || null;
    this.placeholder = placeholder || null;
    this.customFont = customFont || this.currentPage.doc?.fonts?.[0] || null;
  }

  replaceUnsupportedChars(string) {
    const pdfFont = this.customFont || [];
    const squareSymbol = '□';

    let newStr = string?.split('');
    const charSet = pdfFont.getCharacterSet();

    for (let i = 0; i < newStr.length; i++) {
      if (!charSet.includes(newStr[i]?.charCodeAt())) {
        newStr[i] = squareSymbol;
      }
    }

    return newStr?.join('');
  }

  writeTextBox(
    { cellPaddingX = 0, cellPaddingY = 0, marginY = 0, marginX = 0 } = {
      cellPaddingX: 0,
      cellPaddingY: 0,
      marginY: 0,
      marginX: 0,
    }
  ) {
    const pdfFont = this.customFont || [];
    const fontSize = this.placeholder.fontSize ? this.placeholder.fontSize : 11;
    const initialTextY = this.placeholder.formField.coordinates.y - marginY;
    const initialTextX = this.placeholder.formField.coordinates.x + marginX;
    const content = this.placeholder?.content || '';

    const replaceUnsupportedChars = str => this.replaceUnsupportedChars(str);

    const placeHolderWidth =
      this.placeholder.width ||
      pdfFont.widthOfTextAtSize(`${content}`, fontSize);

    const fontHeightAtSize = pdfFont.heightAtSize(fontSize * 0.75);
    const lineGap = (fontHeightAtSize * 1.3 * 0.75) / 2;

    const lineHeight = Math.floor(fontHeightAtSize + lineGap);

    let placeHolderHeight =
      this.placeholder.height && this.placeholder.height >= lineHeight
        ? this.placeholder.height
        : lineHeight;

    let lines = [];
    const words = content?.split(/(\s+)/);
    let currentLine = 0;

    // for (const word of words) {

    //   if(!/\n/.exec(word)){
    //     const currentLineText = lines[currentLine] ?? '';

    //     const testLine =
    //       currentLineText === '' ? word : `${currentLineText}${word}`;
    //     const width = pdfFont.widthOfTextAtSize(`${testLine}`, fontSize);
    //     if (width <= placeHolderWidth - cellPaddingX * 2) {
    //       lines[currentLine] = testLine;
    //     } else {
    //       currentLine++;
    //       lines[currentLine] = word;
    //     }
    //   }else{
    //     let split_words = word.split("\n")

    //   }

    // }

    // function seperateLines(string, currLineIndex) {
    //   if (!string.length) return;
    //   let currLine = lines[currLineIndex] || '';
    //   let char = string[0];

    //   if (char === '\n') {
    //     lines.push('');
    //     currentLine++;
    //     seperateLines(string.slice(1), currentLine);
    //   } else {
    //     const testLine = currLine === '' ? char : `${currLine}${char}`;
    //     const width = pdfFont.widthOfTextAtSize(`${testLine}`, fontSize);
    //     if (width <= placeHolderWidth - cellPaddingX * 2) {
    //       lines[currLineIndex] = testLine;
    //       seperateLines(string.slice(1), currentLine);
    //     } else {
    //       currentLine++;
    //       lines[currentLine] = char;
    //       seperateLines(string.slice(1), currentLine);
    //     }
    //   }
    // }

    // seperateLines(content, currentLine);

    function seperateLines(string, currLineIndex) {
      if (!string.length) return;
      let currLine = lines[currLineIndex] || '';
      let char = string[0];

      if (char.includes('\n')) {
        const split_words = char.split('\n');
        lines.push('');
        currentLine += split_words.length - 1;
        seperateLines(string.slice(1), currentLine);
      } else {
        const testLine =
          currLine === ''
            ? replaceUnsupportedChars(char)
            : replaceUnsupportedChars(`${currLine}${char}`);
        const width = pdfFont.widthOfTextAtSize(`${testLine}`, fontSize);
        if (width <= placeHolderWidth - cellPaddingX * 2) {
          lines[currLineIndex] = testLine;
          seperateLines(string.slice(1), currentLine);
        } else {
          currentLine++;
          lines[currentLine] = char;
          seperateLines(string.slice(1), currentLine);
        }
      }
    }

    seperateLines(words, currentLine);

    let textPosY = initialTextY - fontHeightAtSize + cellPaddingY; // This is because pdf-lib takes initial y coordinate and draws a font upward from that point. To offset this we need to sub
    let textPosX = initialTextX + cellPaddingX;

    for (let [index, line] of lines.entries()) {
      if (placeHolderHeight >= lineHeight - 2) {
        this.currentPage.drawText(line?.trim() || '', {
          x: textPosX,
          y: textPosY,
          size: fontSize,
          color: rgb(0, 0, 0),
          font: pdfFont,
        });
        textPosY -= lineHeight - 2; // substracted 2 to fine tune what we see in PDF EDITOR and PDF Preview.
        // placeHolderHeight -= fontHeightAtSize * 1.3 * 0.75;
        placeHolderHeight -= lineHeight - 2;
      } else {
        break;
      }
    }
  }
}

module.exports = PdfWriter;
