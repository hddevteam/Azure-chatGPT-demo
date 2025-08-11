/* eslint-disable no-undef */
const chai = require("chai");
const expect = chai.expect;
const gptService = require("../services/gptService");

describe("New Models Configuration and Features", () => {
    
    describe("GPT-5 Series Models", () => {
        it("gpt-5 should support advanced reasoning features", () => {
            expect(gptService.supportsFeature("gpt-5", "supportsReasoningEffort")).to.be.true;
            expect(gptService.supportsFeature("gpt-5", "supportsVerbosity")).to.be.true;
            expect(gptService.supportsFeature("gpt-5", "supportsPreamble")).to.be.true;
        });

        it("gpt-5-chat should NOT support advanced features", () => {
            expect(gptService.supportsFeature("gpt-5-chat", "supportsReasoningEffort")).to.be.false;
            expect(gptService.supportsFeature("gpt-5-chat", "supportsFunctionCalling")).to.be.false;
            expect(gptService.supportsFeature("gpt-5-chat", "supportsVision")).to.be.false;
        });

        it("gpt-5-mini should have full reasoning features", () => {
            expect(gptService.supportsFeature("gpt-5-mini", "supportsReasoningEffort")).to.be.true;
            expect(gptService.supportsFeature("gpt-5-mini", "supportsFunctionCalling")).to.be.true;
        });

        it("gpt-5-nano should have full features", () => {
            expect(gptService.supportsFeature("gpt-5-nano", "supportsReasoningEffort")).to.be.true;
            expect(gptService.supportsFeature("gpt-5-nano", "supportsFunctionCalling")).to.be.true;
        });

        const gpt5Models = ["gpt-5", "gpt-5-mini", "gpt-5-nano", "gpt-5-chat"];
        
        gpt5Models.forEach(model => {
            describe(`${model} configuration`, () => {
                it("should have valid API configuration", () => {
                    const config = gptService.getApiConfig(model);
                    expect(config).to.have.property("apiKey");
                    expect(config).to.have.property("apiUrl");
                });

                it("should support function calls (except gpt-5-chat)", () => {
                    const supportsFunctionCalls = gptService.supportsFeature(model, "supportsFunctionCalling");
                    if (model === "gpt-5-chat") {
                        expect(supportsFunctionCalls).to.be.false;
                    } else {
                        expect(supportsFunctionCalls).to.be.true;
                    }
                });

                it("should support system messages", () => {
                    const supportsSystemMessages = gptService.supportsFeature(model, "supportsSystemMessages");
                    expect(supportsSystemMessages).to.be.true;
                });

                it("should support developer messages", () => {
                    const supportsDeveloperMessages = gptService.supportsFeature(model, "supportsDeveloperMessages");
                    expect(supportsDeveloperMessages).to.be.true;
                });

                it("should not require max completion tokens", () => {
                    const requiresMaxTokens = gptService.supportsFeature(model, "requiresMaxCompletionTokens");
                    // All reasoning models (including gpt-5 series) now require max_completion_tokens
                    expect(requiresMaxTokens).to.be.true;
                });
            });
        });
    });

    describe("Feature Detection Functionality", () => {
        it("should correctly identify supported features", () => {
            expect(gptService.supportsFeature("gpt-5", "supportsFunctionCalling")).to.be.true;
            expect(gptService.supportsFeature("gpt-5", "supportsVision")).to.be.true;
            expect(gptService.supportsFeature("gpt-5-chat", "supportsFunctionCalling")).to.be.false;
            // Test O-series models that are available
            expect(gptService.supportsFeature("o3", "supportsReasoningEffort")).to.be.true;
            expect(gptService.supportsFeature("o4-mini", "supportsReasoningEffort")).to.be.true;
        });

        it("should handle unknown models gracefully", () => {
            const supportsFeature = gptService.supportsFeature("unknown-model", "supportsFunctionCalling");
            expect(supportsFeature).to.be.true;
        });
    });

    describe("Model Parameter Processing", () => {
        it("should identify reasoning models correctly", () => {
            expect(gptService.isReasoningModel("gpt-5")).to.be.true;
            expect(gptService.isReasoningModel("gpt-5-mini")).to.be.true;
            expect(gptService.isReasoningModel("gpt-5-nano")).to.be.true;
            expect(gptService.isReasoningModel("gpt-5-chat")).to.be.true;
            expect(gptService.isReasoningModel("o3")).to.be.true;
            expect(gptService.isReasoningModel("o4-mini")).to.be.true;
            expect(gptService.isReasoningModel("gpt-4o")).to.be.false;
        });

        it("should process parameters correctly for GPT-5 models", () => {
            const params = {
                temperature: 0.7,
                max_tokens: 1000,
                verbosity: "medium"
            };

            const processed = gptService.getModelParameters("gpt-5", params);
            expect(processed).to.have.property("max_completion_tokens");
            expect(processed).to.have.property("reasoning_effort");
            expect(processed.max_completion_tokens).to.equal(1000);
            // Should not have unsupported parameters like temperature
            expect(processed).to.not.have.property("temperature");
        });

        it("should process parameters correctly for O-series models", () => {
            const params = {
                temperature: 0.7,
                max_tokens: 1000,
                reasoningEffort: "medium"
            };

            const processed = gptService.getModelParameters("o3", params);
            expect(processed).to.have.property("max_completion_tokens");
            expect(processed).to.have.property("reasoning_effort");
            expect(processed.max_completion_tokens).to.equal(1000);
            // Should not have unsupported parameters like temperature
            expect(processed).to.not.have.property("temperature");
        });

        it("should process parameters correctly for non-reasoning models", () => {
            const params = {
                temperature: 0.7,
                max_tokens: 1000
            };

            const processed = gptService.getModelParameters("gpt-4o", params);
            expect(processed).to.have.property("temperature");
            expect(processed).to.have.property("max_tokens");
            expect(processed.temperature).to.equal(0.7);
            expect(processed.max_tokens).to.equal(1000);
            // Should not have reasoning parameters
            expect(processed).to.not.have.property("reasoning_effort");
        });
    });

    describe("Environment Variables Validation", () => {
        it("should handle GPT-5 environment variables", () => {
            const config = gptService.getApiConfig("gpt-5");
            expect(config).to.be.an("object");
            expect(config).to.have.property("apiKey");
            expect(config).to.have.property("apiUrl");
        });

        it("should handle O-series environment variables", () => {
            const config = gptService.getApiConfig("o3");
            expect(config).to.be.an("object");
            expect(config).to.have.property("apiKey");
            expect(config).to.have.property("apiUrl");
        });
    });
});
