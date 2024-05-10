// services/profile.js
const fs = require("fs-extra");
const path = require("path");
const defaultProfiles = require("../public/prompts.json");

const createProfileManager = async (dataFile) => {
    const dataFilePath = path.join(__dirname, dataFile);
    await fs.ensureFile(dataFilePath);

    const isNewFile = (await fs.readFile(dataFilePath, "utf-8")).trim() === "";
    if (isNewFile) {
        await fs.writeFile(dataFilePath, JSON.stringify(defaultProfiles, null, 2), "utf-8");
    }

    const readProfiles = async () => {
        const data = await fs.readFile(dataFilePath, "utf-8");
        return JSON.parse(data);
    };

    const writeProfiles = async (profiles) => {
        const sortedProfiles = getSortProfiles(profiles);
        const data = JSON.stringify(sortedProfiles, null, 2);
        await fs.writeFile(dataFilePath, data, "utf-8");
    };

    return { readProfiles, writeProfiles };
};

function getSortProfiles(profiles) {
    // 将具有sortedIndex的对象和没有的分开
    const withSortedIndex = profiles.filter(profile => "sortedIndex" in profile);
    const withoutSortedIndex = profiles.filter(profile => !("sortedIndex" in profile));

    // 根据sortedIndex数字值排序
    withSortedIndex.sort((a, b) => parseFloat(a.sortedIndex) - parseFloat(b.sortedIndex));

    // 重置sortedIndex为从1开始的递增序列
    let nextIndex = 1;
    withSortedIndex.forEach(profile => {
        profile.sortedIndex = nextIndex.toString();
        nextIndex++;
    });

    // 为没有sortedIndex的对象添加sortedIndex值
    withoutSortedIndex.forEach(profile => {
        profile.sortedIndex = nextIndex.toString();
        nextIndex++;
    });
  
    const sortedProfiles = [...withSortedIndex, ...withoutSortedIndex];

    // 合并两个数组并返回结果
    return sortedProfiles;
}

module.exports = createProfileManager;