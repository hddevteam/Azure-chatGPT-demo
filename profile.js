// profile.js
const fs = require('fs-extra');
const path = require('path');

const createProfileManager = (dataFile) => {
  const dataFilePath = path.join(__dirname, dataFile);

  const readProfiles = async () => {
    try {
      const data = await fs.readFile(dataFilePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading profiles:', error);
      return [];
    }
  };

  const writeProfiles = async (profiles) => {
    try {
      const data = JSON.stringify(profiles, null, 2);
      await fs.writeFile(dataFilePath, data, 'utf-8');
    } catch (error) {
      console.error('Error writing profiles:', error);
    }
  };

  return {
    readProfiles,
    writeProfiles,
  };
};

module.exports = createProfileManager;