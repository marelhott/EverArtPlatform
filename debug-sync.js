// Debug script to test synchronization with real localStorage data
const testLocalStorageData = [
  {
    id: "real-test-" + Date.now(),
    outputImageUrl: "https://picsum.photos/512/512?random=1",
    inputImageUrl: "https://picsum.photos/400/400?random=2", 
    modelId: "227357196059557888",
    createdAt: new Date().toISOString()
  },
  {
    id: "real-test2-" + Date.now(),
    outputImageUrl: "https://picsum.photos/512/512?random=3",
    inputImageUrl: "https://picsum.photos/400/400?random=4",
    modelId: "176553303902130176", 
    createdAt: new Date().toISOString()
  }
];

console.log("Test data for sync with publicly accessible URLs:");
console.log(JSON.stringify(testLocalStorageData, null, 2));