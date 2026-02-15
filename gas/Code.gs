const PROPERTIES = PropertiesService.getScriptProperties();
const PDF_FOLDER_ID = PROPERTIES.getProperty('PDF_FOLDER_ID');
const API_KEY = PROPERTIES.getProperty('API_KEY');

function doGet(e) {
  try {
    if (!API_KEY || e.parameter.apiKey !== API_KEY) {
      return createResponse({ error: 'Unauthorized' });
    }
    const fileId = e.parameter.fileId;
    if (!fileId) {
      return createResponse({ error: 'fileId is required' });
    }
    const file = DriveApp.getFileById(fileId);
    const blob = file.getBlob();
    const base64 = Utilities.base64Encode(blob.getBytes());
    return createResponse({
      success: true,
      fileName: file.getName(),
      mimeType: blob.getContentType(),
      data: base64
    });
  } catch (error) {
    return createResponse({ error: error.message });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // API Key Validation
    if (!API_KEY || data.apiKey !== API_KEY) {
      return createResponse({ error: 'Unauthorized' });
    }

    // Email Sending Feature
    if (data.action === 'send_email') {
      const { to, subject, body } = data;
      if (!to || !subject || !body) {
        return createResponse({ error: 'Missing email parameters' });
      }
      
      // Basic email validation
      if (!to.includes('@')) {
         return createResponse({ error: 'Invalid email address' });
      }

      MailApp.sendEmail({
        to: to,
        subject: subject,
        body: body
      });
      return createResponse({ success: true, message: 'Email sent' });
    }

    // PDF Upload Feature
    if (!PDF_FOLDER_ID) {
      return createResponse({ error: 'Server configuration error: PDF_FOLDER_ID not set' });
    }

    const { fileName, fileData, mimeType = 'application/pdf' } = data;
    if (!fileName || !fileData) {
      return createResponse({ error: 'fileName and fileData are required' });
    }
    const decoded = Utilities.base64Decode(fileData);
    const blob = Utilities.newBlob(decoded, mimeType, fileName);
    const folder = DriveApp.getFolderById(PDF_FOLDER_ID);
    const file = folder.createFile(blob);
    
    // Set permission to allow access via script but keep private in Drive
    // Note: 'createFile' inherits folder permissions usually, but we ensure it's private if needed.
    // For this app, the script accesses it via ID, so strict privacy is fine.
    file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    
    return createResponse({
      success: true,
      fileId: file.getId(),
      fileName: file.getName()
    });
  } catch (error) {
    return createResponse({ error: error.toString() });
  }
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
