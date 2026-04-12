/**
 * Test script for bangumi provider - tests empty sid validation
 * Run with: node worker/test/bangumi.test.js
 */

import {gen_bangumi} from "../src/api/providers/bangumi.js";

// Mock environment
const mockEnv = {
    ENABLED_CACHE: "true",
    TMDB_API_KEY: "test_key"
};

// Test cases for empty/invalid sid
const testCases = [
    {
        name: "sid is null",
        sid: null,
        description: "Should return error when sid is null"
    },
    {
        name: "sid is undefined",
        sid: undefined,
        description: "Should return error when sid is undefined"
    },
    {
        name: "sid is empty string",
        sid: "",
        description: "Should return error when sid is empty string"
    },
    {
        name: "sid is whitespace only",
        sid: "   ",
        description: "Should return error when sid contains only whitespace"
    },
    {
        name: "sid is 0",
        sid: 0,
        description: "Should return error when sid is 0 (falsy value)"
    }
];

/**
 * Run a single test case
 * @param {Object} testCase - Test case configuration
 * @returns {Promise<boolean>} True if test passed, false otherwise
 */
async function runTest(testCase) {
    console.log(`\n🧪 Running test: ${testCase.name}`);
    console.log(`   Description: ${testCase.description}`);
    console.log(`   Input sid: ${JSON.stringify(testCase.sid)}`);

    try {
        const result = await gen_bangumi(testCase.sid, mockEnv);

        // Check if result has error structure
        if (result.success === false && result.error) {
            console.log(`✅ Test PASSED`);
            console.log(`   Error message: "${result.error}"`);
            console.log(`   Site: ${result.site}`);
            console.log(`   SID: ${result.sid}`);
            return true;
        } else {
            console.log(`❌ Test FAILED`);
            console.log(`   Expected error but got success or missing error field`);
            console.log(`   Result:`, JSON.stringify(result, null, 2));
            return false;
        }
    } catch (error) {
        console.log(`❌ Test FAILED - Unexpected exception`);
        console.log(`   Error: ${error.message}`);
        console.log(`   Stack:`, error.stack);
        return false;
    }
}

/**
 * Main test runner
 */
async function main() {
    console.log("=".repeat(60));
    console.log("Bangumi Provider - Empty SID Validation Tests");
    console.log("=".repeat(60));

    const results = [];

    for (const testCase of testCases) {
        const passed = await runTest(testCase);
        results.push({name: testCase.name, passed});
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("Test Summary");
    console.log("=".repeat(60));

    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;

    results.forEach(result => {
        const status = result.passed ? "✅ PASS" : "❌ FAIL";
        console.log(`${status} - ${result.name}`);
    });

    console.log("-".repeat(60));
    console.log(`Total: ${totalCount} | Passed: ${passedCount} | Failed: ${totalCount - passedCount}`);
    console.log("=".repeat(60));

    if (passedCount === totalCount) {
        console.log("\n🎉 All tests passed!");
        process.exit(0);
    } else {
        console.log("\n⚠️  Some tests failed!");
        process.exit(1);
    }
}

// Run tests
main().catch(error => {
    console.error("💥 Fatal error during test execution:", error);
    process.exit(1);
});
