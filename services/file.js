const FileDetails = require('../modals/FileDetails');

const addFormFields = async (id, payload) => {
  try {
    const updatedFields = await FileDetails.findByIdAndUpdate(id, {
      status: 'ready_to_sign',
      fields: [...payload],
    });

    return updatedFields;
  } catch (error) {
    throw error;
  }
};

module.exports = { addFormFields };
