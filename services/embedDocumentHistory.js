const FileDetails = require('../models/FileDetails');
const FileHistory = require('../models/FileHistory');

const STATUS_MAPPER = {
  sent: 'Sent',
  viewed: 'Viewed',
  signed_by_sender: 'Signed By Sender',
  signed_by_receiver: 'Signed By Receiver',
};

module.exports = {
  embedHistory: async (pdfDoc, fileId, itemId) => {
    const gap = 32;
    const docHistory = await FileHistory.find({ fileId, itemId }).sort({
      created_at: 'asc',
    });
    const docDetails = await FileDetails.findById(fileId);

    const page = pdfDoc.addPage();
    const { height } = page.getSize();
    const fontSize = 30;
    let currentIconPos = {
      x: 50,
      y: height - 250,
    };

    // Document Details
    page.drawText('Document Details', {
      x: 50,
      y: height - 20 - fontSize,
      size: 18,
    });

    page.drawText(`FileID: ${fileId}`, {
      x: 50,
      y: height - 50 - fontSize,
      size: 16,
    });

    page.drawText(`Filename: ${docDetails.file_name}`, {
      x: 50,
      y: height - 70 - fontSize,
      size: 16,
    });

    page.drawText(
      `Creation Date: ${new Date(docDetails.created_at).toLocaleDateString(
        'en-US'
      )}`,
      {
        x: 50,
        y: height - 90 - fontSize,
        size: 16,
      }
    );

    // Audit Trail
    page.drawText('Audit Trail', {
      x: 50,
      y: height - 150 - fontSize,
      size: 18,
    });

    const signed = await pdfDoc.embedPng(
      'data:image/png;base64,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'
    );

    const sent = await pdfDoc.embedPng(
      'data:image/png;base64,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'
    );

    const viewed = await pdfDoc.embedPng(
      'data:image/png;base64,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'
    );

    let currentDetailPos = {
      x: currentIconPos.x + signed.width + gap,
      y: height - 220,
    };

    docHistory.forEach((history) => {
      switch (history.status) {
        case 'signed_by_sender':
        case 'signed_by_receiver':
          page.drawImage(signed, {
            x: currentIconPos.x,
            y: currentIconPos.y,
          });
          break;

        case 'sent':
          page.drawImage(sent, {
            x: currentIconPos.x,
            y: currentIconPos.y,
          });
          break;

        case 'viewed':
          page.drawImage(viewed, {
            x: currentIconPos.x,
            y: currentIconPos.y,
          });
          break;
      }
      // updaing current icon pos
      currentIconPos = {
        x: currentIconPos.x,
        y: currentIconPos.y - 100,
      };

      // Adding details with icons
      page.drawText(STATUS_MAPPER[history.status], {
        x: currentDetailPos.x,
        y: currentDetailPos.y,
        size: 18,
      });

      const dateTime = `${new Date(
        history.created_at
      ).toLocaleDateString()} ${new Date(
        history.created_at
      ).toLocaleTimeString()}`
        .replace(' ', ' ')
        .toString();

      page.drawText(`${dateTime} UTC`, {
        x: currentDetailPos.x,
        y: currentDetailPos.y - 20,
        size: 14,
      });

      switch (history.status) {
        case 'viewed':
          page.drawText(`IP ${history.viewedIpAddress}`, {
            x: currentDetailPos.x,
            y: currentDetailPos.y - 40,
            size: 14,
          });
          break;

        case 'signed_by_receiver':
          page.drawText(`IP ${history.receiverSignedIpAddress}`, {
            x: currentDetailPos.x,
            y: currentDetailPos.y - 40,
            size: 14,
          });
          break;
      }

      currentDetailPos = {
        x: currentDetailPos.x,
        y: currentDetailPos.y - 100,
      };
    });

    return pdfDoc;
  },
};
