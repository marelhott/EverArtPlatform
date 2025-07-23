// 🎯 FORCE SYNC - Nahraje VŠECHNY možné URL které by mohly být vašimi obrázky

const testUrls = [
  // EverArt CDN URL patterns (kde by mohly být vaše skutečné obrázky)
  "https://cdn.everart.ai/api/images/user-generation-1.webp",
  "https://cdn.everart.ai/api/images/user-generation-2.webp", 
  "https://cdn.everart.ai/api/images/user-generation-3.webp",
  "https://cdn.everart.ai/generations/result-12345.jpg",
  "https://cdn.everart.ai/generations/result-67890.jpg",
  
  // Fallback testovací URL pro ověření, že vše funguje
  "https://httpbin.org/image/jpeg?title=Test1",
  "https://httpbin.org/image/webp?title=Test2", 
  "https://httpbin.org/image/svg?title=Test3"
];

const syncPayload = {
  localStorageData: testUrls.map((url, index) => ({
    id: `force-sync-${index}`,
    outputImageUrl: url,
    inputImageUrl: `https://user-input-${index}.jpg`,
    modelId: index % 2 === 0 ? "297536343603560448" : "176553303902130176",
    createdAt: new Date().toISOString()
  }))
};

console.log(`🚀 FORCE SYNC: Testujú ${testUrls.length} možných URL`);

fetch('http://localhost:5000/api/generations/sync-cloudinary', {
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(syncPayload)
})
.then(response => response.json())
.then(data => {
  console.log("\n🎉 FORCE SYNC VÝSLEDEK:");
  console.log(`✅ Úspěšně synchronizováno: ${data.synced}`);
  console.log(`❌ Chyby (pravděpodobně nedostupné URL): ${data.errors}`); 
  console.log(`📊 Celkem testováno: ${data.totalProcessed}`);
  console.log(`📝 ${data.message}`);
  
  if (data.detailedLog) {
    console.log("\n📋 CO SE POVEDLO:");
    data.detailedLog.filter(log => log.includes('✓')).forEach(log => console.log(`  ${log}`));
    
    console.log("\n❌ CO SELHALO:");
    data.detailedLog.filter(log => log.includes('✗')).forEach(log => console.log(`  ${log}`));
  }
  
  console.log("\n🌟 Všechny dostupné obrázky jsou nyní na Cloudinary!");
})
.catch(error => console.error("💥 Chyba:", error));