const { config } = require('../../config');

const HOST = config.HOST;

const requestSignature = ({
  requestedBy,
  documentName,
  message,
  url,
  emailTitle,
}) => {
  return `
  <html>

<head>
    <link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet">
    <style>
        p,
        h1,
        h2,
        h3,
        h4 {
            font-family: 'Roboto', Verdana, Helvetica, sans-serif !important;
        }

        * {
            font-family: 'Roboto', Verdana, Helvetica, sans-serif !important;
        }
    </style>
</head>

<body>
    <div style="width: 100%;margin:0;font-family: 'Roboto', Verdana, Helvetica, sans-serif !important;">
        <center style="table-layout:fixed;background-color:rgba(230,233,239,0.5);padding:60px 12px;">
            <table width="100%" style="margin:0 auto;width:100%;max-width:600px;border-spacing:0;font-family:'Times New Roman',Times,serif;color:black">
                <tbody>
                    <tr>
                        <td style="padding:0">
                            <table style="border-spacing:0;width:100%;text-align:center">
                                <tbody>
                                    <tr>
                                        <td style="padding:0">
                                            <img src="${HOST}/email-icons/logo.png" alt="logo" style="border:0" class="CToWUd" data-bit="iit">
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <table style="border-spacing:0;width:100%;text-align:center">
                                <tbody>
                                    <tr>
                                        <td style="padding:0;padding-top:14px">
                                            <img src="${HOST}/email-icons/signature.png" alt="signature icon" style="border:0" class="CToWUd" data-bit="iit">
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:0;width:100%;text-align:center">
                            <p style="font-size:32px;text-align:center">
                                Your signature has been requested!
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0;width:100%;text-align:center">
                            <p>
                                ${requestedBy.name} (<span style="color:#0073ea">${requestedBy.email}</span>) has requested a signature.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0;width:100%;text-align:center;padding-top:32px">
                            <a href="${url}" rel="nofollow noopener noreferrer" style="background-color:#0073ea;padding:12px 24px;font-weight:400;font-size:16px;line-height:24px;border-radius:4px;text-decoration:none;color:white">Review &amp; Sign</a>
                        </td>
                    </tr>
                </tbody>
            </table>
        </center>
        <center style="background-color:white;table-layout:fixed;padding:60px 12px">
            <table style="border-spacing:0">
                <tbody>
                    <tr>
                        <td style="padding:0;color:#000;font-weight:400;font-size:16px">${emailTitle}</td>
                    </tr>
                    <tr>
                        <td style="padding:0;color:#000">Document: ${documentName}</td>
                    </tr>
                    <tr>
                        <td style="padding:0;color:#000">Message from ${requestedBy.name}: ${message}</td>
                    </tr>
                </tbody>
            </table>
        </center>
    </div>
</body>

</html>`;
};

const sendReminder = ({ requestedBy, documentName, message, url }) => {
  return `
  <html>

  <head>
      <link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet">
      <style>
          p,
          h1,
          h2,
          h3,
          h4 {
              font-family: 'Roboto', Verdana, Helvetica, sans-serif !important;
          }
  
          * {
              font-family: 'Roboto', Verdana, Helvetica, sans-serif !important;
          }
      </style>
  </head>
  
  <body>
      <div style="width: 100%;margin:0;  font-family: 'Roboto', Verdana, Helvetica, sans-serif !important;">
          <center style="table-layout:fixed;background-color:rgba(230,233,239,0.5);padding:60px 12px;">
              <table width="100%" style="margin:0 auto;width:100%;max-width:600px;border-spacing:0;font-family:'Times New Roman',Times,serif;color:black">
                  <tbody>
                      <tr>
                          <td style="padding:0">
                              <table style="border-spacing:0;width:100%;text-align:center">
                                  <tbody>
                                      <tr>
                                          <td style="padding:0">
                                              <img src="${HOST}/email-icons/logo.png" alt="logo" style="border:0" class="CToWUd" data-bit="iit">
                                          </td>
                                      </tr>
                                  </tbody>
                              </table>
                              <table style="border-spacing:0;width:100%;text-align:center">
                                  <tbody>
                                      <tr>
                                          <td style="padding:0;padding-top:14px">
                                              <img src="${HOST}/email-icons/remainder.png" alt="remainder" style="border:0" class="CToWUd" data-bit="iit">
                                          </td>
                                      </tr>
                                  </tbody>
                              </table>
                          </td>
                      </tr>
  
                      <tr>
                          <td style="padding:0;width:100%;text-align:center">
                              <p style="font-size:32px;text-align:center">
                                  Reminder Sent!
                              </p>
                          </td>
                      </tr>
                      <tr>
                          <td style="padding:0;width:100%;text-align:center">
                              <p>
                                  ${requestedBy.name} (<span style="color:#0073ea"><a href="${requestedBy.email}" target="_blank">${requestedBy.email}</a></span>) has requested a signature.
                              </p>
                          </td>
                      </tr>
                      <tr>
                          <td style="padding:0;width:100%;text-align:center;padding-top:32px">
                              <a href="${url}" rel="nofollow noopener noreferrer" style="background-color:#0073ea;padding:12px 24px;font-weight:400;font-size:16px;line-height:24px;border-radius:4px;text-decoration:none;color:white">Review &amp; Sign</a>
                          </td>
                      </tr>
                  </tbody>
              </table>
          </center>
          <center style="background-color:white;table-layout:fixed;padding:60px 12px">
              <table style="border-spacing:0">
                  <tbody>
                      <tr>
                          <td style="padding:0;color:#000">Document: ${documentName}</td>
                      </tr>
                      <tr>
                          <td style="padding:0;color:#000">Message from ${requestedBy.name}: ${message}</td>
                      </tr>
                  </tbody>
              </table>
          </center>
      </div>
  </body>
  
  </html>`;
};

