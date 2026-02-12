const PDF_FOLDER_ID = 'YOUR_FOLDER_ID_HERE';
const API_KEY = 'YOUR_SECRET_API_KEY';

function doGet(e) {
  try {
    if (e.parameter.apiKey !== API_KEY) {
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
    if (data.apiKey !== API_KEY) {
      return createResponse({ error: 'Unauthorized' });
    }
    const { fileName, fileData, mimeType = 'application/pdf' } = data;
    if (!fileName || !fileData) {
      return createResponse({ error: 'fileName and fileData are required' });
    }
    const decoded = Utilities.base64Decode(fileData);
    const blob = Utilities.newBlob(decoded, mimeType, fileName);
    const folder = DriveApp.getFolderById(PDF_FOLDER_ID);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    return createResponse({
      success: true,
      fileId: file.getId(),
      fileName: file.getName()
    });
  } catch (error) {
    return createResponse({ error: error.message });
  }
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
