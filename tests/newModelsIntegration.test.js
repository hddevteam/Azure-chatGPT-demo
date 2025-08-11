/* eslint-disable no-undef */
const chai = require("chai");
const chaiHttp = require("chai-http");
const { app, close } = require("../server");
const expect = chai.expect;

chai.use(chaiHttp);

describe("New Models Integration Tests", () => {
    
    after(() => {
        close();
    });

    describe("GPT API Endpoint with New Models", () => {
        const testPrompt = JSON.stringify([
            { role: "user", content: "Hello, please respond with a simple greeting." }
        ]);

        const newModels = [
            "gpt-5",
            "gpt-5-mini", 
            "gpt-5-nano",
            "gpt-5-chat",
            
        ];

        newModels.forEach(model => {
            it(`should handle requests for ${model} model`, async function() {
                this.timeout(30000); // Increase timeout for API calls
                
                const res = await chai.request(app)
                    .post("/api/gpt")
                    .send({
                        prompt: testPrompt,
                        model: model,
                        params: {
                            temperature: 0.1,
                            max_tokens: 50,
                            webSearchEnabled: false
                        }
                    });

                // Should not return 500 error for unsupported model
                expect(res.status).to.not.equal(500);
                
                if (res.status === 200) {
                    expect(res.body).to.have.property("message");
                    expect(res.body.message).to.be.a("string");
                    expect(res.body).to.have.property("totalTokens");
                } else {
                    // If not 200, should be a meaningful error (like 401 for missing API key)
                    expect(res.status).to.be.oneOf([400, 401, 403, 429]);
                }
            });
        });

        it("should handle function calling for GPT-5 models", async function() {
            this.timeout(30000);
            
            const functionCallPrompt = JSON.stringify([
                { 
                    role: "user", 
                    content: "What time is it now? Please use the current time function." 
                }
            ]);

            const res = await chai.request(app)
                .post("/api/gpt")
                .send({
                    prompt: functionCallPrompt,
                    model: "gpt-5",
                    params: {
                        temperature: 0.1,
                        max_tokens: 100,
                        webSearchEnabled: true // Enable function calling
                    }
                });

            // Should handle function calling request without crashing
            expect(res.status).to.not.equal(500);
        });

        it("should handle reasoning parameters for O3-PRO", async function() {
            this.timeout(60000); // O3-PRO may take longer
            
            const reasoningPrompt = JSON.stringify([
                { 
                    role: "user", 
                    content: "Solve this step by step: What is 15 * 23 + 7?" 
                }
            ]);

            const res = await chai.request(app)
                .post("/api/gpt")
                .send({
                    prompt: reasoningPrompt,
                    model: ,
                    params: {
                        temperature: 0.1,
                        max_tokens: 200,
                        webSearchEnabled: false,
                        reasoningEffort: "medium",
                        reasoningSummary: "brief"
                    }
                });

            // Should handle reasoning parameters without crashing
            expect(res.status).to.not.equal(500);
        });
    });

    describe("Model Configuration Validation", () => {
        it("should validate GPT-5 API configuration", async () => {
            const models = ["gpt-5", "gpt-5-mini", "gpt-5-nano", "gpt-5-chat"];
            
            for (const model of models) {
                const res = await chai.request(app)
                    .post("/api/gpt")
                    .send({
                        prompt: JSON.stringify([{role: "user", content: "test"}]),
                        model: model,
                        params: { temperature: 0.1, max_tokens: 10 }
                    });

                // Should not return configuration error
                if (res.status !== 200) {
                    expect(res.body.error).to.not.include("not properly configured");
                    expect(res.body.error).to.not.include("Missing API");
                }
            }
        });

        it("should validate O3-PRO API configuration", async () => {
            const res = await chai.request(app)
                .post("/api/gpt")
                .send({
                    prompt: JSON.stringify([{role: "user", content: "test"}]),
                    model: ,
                    params: { temperature: 0.1, max_tokens: 10 }
                });

            // Should not return configuration error
            if (res.status !== 200) {
                expect(res.body.error).to.not.include("not properly configured");
                expect(res.body.error).to.not.include("Missing API");
            }
        });
    });

    describe("Model Feature Support", () => {
        it("should properly filter messages for O3-PRO", async function() {
            this.timeout(30000);
            
            // Test with developer messages which should be supported
            const promptWithDeveloperMessage = JSON.stringify([
                { role: "developer", content: "You are a helpful assistant." },
                { role: "user", content: "Hello" }
            ]);

            const res = await chai.request(app)
                .post("/api/gpt")
                .send({
                    prompt: promptWithDeveloperMessage,
                    model: ,
                    params: { temperature: 0.1, max_tokens: 20 }
                });

            // Should not reject developer messages
            expect(res.status).to.not.equal(400);
        });

        it("should handle system messages for GPT-5 models", async function() {
            this.timeout(30000);
            
            const promptWithSystemMessage = JSON.stringify([
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: "Hello" }
            ]);

            const res = await chai.request(app)
                .post("/api/gpt")
                .send({
                    prompt: promptWithSystemMessage,
                    model: "gpt-5",
                    params: { temperature: 0.1, max_tokens: 20 }
                });

            // Should support system messages
            expect(res.status).to.not.equal(400);
        });
    });

    describe("Error Handling for New Models", () => {
        it("should return meaningful errors for invalid parameters", async () => {
            const res = await chai.request(app)
                .post("/api/gpt")
                .send({
                    prompt: "invalid prompt format", // Should be JSON string
                    model: "gpt-5"
                });

            expect(res.status).to.equal(400);
            expect(res.body).to.have.property("error");
        });

        it("should handle missing model gracefully", async () => {
            const res = await chai.request(app)
                .post("/api/gpt")
                .send({
                    prompt: JSON.stringify([{role: "user", content: "test"}]),
                    model: "non-existent-model",
                    params: { temperature: 0.1, max_tokens: 10 }
                });

            // Should fallback to default model or return meaningful error
            expect(res.status).to.be.oneOf([200, 400]);
        });
    });
});
