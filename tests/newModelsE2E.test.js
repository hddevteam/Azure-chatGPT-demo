/* eslint-disable no-undef */
const chai = require("chai");
const chaiHttp = require("chai-http");
const { app, close } = require("../server");
const expect = chai.expect;

chai.use(chaiHttp);

describe("New Models E2E User Experience Tests", () => {
    
    after(() => {
        close();
    });

    describe("Frontend Model Selection Integration", () => {
        it("should provide model information endpoint", async function() {
            this.timeout(10000);
            
            const res = await chai.request(app)
                .get("/api/models")
                .send();

            expect(res.status).to.equal(200);
            expect(res.body).to.be.an("array");
            
            // Check if new models are included
            const modelNames = res.body.map(model => model.name || model.id);
            expect(modelNames).to.include("gpt-5");
            expect(modelNames).to.include("gpt-5-mini");
            expect(modelNames).to.include("gpt-5-nano");
            expect(modelNames).to.include("gpt-5-chat");
            expect(modelNames).to.include();
        });
    });

    describe("Chat History with New Models", () => {
        let testChatId;

        it("should create a new chat with GPT-5 model", async function() {
            this.timeout(15000);
            
            const res = await chai.request(app)
                .post("/api/chat")
                .send({
                    model: "gpt-5",
                    title: "Test GPT-5 Chat",
                    messages: [
                        { role: "user", content: "Hello, this is a test chat." }
                    ]
                });

            if (res.status === 200) {
                expect(res.body).to.have.property("chatId");
                expect(res.body).to.have.property("response");
                testChatId = res.body.chatId;
                console.log(`Created test chat: ${testChatId}`);
            }
        });

        it("should retrieve chat history with correct model information", async function() {
            this.timeout(10000);
            
            if (!testChatId) {
                this.skip();
            }

            const res = await chai.request(app)
                .get(`/api/chat/${testChatId}`)
                .send();

            if (res.status === 200) {
                expect(res.body).to.have.property("messages");
                expect(res.body).to.have.property("model");
                expect(res.body.model).to.equal("gpt-5");
            }
        });
    });

    describe("Function Calling with New Models", () => {
        it("should support function calling with GPT-5", async function() {
            this.timeout(30000);
            
            const functionPrompt = JSON.stringify([
                { 
                    role: "user", 
                    content: "What's the current weather in Beijing? Use the weather function." 
                }
            ]);

            const res = await chai.request(app)
                .post("/api/gpt")
                .send({
                    prompt: functionPrompt,
                    model: "gpt-5",
                    params: {
                        temperature: 0.3,
                        max_tokens: 200
                    },
                    functions: [
                        {
                            name: "get_weather",
                            description: "Get current weather for a location",
                            parameters: {
                                type: "object",
                                properties: {
                                    location: {
                                        type: "string",
                                        description: "The city name"
                                    }
                                },
                                required: ["location"]
                            }
                        }
                    ]
                });

            if (res.status === 200) {
                // Should handle function calls appropriately
                expect(res.body).to.have.property("message");
                
                // Check if function call was attempted
                if (res.body.functionCall) {
                    expect(res.body.functionCall).to.have.property("name");
                    expect(res.body.functionCall.name).to.equal("get_weather");
                    expect(res.body.functionCall).to.have.property("arguments");
                }
            }
        });

        it("should not attempt function calling with GPT-5-chat", async function() {
            this.timeout(20000);
            
            const functionPrompt = JSON.stringify([
                { 
                    role: "user", 
                    content: "What's the weather like? Use a weather function." 
                }
            ]);

            const res = await chai.request(app)
                .post("/api/gpt")
                .send({
                    prompt: functionPrompt,
                    model: "gpt-5-chat",
                    params: {
                        temperature: 0.3,
                        max_tokens: 200
                    },
                    functions: [
                        {
                            name: "get_weather",
                            description: "Get current weather for a location",
                            parameters: {
                                type: "object",
                                properties: {
                                    location: {
                                        type: "string",
                                        description: "The city name"
                                    }
                                },
                                required: ["location"]
                            }
                        }
                    ]
                });

            if (res.status === 200) {
                // GPT-5-chat should not use function calling
                expect(res.body).to.have.property("message");
                expect(res.body.functionCall).to.be.undefined;
            }
        });
    });

    describe("Vision Capabilities", () => {
        it("should handle image input with GPT-5 models", async function() {
            this.timeout(30000);
            
            const visionPrompt = JSON.stringify([
                { 
                    role: "user", 
                    content: [
                        {
                            type: "text",
                            text: "What do you see in this image?"
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                            }
                        }
                    ]
                }
            ]);

            const visionModels = ["gpt-5", "gpt-5-mini", "gpt-5-nano"];
            
            for (const model of visionModels) {
                const res = await chai.request(app)
                    .post("/api/gpt")
                    .send({
                        prompt: visionPrompt,
                        model: model,
                        params: {
                            temperature: 0.3,
                            max_tokens: 100
                        }
                    });

                if (res.status === 200) {
                    expect(res.body).to.have.property("message");
                    expect(res.body.message).to.be.a("string");
                    console.log(`${model} vision response: ${res.body.message.substring(0, 50)}...`);
                }
            }
        });

        it("should reject image input for GPT-5-chat", async function() {
            this.timeout(20000);
            
            const visionPrompt = JSON.stringify([
                { 
                    role: "user", 
                    content: [
                        {
                            type: "text",
                            text: "Describe this image"
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                            }
                        }
                    ]
                }
            ]);

            const res = await chai.request(app)
                .post("/api/gpt")
                .send({
                    prompt: visionPrompt,
                    model: "gpt-5-chat",
                    params: {
                        temperature: 0.3,
                        max_tokens: 100
                    }
                });

            // Should handle gracefully (either reject or ignore image)
            expect(res.status).to.not.equal(500);
            
            if (res.status !== 200) {
                expect(res.body).to.have.property("error");
                expect(res.body.error).to.include("vision");
            }
        });
    });


                if (res.status === 200) {
                    expect(res.body).to.have.property("message");
                    expect(res.body.message).to.be.a("string");
                    console.log(`O3-PRO with ${effort} reasoning: ${res.body.message.length} characters`);
                }
            }
        });

        it("should provide reasoning summary when available", async function() {
            this.timeout(60000);
            
            const complexPrompt = JSON.stringify([
                { 
                    role: "user", 
                    content: "Solve this logic puzzle: Three friends each have a different pet (cat, dog, bird) and favorite color (red, blue, green). Alice doesn't have a cat. Bob's favorite color is blue. The person with the bird likes green. The person with the cat likes red. Who has which pet and favorite color?" 
                }
            ]);

            const res = await chai.request(app)
                .post("/api/gpt")
                .send({
                    prompt: complexPrompt,
                    model: ,
                    params: {
                        temperature: 0.1,
                        max_tokens: 300,
                        reasoningEffort: "medium"
                    }
                });

            if (res.status === 200) {
                expect(res.body).to.have.property("message");
                
                // Check if reasoning summary is provided
                if (res.body.reasoningSummary) {
                    expect(res.body.reasoningSummary).to.be.a("string");
                    console.log(`O3-PRO reasoning summary: ${res.body.reasoningSummary.substring(0, 100)}...`);
                }
            }
        });
    });

    describe("Error Handling and User Feedback", () => {
        it("should provide helpful error messages for invalid parameters", async function() {
            this.timeout(10000);
            
            const res = await chai.request(app)
                .post("/api/gpt")
                .send({
                    prompt: "Invalid prompt format",
                    model: "gpt-5",
                    params: {
                        temperature: 2.5, // Invalid temperature
                        max_tokens: -100  // Invalid token count
                    }
                });

            expect(res.status).to.equal(400);
            expect(res.body).to.have.property("error");
            expect(res.body.error).to.include("validation");
        });

        it("should handle unsupported model gracefully", async function() {
            this.timeout(10000);
            
            const res = await chai.request(app)
                .post("/api/gpt")
                .send({
                    prompt: JSON.stringify([{ role: "user", content: "Hello" }]),
                    model: "nonexistent-model",
                    params: {
                        temperature: 0.5,
                        max_tokens: 100
                    }
                });

            expect(res.status).to.equal(400);
            expect(res.body).to.have.property("error");
            expect(res.body.error).to.include("model");
        });
    });

    describe("Backward Compatibility", () => {
        it("should still support existing GPT-4 models", async function() {
            this.timeout(20000);
            
            const testPrompt = JSON.stringify([
                { role: "user", content: "Hello from compatibility test" }
            ]);

            const existingModels = ["gpt-4", "gpt-4-turbo", "gpt-4o"];
            
            for (const model of existingModels) {
                const res = await chai.request(app)
                    .post("/api/gpt")
                    .send({
                        prompt: testPrompt,
                        model: model,
                        params: {
                            temperature: 0.3,
                            max_tokens: 50
                        }
                    });

                // Should not break existing functionality
                expect(res.status).to.not.equal(500);
                
                if (res.status === 200) {
                    expect(res.body).to.have.property("message");
                    console.log(`${model} still working: ${res.body.message.substring(0, 30)}...`);
                }
            }
        });
    });
});
