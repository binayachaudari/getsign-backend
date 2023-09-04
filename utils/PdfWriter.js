const { rgb } = require('pdf-lib');

class PdfWriter {
  constructor(currentPage, placeholder) {
    this.currentPage = currentPage || null;
    this.placeholder = placeholder || null;
  }

  writeTextBox(
    { cellPaddingX = 0, cellPaddingY = 0, marginY = 0, marginX = 0 } = {
      cellPaddingX: 0,
      cellPaddingY: 0,
      marginY: 0,
      marginX: 0,
    }
  ) {
    const pdfFont = this.currentPage.doc?.fonts?.[0] || [];
    const fontSize = this.placeholder.fontSize || 12;

    // const marginY = 8 * 0.75;
    // const marginX = 8 * 0.75;
    const initialTextY = this.placeholder.formField.coordinates.y - marginY;
    const initialTextX = this.placeholder.formField.coordinates.x + marginX;

    const placeHolderWidth = this.placeholder.width || 50;
    let placeHolderHeight = this.placeholder.height || 18.33;

    const fontHeightAtSize = pdfFont.heightAtSize(fontSize * 0.75);
    const content = this.placeholder?.content || '';
    const lineGap = 3 * 0.75;

    let lines = [];

    const words = content?.split(/(\s+)/);
    let currentLine = 0;

    for (const word of words) {
      const currentLineText = lines[currentLine] ?? '';
      const testLine =
        currentLineText === '' ? word : `${currentLineText}${word}`;

      const width = pdfFont.widthOfTextAtSize(`${testLine}`, fontSize);

      if (width <= placeHolderWidth - cellPaddingX * 2) {
        lines[currentLine] = testLine;
      } else {
        currentLine++;
        lines[currentLine] = word;
      }
    }
    let textPosY = initialTextY - fontHeightAtSize + cellPaddingY; // This is because pdf-lib takes initial y coordinate and draws a font upward from that point. To offset this we need to sub
    let textPosX = initialTextX + cellPaddingX;

    const lineHeight = Math.floor(fontHeightAtSize);

    for (let line of lines) {
      if (placeHolderHeight >= lineHeight) {
        this.currentPage.drawText(line, {
          x: textPosX,
          y: textPosY,
          size: fontSize,
          color: rgb(0, 0, 0),
        });
        textPosY -= fontSize + lineGap;
        placeHolderHeight -= lineHeight;
      } else {
        break;
      }
    }
  }
}

module.exports = PdfWriter;
