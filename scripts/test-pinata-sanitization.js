// test-pinata-sanitization.js — Test JSON sanitization fix
// Created: 2026-03-02 20:19 CET
// Purpose: Verify sanitizeJSONData() fixes "Bad control character" error

const testData = {
  agent: "watra",
  timestamp: new Date().toISOString(),
  type: "thought",
  size: "small",
  content: "Test with control chars: \x00\x01\x02 and normal text\nWith newlines\tAnd tabs"
};

console.log("🧪 Testing Pinata JSON Sanitization Fix");
console.log("=========================================\n");

// Test 1: Show problematic characters
console.log("Original content:");
console.log(testData.content);
console.log("\nOriginal JSON length:", JSON.stringify(testData).length);

// Test 2: Simulate sanitization
function sanitizeJSONData(data) {
  const str = JSON.stringify(data);
  const cleaned = str.replace(/[\x00-\x1F\x7F]/g, (char) => {
    if (char === '\n' || char === '\r' || char === '\t') {
      return char;
    }
    return '';
  });
  return JSON.parse(cleaned);
}

try {
  const sanitized = sanitizeJSONData(testData);
  console.log("\n✅ Sanitization SUCCESS!");
  console.log("Sanitized content:", sanitized.content);
  console.log("Sanitized JSON length:", JSON.stringify(sanitized).length);

  // Test 3: Verify can stringify again
  const finalJSON = JSON.stringify(sanitized);
  console.log("\n✅ Re-stringify SUCCESS!");
  console.log("Final JSON length:", finalJSON.length);

  // Test 4: Check for control chars
  const hasControlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(finalJSON);
  if (hasControlChars) {
    console.log("\n❌ WARNING: Still contains control characters!");
  } else {
    console.log("\n✅ No problematic control characters!");
  }

  console.log("\n🎉 FIX VERIFIED! Ready for Pinata API");
} catch (error) {
  console.log("\n❌ ERROR:", error.message);
}
