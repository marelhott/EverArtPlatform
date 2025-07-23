// Test script for comprehensive synchronization with user's real data
const testData = {
  // Simulujeme data z apply_model_state localStorage
  localStorageData: [
    {
      id: "apply-model-instance-1",
      outputImageUrl: "https://httpbin.org/image/webp",
      inputImageUrl: "https://httpbin.org/image/png", 
      modelId: "297536343603560448",
      createdAt: new Date().toISOString()
    },
    {
      id: "apply-model-instance-2", 
      outputImageUrl: "https://httpbin.org/image/svg",
      inputImageUrl: "https://httpbin.org/image/jpeg",
      modelId: "176553303902130176",
      createdAt: new Date().toISOString()
    },
    {
      id: "localStorage-gen-1",
      outputImageUrl: "https://httpbin.org/image/webp?v=2",
      modelId: "128319645513027584",
      createdAt: new Date().toISOString()
    }
  ]
};

console.log("=== TEST KOMPLETNÍ SYNCHRONIZACE ===");
console.log(`Testujeme s ${testData.localStorageData.length} simulovanými generacemi`);

fetch('http://localhost:5000/api/generations/sync-cloudinary', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(testData)
})
.then(response => response.json())
.then(data => {
  console.log("=== VÝSLEDEK SYNCHRONIZACE ===");
  console.log(`Synchronizováno: ${data.synced}`);
  console.log(`Chyby: ${data.errors}`);
  console.log(`Celkem zpracováno: ${data.totalProcessed}`);
  console.log("Detail:", data.message);
  
  if (data.detailedLog && data.detailedLog.length > 0) {
    console.log("\n=== DETAILNÍ LOG ===");
    data.detailedLog.forEach(log => console.log(log));
  }
})
.catch(error => {
  console.error("Chyba při synchronizaci:", error);
});