// tests/profile.test.js
const axios = require('axios');
const http = require('http');

const app = require('../server.js');
const baseURL = 'http://localhost:3000';

// 在测试开始前启动 Express 服务器
let server;
beforeAll(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(3000, resolve));
});

// 在测试结束后关闭服务器
afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

// 定义一个辅助函数，用于清空文件中的数据
const clearProfiles = async () => {
  const profiles = await axios.get(`${baseURL}/profiles`);
  for (const profile of profiles.data) {
    await axios.delete(`${baseURL}/profiles/${profile.name}`);
  }
};

describe('Profile API', () => {
  beforeEach(async () => {
    // 在每个测试用例执行前清空数据
    await clearProfiles();
  });

  test('GET /profiles should return an empty array', async () => {
    const response = await axios.get(`${baseURL}/profiles`);
    expect(response.data).toEqual([]);
  });

  test('POST /profiles should create a new profile', async () => {
    const newProfile = {
      name: 'Spoken English Coach',
      icon: 'fas fa-comment',
      displayName: 'Spoken English Coach',
      prompt: 'I want you to act as a spoken English teacher and improver.',
      tts: 'enabled',
    };
    const response = await axios.post(`${baseURL}/profiles`, newProfile);
    expect(response.data).toEqual(newProfile);

    const profiles = await axios.get(`${baseURL}/profiles`);
    expect(profiles.data).toContainEqual(newProfile);
  });

  test('PUT /profiles/:name should update an existing profile', async () => {
    const newProfile = {
      name: 'Spoken English Coach',
      icon: 'fas fa-comment',
      displayName: 'Spoken English Coach',
      prompt: 'I want you to act as a spoken English teacher and improver.',
      tts: 'enabled',
    };
    const updatedProfile = {
      name: 'Spoken English Coach',
      icon: 'fas fa-comment',
      displayName: 'Advanced Spoken English Coach',
      prompt: 'I want you to act as an advanced spoken English teacher and improver.',
      tts: 'enabled',
    };
    await axios.post(`${baseURL}/profiles`, newProfile);
    await axios.put(`${baseURL}/profiles/${newProfile.name}`, updatedProfile);

    const profiles = await axios.get(`${baseURL}/profiles`);
    expect(profiles.data).toContainEqual(updatedProfile);
  });

  test('DELETE /profiles/:name should delete an existing profile', async () => {
    const newProfile = {
      name: 'Spoken English Coach',
      icon: 'fas fa-comment',
      displayName: 'Spoken English Coach',
      prompt: 'I want you to act as a spoken English teacher and improver.',
      tts: 'enabled',
    };
    await axios.post(`${baseURL}/profiles`, newProfile);
    await axios.delete(`${baseURL}/profiles/${newProfile.name}`);

    const profiles = await axios.get(`${baseURL}/profiles`);
    expect(profiles.data).not.toContainEqual(newProfile);
  });
});