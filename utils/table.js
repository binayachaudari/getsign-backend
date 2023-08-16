const { rgb } = require('pdf-lib');

const createTableHead = ({
  currentPage,
  header,
  xCoordinate,
  yCoordinate,
  customFont,
  fontSize,
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
  customFont,
  fontSize,
}) => {
  const { width, height } = currentPage.getSize();

  console.log({ width });

  //   const tableData = [
  //     ['Column 1', 'Column 2', 'Column 3'],
  //     ['Row 1, Cell 1', 'Row 1, Cell 2', 'Row 1, Cell 3'],
  //     ['Row 2, Cell 1', 'Row 2, Cell 2', 'Row 2, Cell 3'],
  //   ];

  const margin = 0;

  const tableTopY = height - margin - (tableData.length + 1) * 20; //

  //   const drawTable = () => {
  const tableRows = tableData.length;
  const tableCols = tableData[0].length;

  const columnWidths = Array.from({ length: tableCols }, (_, index) =>
    Math.ceil(width / tableCols)
  );

  console.log({ tableCols, columnWidths });

  const cellMargin = 5;

  for (let i = 0; i < tableRows; i++) {
    for (let j = 0; j < tableCols; j++) {
      const text = tableData[i][j]?.value || '';

      const cellTopY = tableTopY - i * 20;
      const cellLeftX =
        margin + columnWidths.slice(0, j).reduce((a, b) => a + b, 0);

      // Draw cell borders
      currentPage.drawRectangle({
        x: cellLeftX,
        y: cellTopY,
        width: columnWidths[j],
        height: 20,
        borderColor: rgb(0.3, 0.3, 0.3),
        borderWidth: 0,
      });

      // Adjust text position in the cell
      const textPosX = cellLeftX + cellMargin;
      const textPosY = cellTopY + cellMargin;

      currentPage.drawText(text, {
        x: textPosX,
        y: textPosY,
        size: 12,
        color: rgb(0, 0, 0),
      });
    }
  }
  //   };

  //   return drawTable();
};

module.exports = { createTable };