const signedDocument = ({ documentName, url }) => {
  return `
  <html>

<head>
    <link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet">
    <style>
        p,
        h1,
        h2,
        h3,
        h4 {
            font-family: 'Roboto', Verdana, Helvetica, sans-serif !important;
        }

        * {
            font-family: 'Roboto', Verdana, Helvetica, sans-serif !important;
        }
    </style>
</head>

<body>
    <div style="margin:0;width:100%;font-family: 'Roboto', Verdana, Helvetica, sans-serif !important;  ">
        <center style="table-layout:fixed;padding:60px 12px">
            <table width="100%" style="margin:0 auto;width:100%;max-width:600px;border-spacing:0;font-family:'Times New Roman',Times,serif;color:black">
                <tbody>
                    <tr>
                        <td style="padding:0">
                            <table style="border-spacing:0;width:100%;text-align:center">
                                <tbody>
                                    <tr>
                                        <td style="padding:0">
                                            <img src="${HOST}/email-icons/logo.png" alt="logo" style="border:0" class="CToWUd" data-bit="iit">
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <table style="border-spacing:0;width:100%;text-align:center">
                                <tbody>
                                    <tr>
                                        <td style="padding:0;padding-top:14px">
                                            <img src="${HOST}/email-icons/signed.png" alt="signed" style="border:0" class="CToWUd" data-bit="iit" jslog="138226; u014N:xr6bB; 53:W2ZhbHNlLDJd">
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>

                    <tr style="width:50%">
                        <td style="padding:0;width:100%;text-align:center">
                            <p style="font-size:32px;text-align:center">
                                You have successfully signed your document!
                            </p>
                        </td>
                    </tr>
                    <tr style="width:50%">
                        <td style="padding:0;color:#000">Document: ${documentName}</td>
                    </tr>
                    <tr>
                        <td style="padding:0;color:#000">You can view the document as an attachment below (if it's under 25 MB) or by clicking this link. </td>
                    </tr>
                    <tr>
                        <td style="padding:0;width:100%;text-align:center;padding-top:32px">
                            <a href="${url}" rel="nofollow noopener noreferrer" style="background-color:#0073ea;padding:12px 24px;font-weight:400;font-size:16px;line-height:24px;border-radius:4px;text-decoration:none;color:white">View Signed Document</a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0;color:#d83a52;padding-top:60px">Warning: To prevent others from accessing your document, please do not forward this email. </td>
                    </tr>
                    <tr>
                        <td style="padding:0;color:#000;padding-top:60px">Thanks,</td>
                    </tr>
                    <tr>
                        <td style="padding:0;color:#000">GetSign Team</td>
                    </tr>
                </tbody>
            </table>
        </center>
        <div class="yj6qo"></div>
        <div class="adL">
        </div>
    </div>
</body>

</html>
  `;
};

