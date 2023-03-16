const { config } = require('../../config');

const HOST = config.HOST;

const requestSignature = ({
  requestedBy,
  documentName,
  message,
  url,
  emailTitle,
}) => {
  return `<head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<!--[if (gte mso 9)|(IE)]><!-->
<link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet">
<style>
 p, h1, h2, h3, h4 { font-family: 'Roboto', Verdana, Helvetica, sans-serif !important; }
* {
  font-family: 'Roboto', Verdana, Helvetica, sans-serif !important;  
}
</style>
  </head>
  <div style="width: 100%;margin:0;font-family: 'Roboto', Verdana, Helvetica, sans-serif !important;">
    <center style="width:100%;table-layout:fixed;background-color:rgba(230,233,239,0.5);padding:60px 12px;">
      <table width="100%" style="margin:0 auto;width:100%;max-width:600px;border-spacing:0;font-family:'Times New Roman',Times,serif;color:black">
        <tbody><tr>
          <td style="padding:0">
            <table style="border-spacing:0;width:100%;text-align:center">
              <tbody><tr>
                <td style="padding:0">
                  <img src="${HOST}/email-icons/logo.png" style="border:0" class="CToWUd" data-bit="iit">
                </td>
              </tr>
            </tbody></table>
            <table style="border-spacing:0;width:100%;text-align:center">
              <tbody><tr>
                <td style="padding:0;padding-top:14px">
                  <img src="${HOST}/email-icons/signature.png" style="border:0" class="CToWUd" data-bit="iit">
                </td>
              </tr>
            </tbody></table>
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
             ${requestedBy.name} (<span style="color:#0073ea"><a href="${requestedBy.email}" target="_blank">${requestedBy.email}</a></span>)
              has requested a signature.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0;width:100%;text-align:center;padding-top:32px">
            <a href="${url}" style="background-color:#0073ea;padding:12px 24px;font-weight:400;font-size:16px;line-height:24px;border-radius:4px;text-decoration:none;color:white">Review &amp; Sign</a>
          </td>
        </tr>
      </tbody></table>
    </center>
    <center style="background-color:white;width:100%;table-layout:fixed;padding:60px 12px">
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
      </tbody></table>
    </center>
  </div>`;
};

const sendReminder = ({ requestedBy, documentName, message, url }) => {
  return `
  <head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<!--[if (gte mso 9)|(IE)]><!-->
<link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet">
<style>
 p, h1, h2, h3, h4 { font-family: 'Roboto', Verdana, Helvetica, sans-serif !important; }
* {
  font-family: 'Roboto', Verdana, Helvetica, sans-serif !important;  
}
</style>
  </head>
  <div style="width: 100%;margin:0;  font-family: 'Roboto', Verdana, Helvetica, sans-serif !important;">
    <center style="width:100%;table-layout:fixed;background-color:rgba(230,233,239,0.5);padding:60px 12px;">
      <table width="100%" style="margin:0 auto;width:100%;max-width:600px;border-spacing:0;font-family:'Times New Roman',Times,serif;color:black">
        <tbody><tr>
          <td style="padding:0">
            <table style="border-spacing:0;width:100%;text-align:center">
              <tbody><tr>
                <td style="padding:0">
                  <img src="${HOST}/email-icons/logo.png" style="border:0" class="CToWUd" data-bit="iit">
                </td>
              </tr>
            </tbody></table>
            <table style="border-spacing:0;width:100%;text-align:center">
              <tbody><tr>
                <td style="padding:0;padding-top:14px">
                  <img src="${HOST}/email-icons/remainder.png" style="border:0" class="CToWUd" data-bit="iit">
                </td>
              </tr>
            </tbody></table>
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
             ${requestedBy.name} (<span style="color:#0073ea"><a href="${requestedBy.email}" target="_blank">${requestedBy.email}</a></span>)
              has requested a signature.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0;width:100%;text-align:center;padding-top:32px">
            <a href="${url}" style="background-color:#0073ea;padding:12px 24px;font-weight:400;font-size:16px;line-height:24px;border-radius:4px;text-decoration:none;color:white">Review &amp; Sign</a>
          </td>
        </tr>
      </tbody></table>
    </center>
    <center style="background-color:white;width:100%;table-layout:fixed;padding:60px 12px">
      <table style="border-spacing:0">
        <tbody><tr>
          <td style="padding:0;color:#000">Document: ${documentName}</td>
        </tr>
        <tr>
          <td style="padding:0;color:#000">Message from ${requestedBy.name}: ${message}</td>
        </tr>
      </tbody></table>
    </center>
  </div>`;
};

const signedDocument = ({ documentName, url }) => {
  return `
  <head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<!--[if (gte mso 9)|(IE)]><!-->
<link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet">
<style>
 p, h1, h2, h3, h4 { font-family: 'Roboto', Verdana, Helvetica, sans-serif !important; }
* {
  font-family: 'Roboto', Verdana, Helvetica, sans-serif !important;  
}
</style>
  </head>
  <div style="margin:0;width:100%;font-family: 'Roboto', Verdana, Helvetica, sans-serif !important;  ">
  <center style="width:100%;table-layout:fixed;padding:60px 12px">
    <table width="100%" style="margin:0 auto;width:100%;max-width:600px;border-spacing:0;font-family:'Times New Roman',Times,serif;color:black">
      <tbody><tr>
        <td style="padding:0">
          <table style="border-spacing:0;width:100%;text-align:center">
            <tbody><tr>
              <td style="padding:0">
                <img src="${HOST}/email-icons/logo.png" style="border:0" class="CToWUd" data-bit="iit">
              </td>
            </tr>
          </tbody></table>
          <table style="border-spacing:0;width:100%;text-align:center">
            <tbody><tr>
              <td style="padding:0;padding-top:14px">
                <img src="${HOST}/email-icons/signed.png" style="border:0" class="CToWUd" data-bit="iit" jslog="138226; u014N:xr6bB; 53:W2ZhbHNlLDJd">
              </td>
            </tr>
          </tbody></table>
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
          <a href="${url}" style="background-color:#0073ea;padding:12px 24px;font-weight:400;font-size:16px;line-height:24px;border-radius:4px;text-decoration:none;color:white">View Signed Document</a>
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
    </tbody></table>
  </center><div class="yj6qo"></div><div class="adL">
</div></div>
  `;
};

module.exports = { requestSignature, sendReminder, signedDocument };
