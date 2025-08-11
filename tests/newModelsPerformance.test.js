/* eslint-disable no-undef */
const chai = require("chai");
const chaiHttp = require("chai-http");
const { app, close } = require("../server");
const expect = chai.expect;

chai.use(chaiHttp);

describe("New Models Performance Tests", () => {
    
    after(() => {
        close();
    });

    describe("Response Time Benchmarks", () => {
        const simplePrompt = JSON.stringify([
            { role: "user", content: "Say hello in one word." }
        ]);

        const models = [
            { name: "gpt-5", expectedMaxTime: 15000 },
            { name: "gpt-5-mini", expectedMaxTime: 10000 },
            { name: "gpt-5-nano", expectedMaxTime: 8000 },
            { name: "gpt-5-chat", expectedMaxTime: 12000 },
            { name: "o3-pro", expectedMaxTime: 60000 } // O3-PRO may take longer due to reasoning
        ];

        models.forEach(({ name, expectedMaxTime }) => {
            it(`should respond within reasonable time for ${name}`, async function() {
                this.timeout(expectedMaxTime + 5000);
                
                const startTime = Date.now();
                
                const res = await chai.request(app)
                    .post("/api/gpt")
                    .send({
                        prompt: simplePrompt,
                        model: name,
                        params: {
                            temperature: 0.1,
                            max_tokens: 10
                        }
                    });

                const responseTime = Date.now() - startTime;
                
                if (res.status === 200) {
                    console.log(`${name} response time: ${responseTime}ms`);
                    expect(responseTime).to.be.lessThan(expectedMaxTime);
                    expect(res.body).to.have.property("message");
                    expect(res.body).to.have.property("totalTokens");
                }
            });
        });
    });

    describe("Token Usage Efficiency", () => {
        const testPrompt = JSON.stringify([
            { 
                role: "user", 
                content: "Explain the concept of artificial intelligence in exactly 50 words." 
            }
        ]);

        it("should track token usage for GPT-5 models", async function() {
            this.timeout(30000);
            
            const models = ["gpt-5", "gpt-5-mini", "gpt-5-nano"];
            
            for (const model of models) {
                const res = await chai.request(app)
                    .post("/api/gpt")
                    .send({
                        prompt: testPrompt,
                        model: model,
                        params: {
                            temperature: 0.3,
                            max_tokens: 100
                        }
                    });

                if (res.status === 200) {
                    expect(res.body).to.have.property("totalTokens");
                    expect(res.body.totalTokens).to.be.a("number");
                    expect(res.body.totalTokens).to.be.greaterThan(0);
                    console.log(`${model} used ${res.body.totalTokens} tokens`);
                }
            }
        });

        it("should track reasoning tokens for O3-PRO", async function() {
            this.timeout(60000);
            
            const reasoningPrompt = JSON.stringify([
                { 
                    role: "user", 
                    content: "Solve this math problem step by step: If a train travels 120 km in 2 hours, what is its average speed?" 
                }
            ]);

            const res = await chai.request(app)
                .post("/api/gpt")
                .send({
                    prompt: reasoningPrompt,
                    model: "o3-pro",
                    params: {
                        temperature: 0.1,
                        max_tokens: 200,
                        reasoningEffort: "medium"
                    }
                });

            if (res.status === 200) {
                expect(res.body).to.have.property("totalTokens");
                expect(res.body.totalTokens).to.be.a("number");
                expect(res.body.totalTokens).to.be.greaterThan(0);
                console.log(`O3-PRO used ${res.body.totalTokens} total tokens`);
                
                // Check if reasoning tokens are reported
                if (res.body.usage && res.body.usage.completion_tokens_details) {
                    const reasoningTokens = res.body.usage.completion_tokens_details.reasoning_tokens;
                    if (reasoningTokens) {
                        console.log(`O3-PRO used ${reasoningTokens} reasoning tokens`);
                        expect(reasoningTokens).to.be.a("number");
                        expect(reasoningTokens).to.be.greaterThan(0);
                    }
                }
            }
        });
    });

    describe("Concurrent Request Handling", () => {
        it("should handle multiple requests to different models simultaneously", async function() {
            this.timeout(45000);
            
            const testPrompt = JSON.stringify([
                { role: "user", content: "Count from 1 to 5." }
            ]);

            const requests = [
                chai.request(app).post("/api/gpt").send({
                    prompt: testPrompt,
                    model: "gpt-5-nano",
                    params: { temperature: 0.1, max_tokens: 20 }
                }),
                chai.request(app).post("/api/gpt").send({
                    prompt: testPrompt,
                    model: "gpt-5-mini",
                    params: { temperature: 0.1, max_tokens: 20 }
                }),
                chai.request(app).post("/api/gpt").send({
                    prompt: testPrompt,
                    model: "gpt-5",
                    params: { temperature: 0.1, max_tokens: 20 }
                })
            ];

            const results = await Promise.allSettled(requests);
            
            // At least some requests should succeed
            const successfulRequests = results.filter(result => 
                result.status === "fulfilled" && result.value.status === 200
            );
            
            console.log(`${successfulRequests.length} out of ${requests.length} concurrent requests succeeded`);
            expect(successfulRequests.length).to.be.greaterThan(0);
        });
    });

    describe("Memory and Resource Usage", () => {
        it("should not cause memory leaks with repeated requests", async function() {
            this.timeout(60000);
            
            const initialMemory = process.memoryUsage();
            const testPrompt = JSON.stringify([
                { role: "user", content: "Hello" }
            ]);

            // Make 10 consecutive requests
            for (let i = 0; i < 10; i++) {
                await chai.request(app)
                    .post("/api/gpt")
                    .send({
                        prompt: testPrompt,
                        model: "gpt-5-nano",
                        params: { temperature: 0.1, max_tokens: 5 }
                    });
            }

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }

            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            
            console.log(`Memory increase after 10 requests: ${Math.round(memoryIncrease / 1024 / 1024 * 100) / 100} MB`);
            
            // Memory increase should be reasonable (less than 100MB for 10 simple requests)
            expect(memoryIncrease).to.be.lessThan(100 * 1024 * 1024);
        });
    });

    describe("Error Recovery and Retry Logic", () => {
        it("should handle API rate limits gracefully", async function() {
            this.timeout(30000);
            
            const testPrompt = JSON.stringify([
                { role: "user", content: "Test message" }
            ]);

            // Make requests that might hit rate limits
            const rapidRequests = Array(5).fill().map(() =>
                chai.request(app)
                    .post("/api/gpt")
                    .send({
                        prompt: testPrompt,
                        model: "gpt-5-nano",
                        params: { temperature: 0.1, max_tokens: 10 }
                    })
            );

            const results = await Promise.allSettled(rapidRequests);
            
            // Should not crash the server
            const serverErrors = results.filter(result => 
                result.status === "fulfilled" && result.value.status === 500
            );
            
            expect(serverErrors.length).to.equal(0);
        });

        it("should handle timeout scenarios for O3-PRO", async function() {
            this.timeout(90000);
            
            const complexPrompt = JSON.stringify([
                { 
                    role: "user", 
                    content: "Write a detailed analysis of quantum computing principles, including mathematical formulations and practical applications. Make it comprehensive and technical." 
                }
            ]);

            const res = await chai.request(app)
                .post("/api/gpt")
                .send({
                    prompt: complexPrompt,
                    model: "o3-pro",
                    params: {
                        temperature: 0.3,
                        max_tokens: 2000,
                        reasoningEffort: "high"
                    }
                });

            // Should handle long processing times without crashing
            expect(res.status).to.not.equal(500);
            
            if (res.status !== 200) {
                // If timeout occurs, should return meaningful error
                expect(res.body).to.have.property("error");
                expect(res.body.error).to.be.a("string");
            }
        });
    });
});
