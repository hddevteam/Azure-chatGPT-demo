// profile.js

const fs = require('fs-extra');
const path = require('path');
const defaultProfiles = require('./public/prompts.json');

const createProfileManager = async (dataFile) => {
  const dataFilePath = path.join(__dirname, dataFile);

  // ensure data directory exists
  const dataDirPath = path.dirname(dataFilePath);
  await fs.ensureDir(dataDirPath);

  // ensure data file exists
  await fs.ensureFile(dataFilePath);

  // if data file is empty, write default profiles
  const isNewFile = (await fs.readFile(dataFilePath, 'utf-8')).trim() === '';
  if (isNewFile) {
    await fs.writeFile(dataFilePath, JSON.stringify(defaultProfiles, null, 2), 'utf-8');
  }

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