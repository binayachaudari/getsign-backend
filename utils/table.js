const { rgb } = require('pdf-lib');

const createTableHead = ({
  currentPage,
  header,
  xCoordinate,
  yCoordinate,
  customFont,
  fontSize,
  tableWidth,
}) => {
  currentPage?.drawRectangle({
    x: xCoordinate,
    y: yCoordinate,
    width: header?.size || 150,
    height: 20,
    borderWidth: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
};

const TAX_TYPE = {
  percentage: 'percentage',
  fixed: 'fixed',
};

const CURRENCY_POSITION_TYPES = {
  before: 'before',
  after: 'after',
};

const CURRENCY_TYPE = {
  usd: { label: 'USD', symbol: '$' },
  aud: { label: 'AUD', symbol: 'AUD' },
  cad: { label: 'CAD', symbol: 'CAD' },
};

const calculateRowHeight = ({
  columnWidth,
  text = '',
  fontSize = 12,
  currentPage,
  cellMargin = 5,
  defaultRowHeight,
}) => {
  const words = text?.split('');
  let lines = [''];
  let currentLine = 0;

  const pdfDoc = currentPage.doc || null;
  const pdfFont = pdfDoc?.fonts?.[0] || [];

  for (const word of words) {
    const currentLineText = lines[currentLine];
    const testLine =
      currentLineText === '' ? word : `${currentLineText}${word}`;

    const width = pdfFont.widthOfTextAtSize(testLine, fontSize);

    if (width <= columnWidth - cellMargin) {
      lines[currentLine] = testLine;
    } else {
      currentLine++;
      lines[currentLine] = word;
    }
  }

  return {
    rowHeight: Math.max(lines.length * fontSize, defaultRowHeight),
    lines,
  };
};

const writeMultiplineText = ({
  currentPage,
  lines,
  initialTextX,
  initialTextY,
  fontSize,
}) => {
  let textPosY = initialTextY;
  let textPosX = initialTextX;

  for (const line of lines) {
    currentPage.drawText(line, {
      x: textPosX,
      y: textPosY,
      size: fontSize,
      color: rgb(0, 0, 0),
    });
    textPosY -= fontSize;
  }
};

const createTable = async ({
  currentPage,
  initialXCoordinate,
  initialYCoordinate,
  tableData,
  tableWidth,
  tableSetting,
}) => {
  const tableRows = tableData.length;
  const tableCols = tableData[0].length;

  const columnWidths = tableData[0]?.map(col => {
    return tableWidth * (col.size / 100);
  });

  const defaultRowHeight = 45 * 0.75;
  let currentXCoordinate = initialXCoordinate - 8;
  let currentYCoordinate = initialYCoordinate;

  for (
    let currentRowPosition = 0;
    currentRowPosition < tableRows;
    currentRowPosition++
  ) {
    let maxRowHeight = Math.max(
      defaultRowHeight,
      ...tableData[currentRowPosition].map((col, j) => {
        let textVal = col?.value || 0;
        if (currentRowPosition > 0 && col.type === 'numeric') {
          textVal = col?.formattedValue || '';
        }
        if (
          currentRowPosition > 0 &&
          col.type === 'formula' &&
          tableSetting?.currency?.checked
        ) {
          textVal = parseFloat(textVal);
          const absValue = Math.abs(textVal);
          textVal =
            tableSetting?.currency?.position?.value ===
            CURRENCY_POSITION_TYPES.before
              ? ` ${
                  String(textVal < 0 ? '-' : '') +
                  String(
                    CURRENCY_TYPE[tableSetting?.currency?.type?.value]
                      ?.symbol || ''
                  ) +
                  String(absValue)
                }`
              : `${
                  String(textVal < 0 ? '-' : '') +
                  String(absValue) +
                  String(
                    CURRENCY_TYPE[tableSetting?.currency?.type?.value]
                      ?.symbol || ''
                  )
                }`;
        }
        const { rowHeight, lines } = calculateRowHeight({
          text: textVal || '',
          currentPage,
          defaultRowHeight,
          fontSize: 12,
          columnWidth: columnWidths[j],
        });

        tableData[currentRowPosition][j].lines = lines;
        return parseFloat(rowHeight);
      })
    );

    for (let currentColumn = 0; currentColumn < tableCols; currentColumn++) {
      const cellMargin = 5;
      const lines = tableData[currentRowPosition][currentColumn]?.lines || [];

      const drawRectangleOption = {
        x: currentXCoordinate,
        y: currentYCoordinate - maxRowHeight,
        width: columnWidths[currentColumn],
        height: maxRowHeight,
        borderColor: rgb(1, 1, 1),
        borderWidth: 0,
        borderOpacity: 0,
      };

      if (currentRowPosition === 0) {
        const R = parseFloat(Number(tableSetting?.header?.rgb?.r || 0) / 255);

        const G = parseFloat(Number(tableSetting?.header?.rgb?.g || 0) / 255);

        const B = parseFloat(Number(tableSetting?.header?.rgb?.b || 0) / 255);

        if (tableSetting?.header?.checked) {
          drawRectangleOption.color = rgb(Number(R), Number(G), Number(B));
        } else {
          const defaultRGB = {
            r: 245,
            g: 246,
            b: 248,
          };

          drawRectangleOption.color = rgb(
            Number(defaultRGB.r / 255),
            Number(defaultRGB.g / 255),
            Number(defaultRGB.b / 255)
          );
        }
      }

      currentPage.drawRectangle({
        ...drawRectangleOption,
      });

      let fontHeight = currentRowPosition === 0 ? 12 : 10;
      const textPosX = currentXCoordinate + cellMargin;
      const textPosY =
        currentYCoordinate -
        maxRowHeight / (lines.length > 1 ? lines.length : 2);

      writeMultiplineText({
        currentPage,
        initialTextX: textPosX,
        initialTextY: textPosY,
        fontSize: fontHeight,
        lines,
      });

      currentXCoordinate = currentXCoordinate + columnWidths[currentColumn];
    }

    currentXCoordinate = initialXCoordinate - 8;
    currentYCoordinate -= maxRowHeight;
  }
  currentYCoordinate -= 24 * 0.75;

  if (tableSetting?.sum?.checked || tableSetting?.tax?.checked) {
    currentPage.drawLine({
      start: { x: currentXCoordinate, y: currentYCoordinate },
      end: { x: currentXCoordinate + tableWidth, y: currentYCoordinate },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
  }

  if (tableSetting?.tax?.checked) {
    currentYCoordinate -= 25 * 0.75;

    const taxLabelXCoordinate = currentXCoordinate + 5;

    currentPage.drawText(tableSetting?.tax?.label || 'Tax', {
      x: taxLabelXCoordinate,
      y: currentYCoordinate,
      size: 14,
      color: rgb(0, 0, 0),
    });

    const taxValue =
      tableSetting?.tax?.type?.value === TAX_TYPE.percentage
        ? tableSetting?.tax?.value + '%'
        : tableSetting?.tax?.value;

    let xCoordinate = tableWidth + initialXCoordinate - 25 * 0.75;
    taxValue
      ?.split('')
      ?.reverse()
      ?.forEach(str => {
        currentPage.drawText(str, {
          x: xCoordinate,
          y: currentYCoordinate,
          size: 12,
          color: rgb(0, 0, 0),
        });
        xCoordinate -= 8;
      });
  }

  if (tableSetting?.sum?.checked) {
    currentYCoordinate -= 60 * 0.75;

    const sumLabel = tableSetting?.sum?.label || 'Sum';

    let totalSum = 0;

    for (
      let currentRowPosition = 1;
      currentRowPosition < tableRows;
      currentRowPosition++
    ) {
      for (let currentColumn = 0; currentColumn < tableCols; currentColumn++) {
        const column = tableData[currentRowPosition][currentColumn];

        if (column.id === tableSetting?.sum?.column?.id) {
          totalSum += parseFloat(column.value);
        }
      }
    }

    if (tableSetting?.tax?.checked) {
      if (tableSetting?.tax?.type?.value === TAX_TYPE.percentage) {
        totalSum += (parseFloat(tableSetting?.tax?.value) / 100) * totalSum;
      } else {
        totalSum += parseFloat(tableSetting?.tax?.value);
      }
    }

    if (tableSetting?.currency?.checked) {
      totalSum =
        tableSetting?.currency?.position?.value ===
        CURRENCY_POSITION_TYPES.before
          ? `${
              CURRENCY_TYPE[tableSetting?.currency?.type?.value]?.symbol ||
              '$' + ' '
            }` + totalSum
          : totalSum +
            `${
              ' ' +
                CURRENCY_TYPE[tableSetting?.currency?.type?.value]?.symbol ||
              '$'
            }`;
    }

    let xCoordinate = tableWidth + initialXCoordinate - 25 * 0.75;

    totalSum
      .toString()
      ?.split('')
      ?.reverse()
      ?.forEach(str => {
        const pdfDoc = currentPage.doc || null;
        const pdfFont = pdfDoc?.fonts?.[pdfDoc?.fonts?.length - 1] || [];
        const width = pdfFont.widthOfTextAtSize(str, 12);

        currentPage.drawText(str, {
          x: xCoordinate,
          y: currentYCoordinate,
          size: 12,
          color: rgb(0, 0, 0),
        });
        xCoordinate -= width + 2;
      });

    xCoordinate -= 16;

    if (sumLabel) {
      const pdfDoc = currentPage.doc || null;
      const pdfFont = pdfDoc?.fonts?.[pdfDoc?.fonts?.length - 1] || [];
      const width = pdfFont.widthOfTextAtSize(sumLabel, 14);
      xCoordinate -= width;
      currentPage.drawText(sumLabel, {
        x: xCoordinate,
        y: currentYCoordinate,
        size: 14,
        color: rgb(0, 0, 0),
      });
    }
  }
};

// const createTable = ({
//   currentPage,
//   initialXCoordinate,
//   initialYCoordinate,
//   tableData,
//   customFont,
//   fontSize,
// }) => {
//   const { width, height } = currentPage.getSize();

//   console.log({ width });

//   //   const tableData = [
//   //     ['Column 1', 'Column 2', 'Column 3'],
//   //     ['Row 1, Cell 1', 'Row 1, Cell 2', 'Row 1, Cell 3'],
//   //     ['Row 2, Cell 1', 'Row 2, Cell 2', 'Row 2, Cell 3'],
//   //   ];

//   const margin = 0;

//   const tableTopY = height - margin - (tableData.length + 1) * 20; //

//   //   const drawTable = () => {
//   const tableRows = tableData.length;
//   const tableCols = tableData[0].length;

//   const columnWidths = Array.from({ length: tableCols }, (_, index) =>
//     Math.ceil(width / tableCols)
//   );

//   console.log({ tableCols, columnWidths });

//   const cellMargin = 5;

//   for (let i = 0; i < tableRows; i++) {
//     for (let j = 0; j < tableCols; j++) {
//       const text = tableData[i][j]?.value || '';

//       const cellTopY = tableTopY - i * 20;
//       const cellLeftX =
//         margin + columnWidths.slice(0, j).reduce((a, b) => a + b, 0);

//       // Draw cell borders
//       currentPage.drawRectangle({
//         x: cellLeftX,
//         y: cellTopY,
//         width: columnWidths[j],
//         height: 20,
//         borderColor: rgb(0.3, 0.3, 0.3),
//         borderWidth: 0,
//       });

//       // Adjust text position in the cell
//       const textPosX = cellLeftX + cellMargin;
//       const textPosY = cellTopY + cellMargin;

//       currentPage.drawText(text, {
//         x: textPosX,
//         y: textPosY,
//         size: 12,
//         color: rgb(0, 0, 0),
//       });
//     }
//   }
//   //   };

//   //   return drawTable();
// };

module.exports = { createTable };
