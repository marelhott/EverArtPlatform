// Test script for creating localStorage data and testing sync
const testData = [
  {
    id: "test-1-" + Date.now(),
    outputImageUrl: "https://cdn.everart.ai/dc69b4dc-7a54-49d1-925f-f00e19b6e9bc.webp",
    inputImageUrl: "https://example.com/input1.jpg",
    modelId: "227357196059557888",
    createdAt: new Date().toISOString()
  },
  {
    id: "test-2-" + Date.now(),
    outputImageUrl: "https://cdn.everart.ai/f5a7b8cd-9e12-41f2-876d-c123456789ab.webp", 
    inputImageUrl: "https://example.com/input2.jpg",
    modelId: "227357196059557888",
    createdAt: new Date().toISOString()
  }
];

// This would be run in browser console to create test data
console.log('localStorage.setItem("everart_generations", JSON.stringify(' + JSON.stringify(testData) + '));');
console.log('Test data created for sync testing');