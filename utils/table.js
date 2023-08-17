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

const createTable = ({
  currentPage,
  initialXCoordinate,
  initialYCoordinate,
  tableData,
  tableWidth,
  tableSetting,
}) => {
  const tableRows = tableData.length;
  const tableCols = tableData[0].length;

  const columnWidths = Array.from({ length: tableCols }, (_, index) =>
    Math.floor(tableWidth / tableCols)
  );

  const marginY = 30;
  let defaultRowHeight = 20;
  let currentXCoordinate = initialXCoordinate;
  let currentYCoordinate = initialYCoordinate - marginY;

  for (
    let currentRowPosition = 0;
    currentRowPosition < tableRows;
    currentRowPosition++
  ) {
    for (let currentColumn = 0; currentColumn < tableCols; currentColumn++) {
      const text = tableData[currentRowPosition][currentColumn]?.value || '';
      const cellMargin = 5;

      const drawRectangleOption = {
        x: currentXCoordinate,
        y: currentYCoordinate,
        width: columnWidths[currentColumn],
        height: defaultRowHeight,
        borderColor: rgb(1, 1, 1),
        borderWidth: 0,
      };

      if (currentRowPosition === 0) {
        drawRectangleOption.color = rgb(0.4, 0.4, 0.4);
      }

      currentPage.drawRectangle({
        ...drawRectangleOption,
      });

      const textPosX = currentXCoordinate + cellMargin;
      const textPosY = currentYCoordinate + cellMargin;

      currentPage.drawText(text, {
        x: textPosX,
        y: textPosY,
        size: currentRowPosition === 0 ? 14 : 12,
        color: rgb(0, 0, 0),
      });

      currentXCoordinate = currentXCoordinate + columnWidths[currentColumn];
    }

    currentXCoordinate = initialXCoordinate;
    currentYCoordinate =
      currentYCoordinate -
      (currentRowPosition < 1 ? 1 : currentRowPosition) * defaultRowHeight;
  }
  currentYCoordinate += 20;

  currentPage.drawLine({
    start: { x: currentXCoordinate, y: currentYCoordinate },
    end: { x: currentXCoordinate + tableWidth, y: currentYCoordinate },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  currentYCoordinate -= 20;

  if (tableSetting?.tax?.checked) {
    const taxLabelXCoordinate = currentXCoordinate + 5;
    // currentPage.drawText(tableSetting?.tax?.label || 'Tax', {});

    currentPage.drawText(tableSetting?.tax?.label || 'Tax', {
      x: taxLabelXCoordinate,
      y: currentYCoordinate,
      size: 14,
      color: rgb(0, 0, 0),
    });

    const taxValue =
      tableSetting?.tax?.type === 'percentage'
        ? tableSetting?.tax?.value + '%'
        : tableSetting?.tax?.value;

    let xCoordinate = tableWidth + initialXCoordinate - 5;
    taxValue
      ?.split('')
      ?.reverse()
      ?.forEach(str => {
        currentPage.drawText(str, {
          x: xCoordinate,
          y: currentYCoordinate,
          size: 14,
          color: rgb(0, 0, 0),
        });
        xCoordinate -= 8;
      });
  }

  if (tableSetting?.sum?.checked) {
    currentYCoordinate -= 40;

    const sumLabel = (tableSetting?.sum?.label || 'Sum')?.split('')?.reverse();

    let totalSum = 0;

    for (
      let currentRowPosition = 1;
      currentRowPosition < tableRows;
      currentRowPosition++
    ) {
      for (let currentColumn = 0; currentColumn < tableCols; currentColumn++) {
        const column = tableData[currentRowPosition][currentColumn];

        if (column.id === tableSetting?.sum?.column) {
          totalSum += parseFloat(column.value);
        }
      }
    }

    if (tableSetting?.tax?.checked) {
      if (tableSetting?.tax?.type === 'percentage') {
        totalSum += (parseFloat(tableSetting?.tax?.value) / 100) * totalSum;
        console.log({ totalSum });
      } else {
        totalSum += parseFloat(tableSetting?.tax?.value);
      }
    }

    if (tableSetting?.currency?.checked) {
      totalSum =
        tableSetting?.currency?.position === 'before-the-value'
          ? '$' + totalSum
          : totalSum + '$';
    }

    let xCoordinate = tableWidth + initialXCoordinate - 5;

    totalSum
      ?.split('')
      ?.reverse()
      ?.forEach(str => {
        currentPage.drawText(str, {
          x: xCoordinate,
          y: currentYCoordinate,
          size: 14,
          color: rgb(0, 0, 0),
        });
        xCoordinate -= 8;
      });

    xCoordinate -= 16;

    sumLabel?.forEach(str => {
      currentPage.drawText(str, {
        x: xCoordinate,
        y: currentYCoordinate,
        size: 14,
        color: rgb(0, 0, 0),
      });
      xCoordinate -= 8;
    });
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