const emailVerification = (url) => {
  return `
  <!DOCTYPE html>
  <html
    xmlns="http://www.w3.org/1999/xhtml"
    xmlns:v="urn:schemas-microsoft-com:vml"
    xmlns:o="urn:schemas-microsoft-com:office:office"
  >
    <head>
      <!-- NAME: 1:2 COLUMN - FULL WIDTH -->
      <!--[if gte mso 15]>
        <xml>
          <o:OfficeDocumentSettings>
            <o:AllowPNG />
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      <![endif]-->
      <meta charset="UTF-8" />
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Verify your email address</title>
  
      <style type="text/css">
        p {
          margin: 10px 0;
          padding: 0;
        }
        table {
          border-collapse: collapse;
        }
        h1,
        h2,
        h3,
        h4,
        h5,
        h6 {
          display: block;
          margin: 0;
          padding: 0;
        }
        img,
        a img {
          border: 0;
          height: auto;
          outline: none;
          text-decoration: none;
        }
        body,
        #bodyTable,
        #bodyCell {
          height: 100%;
          margin: 0;
          padding: 0;
          width: 100%;
        }
        .mcnPreviewText {
          display: none !important;
        }
        #outlook a {
          padding: 0;
        }
        img {
          -ms-interpolation-mode: bicubic;
        }
        table {
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
        }
        .ReadMsgBody {
          width: 100%;
        }
        .ExternalClass {
          width: 100%;
        }
        p,
        a,
        li,
        td,
        blockquote {
          mso-line-height-rule: exactly;
        }
        a[href^='tel'],
        a[href^='sms'] {
          color: inherit;
          cursor: default;
          text-decoration: none;
        }
        p,
        a,
        li,
        td,
        body,
        table,
        blockquote {
          -ms-text-size-adjust: 100%;
          -webkit-text-size-adjust: 100%;
        }
        .ExternalClass,
        .ExternalClass p,
        .ExternalClass td,
        .ExternalClass div,
        .ExternalClass span,
        .ExternalClass font {
          line-height: 100%;
        }
        a[x-apple-data-detectors] {
          color: inherit !important;
          text-decoration: none !important;
          font-size: inherit !important;
          font-family: inherit !important;
          font-weight: inherit !important;
          line-height: inherit !important;
        }
        .templateContainer {
          max-width: 600px !important;
        }
        a.mcnButton {
          display: block;
        }
        .mcnImage,
        .mcnRetinaImage {
          vertical-align: bottom;
        }
        .mcnTextContent {
          word-break: break-word;
        }
        .mcnTextContent img {
          height: auto !important;
        }
        .mcnDividerBlock {
          table-layout: fixed !important;
        }
        /*
      @tab Page
      @section Background Style
      @tip Set the background color and top border for your email. You may want to choose colors that match your company's branding.
      */
        body,
        #bodyTable {
          /*@editable*/
          background-color: #fafafa;
        }
        /*
      @tab Page
      @section Background Style
      @tip Set the background color and top border for your email. You may want to choose colors that match your company's branding.
      */
        #bodyCell {
          /*@editable*/
          border-top: 0;
        }
        /*
      @tab Page
      @section Heading 1
      @tip Set the styling for all first-level headings in your emails. These should be the largest of your headings.
      @style heading 1
      */
        h1 {
          /*@editable*/
          color: #202020;
          /*@editable*/
          font-family: 'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          /*@editable*/
          font-size: 26px;
          /*@editable*/
          font-style: normal;
          /*@editable*/
          font-weight: bold;
          /*@editable*/
          line-height: 125%;
          /*@editable*/
          letter-spacing: normal;
          /*@editable*/
          text-align: left;
        }
        /*
      @tab Page
      @section Heading 2
      @tip Set the styling for all second-level headings in your emails.
      @style heading 2
      */
        h2 {
          /*@editable*/
          color: #202020;
          /*@editable*/
          font-family: Helvetica;
          /*@editable*/
          font-size: 22px;
          /*@editable*/
          font-style: normal;
          /*@editable*/
          font-weight: bold;
          /*@editable*/
          line-height: 125%;
          /*@editable*/
          letter-spacing: normal;
          /*@editable*/
          text-align: left;
        }
        /*
      @tab Page
      @section Heading 3
      @tip Set the styling for all third-level headings in your emails.
      @style heading 3
      */
        h3 {
          /*@editable*/
          color: #202020;
          /*@editable*/
          font-family: Helvetica;
          /*@editable*/
          font-size: 20px;
          /*@editable*/
          font-style: normal;
          /*@editable*/
          font-weight: bold;
          /*@editable*/
          line-height: 125%;
          /*@editable*/
          letter-spacing: normal;
          /*@editable*/
          text-align: left;
        }
        /*
      @tab Page
      @section Heading 4
      @tip Set the styling for all fourth-level headings in your emails. These should be the smallest of your headings.
      @style heading 4
      */
        h4 {
          /*@editable*/
          color: #202020;
          /*@editable*/
          font-family: Helvetica;
          /*@editable*/
          font-size: 18px;
          /*@editable*/
          font-style: normal;
          /*@editable*/
          font-weight: bold;
          /*@editable*/
          line-height: 125%;
          /*@editable*/
          letter-spacing: normal;
          /*@editable*/
          text-align: left;
        }
        /*
      @tab Header
      @section Header Style
      @tip Set the background color and borders for your email's header area.
      */
        #templateHeader {
          /*@editable*/
          background-color: #ffffff;
          /*@editable*/
          background-image: none;
          /*@editable*/
          background-repeat: no-repeat;
          /*@editable*/
          background-position: center;
          /*@editable*/
          background-size: cover;
          /*@editable*/
          border-top: 0;
          /*@editable*/
          border-bottom: 0;
          /*@editable*/
          padding-top: 9px;
          /*@editable*/
          padding-bottom: 0;
        }
        /*
      @tab Header
      @section Header Text
      @tip Set the styling for your email's header text. Choose a size and color that is easy to read.
      */
        #templateHeader .mcnTextContent,
        #templateHeader .mcnTextContent p {
          /*@editable*/
          color: #202020;
          /*@editable*/
          font-family: Helvetica;
          /*@editable*/
          font-size: 16px;
          /*@editable*/
          line-height: 150%;
          /*@editable*/
          text-align: left;
        }
        /*
      @tab Header
      @section Header Link
      @tip Set the styling for your email's header links. Choose a color that helps them stand out from your text.
      */
        #templateHeader .mcnTextContent a,
        #templateHeader .mcnTextContent p a {
          /*@editable*/
          color: #007c89;
          /*@editable*/
          font-weight: normal;
          /*@editable*/
          text-decoration: underline;
        }
        /*
      @tab Body
      @section Body Style
      @tip Set the background color and borders for your email's body area.
      */
        #templateBody {
          /*@editable*/
          background-color: #ffffff;
          /*@editable*/
          background-image: none;
          /*@editable*/
          background-repeat: no-repeat;
          /*@editable*/
          background-position: center;
          /*@editable*/
          background-size: cover;
          /*@editable*/
          border-top: 0;
          /*@editable*/
          border-bottom: 0;
          /*@editable*/
          padding-top: 0;
          /*@editable*/
          padding-bottom: 0;
        }
        /*
      @tab Body
      @section Body Text
      @tip Set the styling for your email's body text. Choose a size and color that is easy to read.
      */
        #templateBody .mcnTextContent,
        #templateBody .mcnTextContent p {
          /*@editable*/
          color: #202020;
          /*@editable*/
          font-family: Helvetica;
          /*@editable*/
          font-size: 16px;
          /*@editable*/
          line-height: 150%;
          /*@editable*/
          text-align: left;
        }
        /*
      @tab Body
      @section Body Link
      @tip Set the styling for your email's body links. Choose a color that helps them stand out from your text.
      */
        #templateBody .mcnTextContent a,
        #templateBody .mcnTextContent p a {
          /*@editable*/
          color: #007c89;
          /*@editable*/
          font-weight: normal;
          /*@editable*/
          text-decoration: underline;
        }
        /*
      @tab Columns
      @section Column Style
      @tip Set the background color and borders for your email's columns.
      */
        #templateColumns {
          /*@editable*/
          background-color: #ffffff;
          /*@editable*/
          background-image: none;
          /*@editable*/
          background-repeat: no-repeat;
          /*@editable*/
          background-position: center;
          /*@editable*/
          background-size: cover;
          /*@editable*/
          border-top: 0;
          /*@editable*/
          padding-top: 0;
          /*@editable*/
          padding-bottom: 9px;
        }
        /*
      @tab Columns
      @section Column Text
      @tip Set the styling for your email's column text. Choose a size and color that is easy to read.
      */
        #templateColumns .columnContainer .mcnTextContent,
        #templateColumns .columnContainer .mcnTextContent p {
          /*@editable*/
          color: #202020;
          /*@editable*/
          font-family: Helvetica;
          /*@editable*/
          font-size: 16px;
          /*@editable*/
          line-height: 150%;
          /*@editable*/
          text-align: left;
        }
        /*
      @tab Columns
      @section Column Link
      @tip Set the styling for your email's column links. Choose a color that helps them stand out from your text.
      */
        #templateColumns .columnContainer .mcnTextContent a,
        #templateColumns .columnContainer .mcnTextContent p a {
          /*@editable*/
          color: #007c89;
          /*@editable*/
          font-weight: normal;
          /*@editable*/
          text-decoration: underline;
        }
  
        @media only screen and (min-width: 768px) {
          .templateContainer {
            width: 600px !important;
          }
        }
        @media only screen and (max-width: 480px) {
          body,
          table,
          td,
          p,
          a,
          li,
          blockquote {
            -webkit-text-size-adjust: none !important;
          }
        }
        @media only screen and (max-width: 480px) {
          body {
            width: 100% !important;
            min-width: 100% !important;
          }
        }
        @media only screen and (max-width: 480px) {
          .columnWrapper {
            max-width: 100% !important;
            width: 100% !important;
          }
        }
        @media only screen and (max-width: 480px) {
          .mcnRetinaImage {
            max-width: 100% !important;
          }
        }
        @media only screen and (max-width: 480px) {
          .mcnImage {
            width: 100% !important;
          }
        }
        @media only screen and (max-width: 480px) {
          .mcnCartContainer,
          .mcnCaptionTopContent,
          .mcnRecContentContainer,
          .mcnCaptionBottomContent,
          .mcnTextContentContainer,
          .mcnBoxedTextContentContainer,
          .mcnImageGroupContentContainer,
          .mcnCaptionLeftTextContentContainer,
          .mcnCaptionRightTextContentContainer,
          .mcnCaptionLeftImageContentContainer,
          .mcnCaptionRightImageContentContainer,
          .mcnImageCardLeftTextContentContainer,
          .mcnImageCardRightTextContentContainer,
          .mcnImageCardLeftImageContentContainer,
          .mcnImageCardRightImageContentContainer {
            max-width: 100% !important;
            width: 100% !important;
          }
        }
        @media only screen and (max-width: 480px) {
          .mcnBoxedTextContentContainer {
            min-width: 100% !important;
          }
        }
        @media only screen and (max-width: 480px) {
          .mcnImageGroupContent {
            padding: 9px !important;
          }
        }
        @media only screen and (max-width: 480px) {
          .mcnCaptionLeftContentOuter .mcnTextContent,
          .mcnCaptionRightContentOuter .mcnTextContent {
            padding-top: 9px !important;
          }
        }
        @media only screen and (max-width: 480px) {
          .mcnImageCardTopImageContent,
          .mcnCaptionBottomContent:last-child .mcnCaptionBottomImageContent,
          .mcnCaptionBlockInner .mcnCaptionTopContent:last-child .mcnTextContent {
            padding-top: 18px !important;
          }
        }
        @media only screen and (max-width: 480px) {
          .mcnImageCardBottomImageContent {
            padding-bottom: 9px !important;
          }
        }
        @media only screen and (max-width: 480px) {
          .mcnImageGroupBlockInner {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
        }
        @media only screen and (max-width: 480px) {
          .mcnImageGroupBlockOuter {
            padding-top: 9px !important;
            padding-bottom: 9px !important;
          }
        }
        @media only screen and (max-width: 480px) {
          .mcnTextContent,
          .mcnBoxedTextContentColumn {
            padding-right: 18px !important;
            padding-left: 18px !important;
          }
        }
        @media only screen and (max-width: 480px) {
          .mcnImageCardLeftImageContent,
          .mcnImageCardRightImageContent {
            padding-right: 18px !important;
            padding-bottom: 0 !important;
            padding-left: 18px !important;
          }
        }
        @media only screen and (max-width: 480px) {
          .mcpreview-image-uploader {
            display: none !important;
            width: 100% !important;
          }
        }
        @media only screen and (max-width: 480px) {
          /*
      @tab Mobile Styles
      @section Heading 1
      @tip Make the first-level headings larger in size for better readability on small screens.
      */
          h1 {
            /*@editable*/
            font-size: 22px !important;
            /*@editable*/
            line-height: 125% !important;
          }
        }
        @media only screen and (max-width: 480px) {
          /*
      @tab Mobile Styles
      @section Heading 2
      @tip Make the second-level headings larger in size for better readability on small screens.
      */
          h2 {
            /*@editable*/
            font-size: 20px !important;
            /*@editable*/
            line-height: 125% !important;
          }
        }
        @media only screen and (max-width: 480px) {
          /*
      @tab Mobile Styles
      @section Heading 3
      @tip Make the third-level headings larger in size for better readability on small screens.
      */
          h3 {
            /*@editable*/
            font-size: 18px !important;
            /*@editable*/
            line-height: 125% !important;
          }
        }
        @media only screen and (max-width: 480px) {
          /*
      @tab Mobile Styles
      @section Heading 4
      @tip Make the fourth-level headings larger in size for better readability on small screens.
      */
          h4 {
            /*@editable*/
            font-size: 16px !important;
            /*@editable*/
            line-height: 150% !important;
          }
        }
        @media only screen and (max-width: 480px) {
          /*
      @tab Mobile Styles
      @section Boxed Text
      @tip Make the boxed text larger in size for better readability on small screens. We recommend a font size of at least 16px.
      */
          .mcnBoxedTextContentContainer .mcnTextContent,
          .mcnBoxedTextContentContainer .mcnTextContent p {
            /*@editable*/
            font-size: 14px !important;
            /*@editable*/
            line-height: 150% !important;
          }
        }
        @media only screen and (max-width: 480px) {
          /*
      @tab Mobile Styles
      @section Header Text
      @tip Make the header text larger in size for better readability on small screens.
      */
          #templateHeader .mcnTextContent,
          #templateHeader .mcnTextContent p {
            /*@editable*/
            font-size: 16px !important;
            /*@editable*/
            line-height: 150% !important;
          }
        }
        @media only screen and (max-width: 480px) {
          /*
      @tab Mobile Styles
      @section Body Text
      @tip Make the body text larger in size for better readability on small screens. We recommend a font size of at least 16px.
      */
          #templateBody .mcnTextContent,
          #templateBody .mcnTextContent p {
            /*@editable*/
            font-size: 16px !important;
            /*@editable*/
            line-height: 150% !important;
          }
        }
        @media only screen and (max-width: 480px) {
          /*
      @tab Mobile Styles
      @section Column Text
      @tip Make the column text larger in size for better readability on small screens. We recommend a font size of at least 16px.
      */
          #templateColumns .columnContainer .mcnTextContent,
          #templateColumns .columnContainer .mcnTextContent p {
            /*@editable*/
            font-size: 16px !important;
            /*@editable*/
            line-height: 150% !important;
          }
        }
      </style>
    </head>
    <body>
      <center>
        <table
          align="center"
          border="0"
          cellpadding="0"
          cellspacing="0"
          height="100%"
          width="100%"
          id="bodyTable"
        >
          <tr>
            <td align="center" valign="top" id="bodyCell">
              <!-- BEGIN TEMPLATE // -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" valign="top" id="templateHeader">
                    <!--[if (gte mso 9)|(IE)]>
                                      <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width:600px;">
                                      <tr>
                                      <td align="center" valign="top" width="600" style="width:600px;">
                                      <![endif]-->
                    <table
                      align="center"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      width="100%"
                      class="templateContainer"
                    >
                      <tr>
                        <td valign="top" class="headerContainer">
                          <table
                            border="0"
                            cellpadding="0"
                            cellspacing="0"
                            width="100%"
                            class="mcnImageBlock"
                            style="min-width: 100%"
                          >
                            <tbody class="mcnImageBlockOuter">
                              <tr>
                                <td
                                  valign="top"
                                  style="padding: 9px"
                                  class="mcnImageBlockInner"
                                >
                                  <table
                                    align="left"
                                    width="100%"
                                    border="0"
                                    cellpadding="0"
                                    cellspacing="0"
                                    class="mcnImageContentContainer"
                                    style="min-width: 100%"
                                  >
                                    <tbody>
                                      <tr>
                                        <td
                                          class="mcnImageContent"
                                          valign="top"
                                          style="
                                            padding-right: 9px;
                                            padding-left: 9px;
                                            padding-top: 0;
                                            padding-bottom: 0;
                                            text-align: center;
                                          "
                                        >
                                          <img
                                            align="center"
                                            alt=""
                                            src="${HOST}/email-icons/logo.png"
                                            width="112"
                                            style="
                                              max-width: 112px;
                                              padding-bottom: 0;
                                              display: inline !important;
                                              vertical-align: bottom;
                                            "
                                            class="mcnImage"
                                          />
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          <table
                            border="0"
                            cellpadding="0"
                            cellspacing="0"
                            width="100%"
                            class="mcnImageBlock"
                            style="min-width: 100%"
                          >
                            <tbody class="mcnImageBlockOuter">
                              <tr>
                                <td
                                  valign="top"
                                  style="padding: 9px"
                                  class="mcnImageBlockInner"
                                >
                                  <table
                                    align="left"
                                    width="100%"
                                    border="0"
                                    cellpadding="0"
                                    cellspacing="0"
                                    class="mcnImageContentContainer"
                                    style="min-width: 100%"
                                  >
                                    <tbody>
                                      <tr>
                                        <td
                                          class="mcnImageContent"
                                          valign="top"
                                          style="
                                            padding-right: 9px;
                                            padding-left: 9px;
                                            padding-top: 0;
                                            padding-bottom: 0;
                                            text-align: center;
                                          "
                                        >
                                          <img
                                            align="center"
                                            alt=""
                                            src="${HOST}/email-icons/verification.png"
                                            width="65"
                                            style="
                                              max-width: 65px;
                                              padding-bottom: 0;
                                              display: inline !important;
                                              vertical-align: bottom;
                                            "
                                            class="mcnImage"
                                          />
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <!--[if (gte mso 9)|(IE)]>
                                      </td>
                                      </tr>
                                      </table>
                                      <![endif]-->
                  </td>
                </tr>
                <tr>
                  <td align="center" valign="top" id="templateBody">
                    <!--[if (gte mso 9)|(IE)]>
                                      <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width:600px;">
                                      <tr>
                                      <td align="center" valign="top" width="600" style="width:600px;">
                                      <![endif]-->
                    <table
                      align="center"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      width="100%"
                      class="templateContainer"
                    >
                      <tr>
                        <td valign="top" class="bodyContainer">
                          <table
                            border="0"
                            cellpadding="0"
                            cellspacing="0"
                            width="100%"
                            class="mcnTextBlock"
                            style="min-width: 100%"
                          >
                            <tbody class="mcnTextBlockOuter">
                              <tr>
                                <td
                                  valign="top"
                                  class="mcnTextBlockInner"
                                  style="padding-top: 9px"
                                >
                                  <!--[if mso]>
                  <table align="left" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%;">
                  <tr>
                  <![endif]-->
  
                                  <!--[if mso]>
                  <td valign="top" width="600" style="width:600px;">
                  <![endif]-->
                                  <table
                                    align="left"
                                    border="0"
                                    cellpadding="0"
                                    cellspacing="0"
                                    style="max-width: 100%; min-width: 100%"
                                    width="100%"
                                    class="mcnTextContentContainer"
                                  >
                                    <tbody>
                                      <tr>
                                        <td
                                          valign="top"
                                          class="mcnTextContent"
                                          style="
                                            padding-top: 0;
                                            padding-right: 18px;
                                            padding-bottom: 9px;
                                            padding-left: 18px;
                                          "
                                        >
                                          <h1 style="text-align: center">
                                            Verify your email address
                                          </h1>
  
                                          <p style="text-align: center">
                                            Click on the button below to verify
                                            your email address and complete the
                                            document template set up
                                          </p>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                  <!--[if mso]>
                  </td>
                  <![endif]-->
  
                                  <!--[if mso]>
                  </tr>
                  </table>
                  <![endif]-->
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          <table
                            border="0"
                            cellpadding="0"
                            cellspacing="0"
                            width="100%"
                            class="mcnButtonBlock"
                            style="min-width: 100%"
                          >
                            <tbody class="mcnButtonBlockOuter">
                              <tr>
                                <td
                                  style="
                                    padding-top: 0;
                                    padding-right: 18px;
                                    padding-bottom: 18px;
                                    padding-left: 18px;
                                  "
                                  valign="top"
                                  align="center"
                                  class="mcnButtonBlockInner"
                                >
                                  <table
                                    border="0"
                                    cellpadding="0"
                                    cellspacing="0"
                                    class="mcnButtonContentContainer"
                                    style="
                                      border-collapse: separate !important;
                                      border-radius: 4px;
                                      background-color: #0073ea;
                                    "
                                  >
                                    <tbody>
                                      <tr>
                                        <td
                                          align="center"
                                          valign="middle"
                                          class="mcnButtonContent"
                                          style="
                                            font-family: Roboto, 'Helvetica Neue',
                                              Helvetica, Arial, sans-serif;
                                            font-size: 16px;
                                            padding: 16px;
                                          "
                                        >
                                          <a
                                            class="mcnButton"
                                            title="verify email address"
                                            href="${url}"
                                            target="_blank"
                                            style="
                                              font-weight: normal;
                                              letter-spacing: normal;
                                              line-height: 100%;
                                              text-align: center;
                                              text-decoration: none;
                                              color: #ffffff;
                                            "
                                            >Verify your Email</a
                                          >
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          <table
                            border="0"
                            cellpadding="0"
                            cellspacing="0"
                            width="100%"
                            class="mcnTextBlock"
                            style="min-width: 100%"
                          >
                            <tbody class="mcnTextBlockOuter">
                              <tr>
                                <td
                                  valign="top"
                                  class="mcnTextBlockInner"
                                  style="padding-top: 9px"
                                >
                                  <!--[if mso]>
                  <table align="left" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%;">
                  <tr>
                  <![endif]-->
  
                                  <!--[if mso]>
                  <td valign="top" width="600" style="width:600px;">
                  <![endif]-->
                                  <table
                                    align="left"
                                    border="0"
                                    cellpadding="0"
                                    cellspacing="0"
                                    style="max-width: 100%; min-width: 100%"
                                    width="100%"
                                    class="mcnTextContentContainer"
                                  >
                                    <tbody>
                                      <tr>
                                        <td
                                          valign="top"
                                          class="mcnTextContent"
                                          style="
                                            padding: 0px 18px 9px;
                                            color: #d83a52;
                                          "
                                        >
                                          Warning: If this verification request
                                          was not it created by you, ignore it.
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                  <!--[if mso]>
                  </td>
                  <![endif]-->
  
                                  <!--[if mso]>
                  </tr>
                  </table>
                  <![endif]-->
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <!--[if (gte mso 9)|(IE)]>
                                      </td>
                                      </tr>
                                      </table>
                                      <![endif]-->
                  </td>
                </tr>
                <tr>
                  <td align="center" valign="top" id="templateColumns">
                    <table
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      width="100%"
                      class="templateContainer"
                    >
                      <tr>
                        <td valign="top">
                          <!--[if (gte mso 9)|(IE)]>
                                                  <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width:600px;">
                                                  <tr>
                                                  <td align="center" valign="top" width="300" style="width:300px;">
                                                  <![endif]-->
                          <table
                            align="left"
                            border="0"
                            cellpadding="0"
                            cellspacing="0"
                            width="300"
                            class="columnWrapper"
                          >
                            <tr>
                              <td valign="top" class="columnContainer">
                                <table
                                  border="0"
                                  cellpadding="0"
                                  cellspacing="0"
                                  width="100%"
                                  class="mcnTextBlock"
                                  style="min-width: 100%"
                                >
                                  <tbody class="mcnTextBlockOuter">
                                    <tr>
                                      <td
                                        valign="top"
                                        class="mcnTextBlockInner"
                                        style="padding-top: 9px"
                                      >
                                        <!--[if mso]>
                  <table align="left" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%;">
                  <tr>
                  <![endif]-->
  
                                        <!--[if mso]>
                  <td valign="top" width="300" style="width:300px;">
                  <![endif]-->
                                        <table
                                          align="left"
                                          border="0"
                                          cellpadding="0"
                                          cellspacing="0"
                                          style="max-width: 100%; min-width: 100%"
                                          width="100%"
                                          class="mcnTextContentContainer"
                                        >
                                          <tbody>
                                            <tr>
                                              <td
                                                valign="top"
                                                class="mcnTextContent"
                                                style="
                                                  padding-top: 0;
                                                  padding-right: 18px;
                                                  padding-bottom: 9px;
                                                  padding-left: 18px;
                                                "
                                              >
                                                Thanks,<br />
                                                GetSign Team
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                        <!--[if mso]>
                  </td>
                  <![endif]-->
  
                                        <!--[if mso]>
                  </tr>
                  </table>
                  <![endif]-->
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </table>
                          <!--[if (gte mso 9)|(IE)]>
                                                  </td>
                                                  <td align="center" valign="top" width="300" style="width:300px;">
                                                  <![endif]-->
                          <table
                            align="left"
                            border="0"
                            cellpadding="0"
                            cellspacing="0"
                            width="300"
                            class="columnWrapper"
                          >
                            <tr>
                              <td valign="top" class="columnContainer"></td>
                            </tr>
                          </table>
                          <!--[if (gte mso 9)|(IE)]>
                                                  </td>
                                                  </tr>
                                                  </table>
                                                  <![endif]-->
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!-- // END TEMPLATE -->
            </td>
          </tr>
        </table>
      </center>
      <script
        type="text/javascript"
        src="/U3t0Px/lr/I5/aFoE/hzKKortYfYEjc/Q9D1VhXLcaaw/FB0BajANQQk/fmRjJj/9gLTw"
      ></script>
    </body>
  </html>
   
  `;
};

module.exports = {
  requestSignature,
  sendReminder,
  signedDocument,
  emailVerification,
};
