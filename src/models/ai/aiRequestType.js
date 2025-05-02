"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIRequestType = void 0;
var AIRequestType;
(function (AIRequestType) {
    AIRequestType["Chat"] = "chat";
    AIRequestType["CodeCompletion"] = "code_completion";
    AIRequestType["CodeGeneration"] = "code_generation";
    AIRequestType["CodeExplanation"] = "code_explanation";
    AIRequestType["CodeReview"] = "code_review";
    AIRequestType["Refactoring"] = "refactoring";
    AIRequestType["BugFix"] = "bug_fix";
    AIRequestType["TestGeneration"] = "test_generation";
    AIRequestType["Documentation"] = "documentation";
    AIRequestType["Search"] = "search";
})(AIRequestType || (exports.AIRequestType = AIRequestType = {}));
