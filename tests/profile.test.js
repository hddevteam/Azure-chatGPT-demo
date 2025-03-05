/* eslint-disable no-undef */
const chai = require("chai");
const chaiHttp = require("chai-http");
const { app, close } = require("../server");
const expect = chai.expect;
const { 
    initProfilesTable, 
    saveProfile, 
    listProfiles, 
    deleteProfile
} = require("../services/profileTableService");

// Test username to use across tests
const TEST_USERNAME = "demo@test.com";

// Setup and cleanup functions using Azure Table Storage
async function setupCleanProfiles() {
    const tableClient = await initProfilesTable();
    const originalProfiles = await listProfiles(tableClient, TEST_USERNAME);
  
    // Delete all profiles for test user
    for (const profile of originalProfiles) {
        await deleteProfile(tableClient, TEST_USERNAME, profile.name);
    }
  
    return { tableClient, originalProfiles };
}

async function restoreProfiles(tableClient, originalProfiles) {
    // Restore the original profiles
    for (const profile of originalProfiles) {
        await saveProfile(tableClient, TEST_USERNAME, profile);
    }
}

chai.use(chaiHttp);

describe("Profile Controller", () => {
    after(() => {
        close();
    });

    describe("GET /api/prompt_repo", () => {
        it("should return the prompt repo for the test user", async () => {
            const res = await chai.request(app).get(`/api/prompt_repo?username=${TEST_USERNAME}`);
            expect(res.status).to.equal(200);
            expect(res.body).to.have.property("username").that.equals(TEST_USERNAME);
            expect(res.body).to.have.property("profiles").that.is.an("array");
        });
    });

    describe("GET /api/profiles", () => {
        it("should return the profiles for the test user", async () => {
            const res = await chai.request(app).get(`/api/profiles?username=${TEST_USERNAME}`);
            expect(res.status).to.equal(200);
            expect(res.body).to.be.an("array");
        });
    });

    describe("POST /api/profiles", () => {
        let tableClient;
        let originalProfiles;

        before(async () => {
            const setup = await setupCleanProfiles();
            tableClient = setup.tableClient;
            originalProfiles = setup.originalProfiles;
        });

        after(async () => {
            await restoreProfiles(tableClient, originalProfiles);
        });

        const newProfile = {
            name: "JavaScript Advisor",
            icon: "fab fa-js-square",
            displayName: "JavaScript Advisor",
            prompt: "假如你是一个有经验的全栈JavaScript程序员, 你会根据我的需求提供代码实现和解释",
            tts: "disabled",
            sortedIndex: "1",
        };

        it("should create a new profile for the test user", async () => {
            const res = await chai
                .request(app)
                .post(`/api/profiles?username=${TEST_USERNAME}`)
                .send(newProfile);
            expect(res.status).to.equal(201);
            expect(res.body).to.deep.equal(newProfile);
        });
    });

    describe("PUT /api/profiles/:name", () => {
        const updatedProfile = {
            name: "JavaScript Advisor",
            icon: "fab fa-js-square",
            displayName: "Updated JavaScript Advisor",
            prompt: "更新后的提示",
            tts: "enabled",
            sortedIndex: "1",
        };

        it("should update the profile for the test user", async () => {
            const res = await chai
                .request(app)
                .put(`/api/profiles/JavaScript%20Advisor?username=${TEST_USERNAME}`)
                .send(updatedProfile);
            expect(res.status).to.equal(200);
            expect(res.body).to.deep.equal(updatedProfile);
        });
    });

    describe("DELETE /api/profiles/:name", () => {
        it("should delete the profile for the test user", async () => {
            const res = await chai
                .request(app)
                .delete(`/api/profiles/JavaScript%20Advisor?username=${TEST_USERNAME}`);
            expect(res.status).to.equal(200);
            expect(res.body).to.have.property("name").that.equals("JavaScript Advisor");
        });
    });
});
