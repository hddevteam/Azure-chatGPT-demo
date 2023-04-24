/* eslint-disable no-undef */
const chai = require("chai");
const chaiHttp = require("chai-http");
const { app, close } = require("../server");
const expect = chai.expect;

const createProfileManager = require("../services/profileService.js");

async function setupCleanProfiles() {
    const manager = await createProfileManager("../.data/demo.json");
    const originalProfiles = await manager.readProfiles();
    await manager.writeProfiles([]);
    return originalProfiles;
}

async function restoreProfiles(originalProfiles) {
    const manager = await createProfileManager("../.data/demo.json");
    await manager.writeProfiles(originalProfiles);
}

chai.use(chaiHttp);

describe("Profile Controller", () => {
    after(() => {
        close();
    });

    describe("GET /api/prompt_repo", () => {
        it("should return the prompt repo for the demo user", async () => {
            const res = await chai.request(app).get("/api/prompt_repo?username=demo");
            expect(res.status).to.equal(200);
            expect(res.body).to.have.property("username").that.equals("demo");
            expect(res.body).to.have.property("profiles").that.is.an("array");
        });
    });

    describe("GET /api/profiles", () => {
        it("should return the profiles for the demo user", async () => {
            const res = await chai.request(app).get("/api/profiles?username=demo");
            expect(res.status).to.equal(200);
            expect(res.body).to.be.an("array");
        });
    });

    describe("POST /api/profiles", () => {
        let originalProfiles;

        before(async () => {
            originalProfiles = await setupCleanProfiles();
        });

        after(async () => {
            await restoreProfiles(originalProfiles);
        });

        const newProfile = {
            name: "JavaScript Advisor",
            icon: "fab fa-js-square",
            displayName: "JavaScript Advisor",
            prompt: "假如你是一个有经验的全栈JavaScript程序员, 你会根据我的需求提供代码实现和解释",
            tts: "disabled",
            sortedIndex: "1",
        };

        it("should create a new profile for the demo user", async () => {
            const res = await chai
                .request(app)
                .post("/api/profiles?username=demo")
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

        it("should update the profile for the demo user", async () => {
            const res = await chai
                .request(app)
                .put("/api/profiles/JavaScript%20Advisor?username=demo")
                .send(updatedProfile);
            expect(res.status).to.equal(200);
            expect(res.body).to.deep.equal(updatedProfile);
        });
    });

    describe("DELETE /api/profiles/:name", () => {
        it("should delete the profile for the demo user", async () => {
            const res = await chai
                .request(app)
                .delete("/api/profiles/JavaScript%20Advisor?username=demo");
            expect(res.status).to.equal(200);
            expect(res.body[0]).to.include({
                name: "JavaScript Advisor",
                icon: "fab fa-js-square",
                displayName: "Updated JavaScript Advisor",
                prompt: "更新后的提示",
                tts: "enabled",
                sortedIndex: "1",
            });
        });
    });
});
